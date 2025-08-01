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
      if (booking && !booking.isPaid) {
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

    try {
      const booking = await Booking.findById(bookingId)
        .populate({
          path: "show",
          populate: { path: "movie", model: "Movie" },
        })
        .populate("user");

      if (!booking || !booking.user || !booking.show || !booking.show.movie) {
        console.error("❌ Missing booking/user/movie data for confirmation email");
        return;
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

      console.log(`✅ Confirmation email sent to ${email}`);
    } catch (err) {
      console.error("❌ Error sending booking confirmation email:", err);
    }
  }
);

// ----------------- Export All Functions -----------------

export const functions = [
  syncUserCreation,
  syncUserUpdation,
  syncUserDeletion,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
];
