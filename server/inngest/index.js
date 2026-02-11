import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../configs/nodeMailer.js";

export const inngest = new Inngest({ id: "movie-ticket-booking" });

// ----------------- Clerk Sync Functions -----------------

const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } = event.data;
    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      name: `${first_name} ${last_name}`,
      image: image_url,
    };
    await User.create(userData);
  }
);

const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } = event.data;
    const userData = {
      email: email_addresses[0].email_address,
      name: `${first_name} ${last_name}`,
      image: image_url,
    };
    await User.findByIdAndUpdate(id, userData);
  }
);

const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-from-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { id } = event.data;
    await User.findByIdAndDelete(id);
  }
);

// ----------------- Booking Auto-Cancel Function -----------------

const releaseSeatsAndDeleteBooking = inngest.createFunction(
  { id: "release-seats-delete-booking" },
  { event: "app/checkpayment" },
  async ({ event, step }) => {
    const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
    await step.sleepUntil("wait-for-10-minutes", tenMinutesLater);

    await step.run("check-payment-status", async () => {
      const bookingId = event.data.bookingId;

      const booking = await Booking.findById(bookingId);
      if (!booking) return;

      if (!booking.isPaid) {
        const show = await Show.findById(booking.show);

        if (show && booking.bookedSeats) {
          booking.bookedSeats.forEach((seat) => {
            delete show.occupiedSeats[seat];
          });
          show.markModified("occupiedSeats");
          await show.save();
        }

        await Booking.findByIdAndDelete(booking._id);
      }
    });
  }
);

// ----------------- Booking Confirmation Email -----------------

const sendBookingConfirmationEmail = inngest.createFunction(
  { id: "send-booking-confirmation-email" },
  { event: "app/show.booked" },
  async ({ event }) => {
    const { bookingId } = event.data;

    console.log("📧 Starting booking confirmation email process for:", bookingId);

    try {
      if (!bookingId) {
        console.error("❌ Missing bookingId in event data");
        return;
      }

      // ✅ Fetch booking + show/movie
      const booking = await Booking.findById(bookingId).populate({
        path: "show",
        populate: { path: "movie", model: "Movie" },
      });

      if (!booking) {
        console.error("❌ Booking not found for ID:", bookingId);
        return;
      }

      if (!booking.show?.movie) {
        console.error("❌ Movie not found for booking:", bookingId);
        return;
      }

      // ✅ FIX: prefer booking.email (new schema)
      let email = booking.email;

      // ✅ fallback for OLD bookings (if any)
      if (!email) {
        const userId = booking.user;
        const user = userId ? await User.findById(userId) : null;
        email = user?.email;
      }

      if (!email) {
        console.error("❌ Email missing in booking AND user. bookingId:", bookingId);
        return;
      }

      const username = "Guest"; // (optional) keep simple without breaking anything

      const showDate = new Date(booking.show.showDateTime);
      const formattedDate = showDate.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const formattedTime = showDate.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
      });

      const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Hi ${username},</h2>
          <p>Your booking for <b>"${booking.show.movie.title}"</b> is confirmed ✅</p>
          <p><b>Date:</b> ${formattedDate}</p>
          <p><b>Time:</b> ${formattedTime}</p>
          <p><b>Seats:</b> ${(booking.bookedSeats || []).join(", ")}</p>
          <p>Enjoy 🍿</p>
          <p>– QuickShow Team</p>
        </div>
      `;

      console.log("📤 Sending email to:", email, "bookingId:", bookingId);

      await sendEmail({
        to: email,
        subject: `🎬 Booking Confirmed: "${booking.show.movie.title}" - QuickShow`,
        body: emailBody,
      });

      console.log(`✅ Confirmation email sent successfully to ${email}`);
    } catch (err) {
      console.error("❌ Error in booking confirmation email process:", err);
    }
  }
);

// ...same exports
export const functions = [
  syncUserCreation,
  syncUserUpdation,
  syncUserDeletion,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
];

// ❌ keep this commented (otherwise duplicate export)
// export { inngest };
