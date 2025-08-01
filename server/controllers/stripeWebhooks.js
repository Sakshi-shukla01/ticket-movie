import stripe from "stripe";
import Booking from "../models/Booking.js";
import sendEmail from "../configs/nodeMailer.js";

export const stripeWebhooks = async (request, response) => {
  const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
  const sig = request.headers["stripe-signature"];

  let event;
  try {
    event = stripeInstance.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("❌ Stripe Webhook Signature Verification Failed:", error.message);
    return response.status(400).send(`Webhook Error: ${error.message}`);
  }

  console.log("🎯 Stripe Event Type:", event.type);

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        console.log("✅ Stripe webhook received: payment_intent.succeeded");

        const paymentIntent = event.data.object;
        console.log("📦 PaymentIntent ID:", paymentIntent.id);

        // Fetch session details
        const sessionList = await stripeInstance.checkout.sessions.list({
          payment_intent: paymentIntent.id,
        });

        const session = sessionList.data?.[0];
        console.log("📦 Found Stripe Session:", session?.id);

        if (!session || !session.metadata?.bookingId) {
          console.error("❌ No session or bookingId found in metadata.");
          break;
        }

        const bookingId = session.metadata.bookingId;
        console.log("🔍 Booking ID from metadata:", bookingId);

        // Update booking as paid
        const updatedBooking = await Booking.findByIdAndUpdate(
          bookingId,
          { isPaid: true, paymentLink: "" },
          { new: true }
        );

        if (!updatedBooking) {
          console.error("❌ Booking not found for ID:", bookingId);
          break;
        }

        console.log("✅ Booking marked as paid in DB");

        // Send confirmation email
        try {
          const booking = await Booking.findById(bookingId)
            .populate({
              path: "show",
              populate: { path: "movie", model: "Movie" },
            })
            .populate("user");

          console.log("📨 Booking loaded from DB:", booking?._id);
          console.log("👤 User Email:", booking?.user?.email);
          console.log("🎬 Movie:", booking?.show?.movie?.title);

          if (!booking || !booking.user || !booking.show || !booking.show.movie) {
            console.error("❌ Missing booking/user/show/movie data for confirmation email");
            break;
          }

          const username = booking.user.name || "Guest";
          const email = booking.user.email;

          await sendEmail({
            to: email,
            subject: `Payment Confirmation: "${booking.show.movie.title}" booked!`,
            body: `
              <div style="font-family: Arial, sans-serif; line-height: 1.5;">
                <h2>Hi ${username},</h2>
                <p>
                  Your booking for 
                  <strong style="color: #F84565;">"${booking.show.movie.title}"</strong> 
                  is confirmed.
                </p>
                <p>
                  <strong>Date:</strong> ${new Date(booking.show.showDateTime).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}<br/>
                  <strong>Time:</strong> ${new Date(booking.show.showDateTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </p>
                <p>Enjoy the show! 🍿</p>
                <p>Thanks for booking with us!<br/>– QuickShow Team</p>
              </div>
            `,
          });

          console.log(`✅ Email successfully sent to ${email}`);
        } catch (emailErr) {
          console.error("❌ Error sending confirmation email:", emailErr.message);
        }

        break;
      }

      default:
        console.log("ℹ️ Unhandled event type from Stripe:", event.type);
    }

    response.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook processing error:", err.message);
    response.status(500).send("Internal Server Error");
  }
};
