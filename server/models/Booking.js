// models/Booking.js
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: String,        // Clerk userId
      ref: "User",
      required: true,
    },

    email: {
      type: String,        // ✅ REQUIRED for email sending
      required: true,
      trim: true,
      lowercase: true,
    },

    show: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Show",
      required: true,
    },

    bookedSeats: {
      type: [String],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    isPaid: {
      type: Boolean,
      default: false,
    },

    paymentIntentId: String,
    sessionId: String,
    paidAt: Date,
    paymentLink: String,
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
