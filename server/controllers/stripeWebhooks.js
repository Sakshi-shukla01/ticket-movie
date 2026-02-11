// controllers/stripeWebhooks.js
import Stripe from "stripe";
import Booking from "../models/Booking.js";
import { inngest } from "../inngest/index.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (req, res) => {
  console.log("🔥 STRIPE WEBHOOK HIT");

  const sig = req.headers["stripe-signature"];
  if (!sig) return res.status(400).send("Missing signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Signature error:", err.message);
    return res.status(400).send("Webhook error");
  }

  try {
    if (event.type !== "checkout.session.completed") {
      return res.json({ received: true });
    }

    console.log("🔥 CHECKOUT SESSION COMPLETED");

    const session = event.data.object;

    if (session.payment_status !== "paid") {
      return res.json({ received: true });
    }

    // ---------------------------------------
    // ✅ STEP 1: Try metadata (new bookings)
    // ---------------------------------------
    let booking = null;

    if (session.metadata?.bookingId) {
      console.log("✅ bookingId from metadata:", session.metadata.bookingId);

      booking = await Booking.findOneAndUpdate(
        { _id: session.metadata.bookingId, isPaid: false },
        {
          $set: {
            isPaid: true,
            paidAt: new Date(),
          },
        },
        { new: true }
      );
    }

    // ---------------------------------------
    // ✅ STEP 2: Fallback using session.id
    // ---------------------------------------
    if (!booking) {
      console.log("⚠️ Metadata missing → fallback using session.id:", session.id);

      booking = await Booking.findOneAndUpdate(
        { sessionId: session.id, isPaid: false },
        {
          $set: {
            isPaid: true,
            paidAt: new Date(),
          },
        },
        { new: true }
      );
    }

    if (!booking) {
      console.log("ℹ️ Booking already paid or not found for session:", session.id);
      return res.json({ received: true });
    }

    console.log("✅ BOOKING MARKED PAID:", booking._id);

    // ---------------------------------------
    // ✅ STEP 3: Trigger email via Inngest
    // ---------------------------------------
    await inngest.send({
      name: "app/show.booked",
      data: { bookingId: booking._id.toString() },
    });

    console.log("📨 Inngest event sent for booking:", booking._id);

    return res.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook crash:", err);
    return res.status(500).send("Server error");
  }
};
