import Show from "../models/Show.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import stripePackage from "stripe";
import { inngest } from "../inngest/index.js";
import redis from "../configs/redis.js";
import { getIO } from '../configs/socket.js';
import { publishToQueue } from '../configs/rabbitmq.js';
const stripe = new stripePackage(process.env.STRIPE_SECRET_KEY);

// ─── Cache Keys & TTLs ───────────────────────────────────────────────
const KEYS = {
  occupiedSeats: (showId)  => `seats:occupied:${showId}`,
  myBookings:    (userId)  => `bookings:user:${userId}`,
  seatLock:      (seatId, showId) => `lock:seat:${showId}:${seatId}`,
};

const TTL = {
  occupiedSeats: 60,        // 1 min — very volatile
  myBookings:    5 * 60,    // 5 min
  seatLock:      10,        // 10s hold per seat during booking
};

// ─── Distributed Seat Lock ──────────────────────────────────────────
// Locks each seat individually — atomic SET NX EX
const acquireSeatLocks = async (showId, seats, userId) => {
  const acquired = [];
  for (const seat of seats) {
    const key = KEYS.seatLock(seat, showId);
    const result = await redis.set(key, userId, "EX", TTL.seatLock, "NX");
    if (result === "OK") {
      acquired.push(seat);
    } else {
      // Failed — release all already-acquired locks
      await releaseSeatLocks(showId, acquired);
      return false;
    }
  }
  return true;
};

const releaseSeatLocks = async (showId, seats) => {
  if (!seats.length) return;
  const keys = seats.map((seat) => KEYS.seatLock(seat, showId));
  await redis.del(...keys);
};

// ─── Bust helpers ────────────────────────────────────────────────────
const bust = async (...keys) => {
  if (keys.length) await redis.del(...keys);
};

// ✅ Check seat availability — uses Redis cache
const checkSeatsAvailability = async (showId, selectedSeats) => {
  try {
    // Try Redis first
    const cached = await redis.get(KEYS.occupiedSeats(showId));
    const occupiedSeats = cached
      ? JSON.parse(cached)
      : await fetchAndCacheOccupiedSeats(showId);

    if (!occupiedSeats) return false;
    return !selectedSeats.some((seat) => occupiedSeats[seat]);
  } catch (err) {
    console.error("Error checking seat availability:", err);
    // Fallback — query MongoDB directly
    const show = await Show.findById(showId);
    if (!show) return false;
    return !selectedSeats.some((seat) => (show.occupiedSeats || {})[seat]);
  }
};

// Fetch from DB and write to Redis
const fetchAndCacheOccupiedSeats = async (showId) => {
  const show = await Show.findById(showId);
  if (!show) return null;
  const occupiedSeats = show.occupiedSeats || {};
  await redis.setex(
    KEYS.occupiedSeats(showId),
    TTL.occupiedSeats,
    JSON.stringify(occupiedSeats)
  );
  return occupiedSeats;
};

// ✅ Create Booking — with Redis seat lock + cache bust
const createBooking = async (req, res) => {
  const { showId, bookedSeats } = req.body;
  let locksAcquired = false;

  try {
    const userId = req.auth?.userId || req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!showId || !bookedSeats || bookedSeats.length === 0) {
      return res.status(400).json({ success: false, message: "Show ID and seats are required" });
    }

    // ── Step 1: Acquire Redis seat locks (fast, before DB hit) ──
    locksAcquired = await acquireSeatLocks(showId, bookedSeats, userId);
    if (!locksAcquired) {
      return res.status(409).json({
        success: false,
        message: "One or more seats are being booked by someone else. Please try again.",
      });
    }

    // ── Step 2: Ensure user exists in MongoDB ──
    let userDoc = await User.findById(userId);
    if (!userDoc) {
      const claims = req.auth?.sessionClaims || {};
      const emailFromClerk =
        claims.email ||
        claims.email_address ||
        claims.primaryEmailAddress ||
        claims.primary_email_address ||
        req.body?.email;
      const nameFromClerk = claims.name || claims.full_name || "User";

      if (emailFromClerk) {
        userDoc = await User.create({
          _id: userId,
          email: emailFromClerk,
          name: nameFromClerk,
        });
      }
    }

    // ── Step 3: Get email ──
    const claims = req.auth?.sessionClaims || {};
    const email =
      claims.email ||
      claims.email_address ||
      claims.primaryEmailAddress ||
      claims.primary_email_address ||
      userDoc?.email ||
      req.body?.email;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "User email not found. Cannot create booking.",
      });
    }

    // ── Step 4: Fetch show ──
    const show = await Show.findById(showId).populate("movie");
    if (!show) {
      return res.status(404).json({ success: false, message: "Show not found." });
    }

    // ── Step 5: Double-check availability via MongoDB (source of truth) ──
    const isAvailable = await checkSeatsAvailability(showId, bookedSeats);
    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: "Selected seats are already booked.",
      });
    }

    // ── Step 6: Create booking ──
    const ticketPrice = show.showPrice || 100;
    const totalAmount = ticketPrice * bookedSeats.length;

    const booking = await Booking.create({
      user: userId,
      email,
      show: show._id,
      bookedSeats,
      amount: totalAmount,
    });

    // ── Step 7: Mark seats as occupied in MongoDB ──
    show.occupiedSeats = show.occupiedSeats || {};
    bookedSeats.forEach((seat) => {
      show.occupiedSeats[seat] = userId;
    });
    show.markModified("occupiedSeats");
    await show.save();

    // ── Step 8: Bust occupied seats cache — data changed ──
    await bust(
      KEYS.occupiedSeats(showId),
      KEYS.myBookings(userId)
    );
// ── Step 8c: Emit real time seat update via WebSocket ──
getIO().to(showId).emit('seats-booked', { showId, bookedSeats });

// ── Step 8b: Publish to RabbitMQ ──
await publishToQueue('booking_confirmed', {
  bookingId: booking._id.toString(),
  userId,
  email,
  showId,
  bookedSeats,
  amount: totalAmount,
  movieTitle: show.movie.title,
  showDateTime: show.showDateTime,
});

    // ── Step 9: Stripe session ──
    const origin = req.headers.origin || "http://localhost:5173";
    const bookingIdStr = booking._id.toString();

    const session = await stripe.checkout.sessions.create({
      success_url: `${origin}/loading/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: show.movie.title || "Movie Ticket" },
            unit_amount: Math.floor(totalAmount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: { bookingId: bookingIdStr },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    booking.paymentLink = session.url;
    booking.sessionId = session.id;
    await booking.save();

    console.log("✅ Stripe session created:", session.id);
    console.log("🧾 Stripe session.metadata:", session.metadata);

    // ── Step 10: Inngest delay trigger ──
    await inngest.send({
      name: "app/checkpayment",
      data: { bookingId: bookingIdStr },
    });

    return res.status(201).json({
      success: true,
      url: session.url,
      bookingId: bookingIdStr,
      stripeSessionId: session.id,
    });
  } catch (err) {
    console.error("Booking Error:", err.message);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  } finally {
    // ── Always release seat locks — even if error thrown ──
    if (locksAcquired) {
      await releaseSeatLocks(showId, bookedSeats);
    }
  }
};

// ✅ Get Occupied Seats — cached
const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;

    const cached = await redis.get(KEYS.occupiedSeats(showId));
    if (cached) {
      const occupiedSeats = Object.keys(JSON.parse(cached));
      return res.json({ success: true, occupiedSeats });
    }

    const show = await Show.findById(showId);
    if (!show) {
      return res.status(404).json({ success: false, message: "Show not found" });
    }

    const occupiedSeats = show.occupiedSeats || {};

    // Cache for next request
    await redis.setex(
      KEYS.occupiedSeats(showId),
      TTL.occupiedSeats,
      JSON.stringify(occupiedSeats)
    );

    return res.json({
      success: true,
      occupiedSeats: Object.keys(occupiedSeats),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Get My Bookings — cached per user
const getMyBookings = async (req, res) => {
  try {
    const userId = req.auth?.userId || req.user?.id || req.userId;
    const cacheKey = KEYS.myBookings(userId);

    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({ success: true, bookings: JSON.parse(cached) });
    }

    const bookings = await Booking.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate({ path: "show", populate: { path: "movie" } });

    await redis.setex(cacheKey, TTL.myBookings, JSON.stringify(bookings));

    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Manual fallback payment — bust bookings cache after marking paid
const processPayment = async (req, res) => {
  try {
    const userId = req.auth?.userId || req.user?.id || req.userId;
    const { bookingId } = req.params;

    const booking = await Booking.findOne({ _id: bookingId, user: userId });
    if (!booking || booking.isPaid) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or already paid",
      });
    }

    booking.isPaid = true;
    await booking.save();

    // Bust user bookings cache — payment status changed
    await bust(KEYS.myBookings(userId));

    res.json({ success: true, message: "Payment successful" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export { createBooking, getOccupiedSeats, getMyBookings, processPayment };