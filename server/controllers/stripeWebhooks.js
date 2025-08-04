// controllers/stripeWebhooks.js
import Stripe from "stripe";
import Booking from "../models/Booking.js";
import { inngest } from "../inngest/index.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (request, response) => {
  console.log("🎯 Stripe webhook endpoint called");

  const sig = request.headers["stripe-signature"];

  if (!sig) {
    console.error("❌ Missing Stripe signature header");
    return response.status(400).send("Missing Stripe signature");
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("❌ Stripe Signature Verification Failed:", error.message);
    return response.status(400).send(`Webhook Error: ${error.message}`);
  }

  console.log("🎯 Stripe webhook received:", event.type);
  console.log("📋 Event ID:", event.id);

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        let bookingId = paymentIntent.metadata?.bookingId;

        if (!bookingId) {
          // Try to fetch via Checkout Session
          const sessions = await stripe.checkout.sessions.list({
            payment_intent: paymentIntent.id,
            limit: 1,
          });
          const session = sessions.data[0];
          bookingId = session?.metadata?.bookingId;
        }

        if (!bookingId) {
          console.error("❌ No bookingId found");
          break;
        }

        const updatedBooking = await Booking.findByIdAndUpdate(
          bookingId,
          {
            isPaid: true,
            paymentLink: "",
            paymentIntentId: paymentIntent.id,
            paidAt: new Date(),
          },
          { new: true }
        );

        if (!updatedBooking) {
          console.error("❌ Booking not found for ID:", bookingId);
          break;
        }

        await inngest.send({
          name: "app/show.booked",
          data: { bookingId },
        });

        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object;
        const bookingId = session.metadata?.bookingId;

        if (bookingId && session.payment_status === "paid") {
          const booking = await Booking.findById(bookingId);
          if (booking && !booking.isPaid) {
            await Booking.findByIdAndUpdate(
              bookingId,
              {
                isPaid: true,
                paymentLink: "",
                sessionId: session.id,
                paidAt: new Date(),
              }
            );

            await inngest.send({
              name: "app/show.booked",
              data: { bookingId },
            });
          }
        }

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        console.log("💸 Payment Failed:", paymentIntent.id);
        break;
      }

      default:
        console.log("ℹ️ Unhandled event type:", event.type);
    }

    return response.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook processing error:", err.message);
    return response.status(500).json({
      error: "Internal Server Error",
      eventType: event?.type,
      eventId: event?.id,
    });
  }
};
