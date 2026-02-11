import Show from "../models/Show.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import stripePackage from "stripe";
import { inngest } from "../inngest/index.js";

const stripe = new stripePackage(process.env.STRIPE_SECRET_KEY);

// ✅ Check seat availability
const checkSeatsAvailability = async (showId, selectedSeats) => {
  try {
    const show = await Show.findById(showId);
    if (!show) return false;
    const occupiedSeats = show.occupiedSeats || {};
    return !selectedSeats.some((seat) => occupiedSeats[seat]);
  } catch (err) {
    console.error("Error checking seat availability:", err);
    return false;
  }
};

// ✅ Create Booking
const createBooking = async (req, res) => {
  try {
    const userId = req.auth?.userId || req.user?.id || req.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    // ✅ Ensure user exists in MongoDB (unchanged)
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

    // ✅ CHANGE #1: GET EMAIL (REQUIRED FOR CONFIRMATION EMAIL)
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

    const { showId, bookedSeats } = req.body;
    if (!showId || !bookedSeats || bookedSeats.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Show ID and seats are required" });
    }

    const show = await Show.findById(showId).populate("movie");
    if (!show) {
      return res
        .status(404)
        .json({ success: false, message: "Show not found." });
    }

    const isAvailable = await checkSeatsAvailability(showId, bookedSeats);
    if (!isAvailable) {
      return res
        .status(400)
        .json({ success: false, message: "Selected seats are already booked." });
    }

    const ticketPrice = show.showPrice || 100;
    const totalAmount = ticketPrice * bookedSeats.length;

    // ✅ CHANGE #2: STORE EMAIL INSIDE BOOKING
    const booking = await Booking.create({
      user: userId,
      email, // 🔥 used later in email sending
      show: show._id,
      bookedSeats,
      amount: totalAmount,
    });

    // Update occupied seats
    show.occupiedSeats = show.occupiedSeats || {};
    bookedSeats.forEach((seat) => {
      show.occupiedSeats[seat] = userId;
    });
    show.markModified("occupiedSeats");
    await show.save();

    const origin = req.headers.origin || "http://localhost:5173";

    // ✅ IMPORTANT: keep bookingId string ready
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

      // ✅ METADATA (your original line is correct)
      metadata: { bookingId: bookingIdStr },

      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    // ✅ EXTRA: Save sessionId too (helps fallback if metadata ever missing)
    booking.paymentLink = session.url;
    booking.sessionId = session.id; // ✅ ADDED (non-breaking)
    await booking.save();

    // ✅ DEBUG: confirm Stripe actually created session with metadata
    console.log("✅ Stripe session created:", session.id);
    console.log("🧾 Stripe session.metadata:", session.metadata); // should show bookingId

    // Inngest delay trigger
    await inngest.send({
      name: "app/checkpayment",
      data: { bookingId: bookingIdStr },
    });

    return res.status(201).json({
      success: true,
      url: session.url,
      bookingId: bookingIdStr,      // ✅ helpful for frontend debug (safe)
      stripeSessionId: session.id,  // ✅ helpful for webhook debug (safe)
    });
  } catch (err) {
    console.error("Booking Error:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// ✅ Get Occupied Seats
const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;
    const show = await Show.findById(showId);
    if (!show) {
      return res
        .status(404)
        .json({ success: false, message: "Show not found" });
    }

    const occupiedSeats = show.occupiedSeats ? Object.keys(show.occupiedSeats) : [];
    res.json({ success: true, occupiedSeats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Get My Bookings
const getMyBookings = async (req, res) => {
  try {
    const userId = req.auth?.userId || req.user?.id || req.userId;
    const bookings = await Booking.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate({ path: "show", populate: { path: "movie" } });

    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Manual fallback payment route
const processPayment = async (req, res) => {
  try {
    const userId = req.auth?.userId || req.user?.id || req.userId;
    const { bookingId } = req.params;

    const booking = await Booking.findOne({ _id: bookingId, user: userId });
    if (!booking || booking.isPaid) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found or already paid" });
    }

    booking.isPaid = true;
    await booking.save();

    res.json({ success: true, message: "Payment successful" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export { createBooking, getOccupiedSeats, getMyBookings, processPayment };
