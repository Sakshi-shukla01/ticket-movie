import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import { clerkClient } from "@clerk/express";
import User from "../models/User.js";
import redis from "../configs/redis.js";

const CLERK_USERS_TTL = 5 * 60; // 5 minutes
const CLERK_USERS_KEY = "clerk:users:all";

// ─── Helper: get Clerk users with Redis cache ───────────────────────
const getCachedClerkUsers = async () => {
  const cached = await redis.get(CLERK_USERS_KEY);
  if (cached) {
    return JSON.parse(cached);
  }

  const { data: clerkUsers } = await clerkClient.users.getUserList({ limit: 100 });
  await redis.setex(CLERK_USERS_KEY, CLERK_USERS_TTL, JSON.stringify(clerkUsers));
  return clerkUsers;
};

// ✅ Check if the user is admin
export const isAdmin = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    const ok = user?.role === "admin";

    return res.json({ success: true, isAdmin: ok });
  } catch (err) {
    console.error("isAdmin error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Get dashboard summary for admin
export const getDashboardData = async (req, res) => {
  try {
    const bookings = await Booking.find({ isPaid: true });
    const activeShows = await Show.find({ showDateTime: { $gte: new Date() } }).populate("movie");

    // ✅ Cached Clerk call — won't hit rate limit
    const allUsers = await getCachedClerkUsers();
    const totalUser = allUsers.length;

    const dashboardData = {
      totalBookings: bookings.length,
      totalRevenue: bookings.reduce((acc, booking) => acc + booking.amount, 0),
      activeShows,
      totalUser,
    };

    res.json({ success: true, dashboardData });
  } catch (error) {
    console.error("Error in getDashboardData:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get all upcoming shows
export const getAllShows = async (req, res) => {
  try {
    const shows = await Show.find({ showDateTime: { $gte: new Date() } })
      .populate("movie")
      .sort({ showDateTime: 1 });

    res.json({ success: true, shows });
  } catch (error) {
    console.error("Error in getAllShows:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get all bookings
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate("show")
      .sort({ createdAt: -1 });

    // ✅ Cached Clerk call — won't hit rate limit
    const clerkUsers = await getCachedClerkUsers();

    const enrichedBookings = bookings.map((booking) => {
      const user = clerkUsers.find((u) => u.id === booking.user.toString());
      return {
        ...booking.toObject(),
        user: {
          name: user?.firstName + " " + user?.lastName || "Unknown User",
          email: user?.emailAddresses[0]?.emailAddress || "No Email"
        }
      };
    });

    res.json({ success: true, bookings: enrichedBookings });
  } catch (error) {
    console.error("Error in getAllBookings:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};