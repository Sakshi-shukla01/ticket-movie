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

// ----------------- Booking Confirmation Email (UPDATED) -----------------

const sendBookingConfirmationEmail = inngest.createFunction(
  { id: "send-booking-confirmation-email" },
  { event: "app/show.booked" },
  async ({ event }) => {
    const { bookingId } = event.data;
    
    console.log("📧 Starting booking confirmation email process for:", bookingId);

    try {
      // ✅ Add validation
      if (!bookingId) {
        console.error("❌ Missing bookingId in event data");
        return;
      }

      console.log("🔍 Fetching booking details...");
      const booking = await Booking.findById(bookingId)
        .populate({
          path: "show",
          populate: { path: "movie", model: "Movie" },
        })
        .populate("user");

      // ✅ Better error handling with specific checks
      if (!booking) {
        console.error("❌ Booking not found for ID:", bookingId);
        return;
      }
      
      if (!booking.user) {
        console.error("❌ User not found for booking:", bookingId);
        return;
      }
      
      if (!booking.show) {
        console.error("❌ Show not found for booking:", bookingId);
        return;
      }
      
      if (!booking.show.movie) {
        console.error("❌ Movie not found for booking:", bookingId);
        return;
      }

      console.log("✅ Booking details fetched successfully");
      console.log("👤 User:", booking.user.name, "(" + booking.user.email + ")");
      console.log("🎬 Movie:", booking.show.movie.title);
      console.log("📅 Show Date:", booking.show.showDateTime);

      const username = booking.user.name || "Guest";
      const email = booking.user.email;
      
      // ✅ Validate email address
      if (!email || !email.includes('@')) {
        console.error("❌ Invalid email address:", email);
        return;
      }
      
      // ✅ Format date and time properly
      const showDate = new Date(booking.show.showDateTime);
      const formattedDate = showDate.toLocaleDateString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const formattedTime = showDate.toLocaleTimeString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit'
      });

      // ✅ Enhanced email template
      const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <div style="background-color: #F84565; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🎬 Booking Confirmed!</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9;">
            <h2 style="color: #333; margin-top: 0;">Hi ${username},</h2>
            <p style="font-size: 16px; color: #555;">
              Great news! Your booking for 
              <strong style="color: #F84565; font-size: 18px;">"${booking.show.movie.title}"</strong> 
              has been confirmed and payment received.
            </p>
            
            <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F84565;">
              <h3 style="color: #333; margin-top: 0;">📋 Booking Details</h3>
              <p style="margin: 5px 0;"><strong>🎬 Movie:</strong> ${booking.show.movie.title}</p>
              <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
              <p style="margin: 5px 0;"><strong>⏰ Time:</strong> ${formattedTime}</p>
              <p style="margin: 5px 0;"><strong>🎫 Booking ID:</strong> ${bookingId}</p>
              ${booking.bookedSeats ? `<p style="margin: 5px 0;"><strong>💺 Seats:</strong> ${booking.bookedSeats.join(', ')}</p>` : ''}
            </div>
            
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #2d5a2d;">
                <strong>💡 Pro Tip:</strong> Please arrive at least 15 minutes before showtime. 
                Don't forget to bring a valid ID for verification.
              </p>
            </div>
            
            <p style="font-size: 16px; text-align: center; margin: 20px 0;">
              🍿 <strong>Enjoy the show!</strong> 🍿
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #777; font-size: 14px; margin: 0;">
                Thanks for choosing QuickShow!<br/>
                <strong>– The QuickShow Team</strong>
              </p>
            </div>
          </div>
        </div>
      `;

      console.log("📤 Sending confirmation email to:", email);
      
      await sendEmail({
        to: email,
        subject: `🎬 Booking Confirmed: "${booking.show.movie.title}" - QuickShow`,
        body: emailBody,
      });

      console.log(`✅ Confirmation email sent successfully to ${email}`);
      
    } catch (err) {
      console.error("❌ Error in booking confirmation email process:");
      console.error("Error message:", err.message);
      console.error("Stack trace:", err.stack);
      
      // ✅ Try to log more context for debugging
      console.error("Booking ID:", bookingId);
      console.error("Event data:", event.data);
      
      // Don't throw the error - we don't want to fail the payment process
      // if email sending fails
    }
  }
);

// ----------------- Export All Functions -----------------

export const functions = [
  syncUserCreation,
  syncUserUpdation,
  syncUserDeletion,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail, // ✅ This is already included
];