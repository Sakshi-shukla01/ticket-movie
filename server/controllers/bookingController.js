import Show from "../models/Show.js";
import Booking from "../models/Booking.js";
import stripePackage from 'stripe';
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
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { showId, bookedSeats } = req.body;
    if (!showId || !bookedSeats || bookedSeats.length === 0) {
      return res.status(400).json({ success: false, message: "Show ID and seats are required" });
    }

    const show = await Show.findById(showId).populate("movie");
    if (!show) {
      return res.status(404).json({ success: false, message: "Show not found." });
    }

    const isAvailable = await checkSeatsAvailability(showId, bookedSeats);
    if (!isAvailable) {
      return res.status(400).json({ success: false, message: "Selected seats are already booked." });
    }

    const ticketPrice = show.showPrice || 100;
    const totalAmount = ticketPrice * bookedSeats.length;

    const booking = await Booking.create({
      user: userId,
      show: show._id,
      bookedSeats,
      amount: totalAmount,
    });

    // Update show with occupied seats
    if (!show.occupiedSeats) {
      show.occupiedSeats = {};
    }
    bookedSeats.forEach((seat) => {
      show.occupiedSeats[seat] = userId;
    });

    show.markModified("occupiedSeats");
    await show.save();

    const origin = req.headers.origin || 'http://localhost:5173';

    const line_items = [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: show.movie.title || "Movie Ticket"
        },
        unit_amount: Math.floor(totalAmount * 100)
      },
      quantity: 1
    }];

    const session = await stripe.checkout.sessions.create({
      success_url: `${origin}/loading/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      line_items: line_items,
      mode: 'payment',
      metadata: {
        bookingId: booking._id.toString()
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    booking.paymentLink = session.url;
    await booking.save();

    return res.status(201).json({
      success: true,
      url: session.url
    });

  } catch (err) {
    console.error("Booking Error:", err.message);
    res.status(500).json({ success: false, message: "Internal Server Error: " + err.message });
  }
};

// ✅ Get Occupied Seats
const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;
    if (!showId) {
      return res.status(400).json({ success: false, message: "Show ID is required" });
    }

    const show = await Show.findById(showId);
    if (!show) {
      return res.status(404).json({ success: false, message: "Show not found" });
    }

    const occupiedSeats = show.occupiedSeats ? Object.keys(show.occupiedSeats) : [];
    res.json({ success: true, occupiedSeats });
  } catch (err) {
    console.error("Error getting occupied seats:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Get My Bookings
const getMyBookings = async (req, res) => {
  try {
    const userId = req.auth?.userId || req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const bookings = await Booking.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "show",
        populate: {
          path: "movie",
        },
      });

    res.json({ success: true, bookings });
  } catch (err) {
    console.error("Error getting bookings:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Process Payment
const processPayment = async (req, res) => {
  try {
    const userId = req.auth?.userId || req.user?.id || req.userId;
    const { bookingId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const booking = await Booking.findOne({ _id: bookingId, user: userId });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.isPaid) {
      return res.json({ success: false, message: "Booking already paid" });
    }

    booking.isPaid = true;
    await booking.save();
    //run ingest schedular fucntion to check payment
await inngest.send({
  name:"app/chrckpayment",
  data:{
    bookingId:booking._id.toString()
  }
})
    res.json({ success: true, message: "Payment successful" });
  } catch (err) {
    console.error("Payment error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export {
  createBooking,
  getOccupiedSeats,
  getMyBookings,
  processPayment
};
