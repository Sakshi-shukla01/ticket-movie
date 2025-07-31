import { clerkClient } from "@clerk/express";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import Movie from "../models/Movie.js";

// ✅ Get all favorite movies for the authenticated user
export const getFavorites = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await clerkClient.users.getUser(userId);

    const favorites = user.privateMetadata?.favorites || [];
    if (!favorites.length) {
      return res.json({ success: true, movies: [] });
    }

    const movies = await Movie.find({ _id: { $in: favorites } });
    res.json({ success: true, movies });
  } catch (error) {
    console.error("❌ Error fetching favorites:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch favorites" });
  }
};

// ✅ Add or remove a movie from favorites
export const updateFavorite = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { movieId } = req.body;

    if (!movieId) {
      return res.status(400).json({ success: false, message: "Missing movieId" });
    }

    const user = await clerkClient.users.getUser(userId);
    const currentFavorites = user.privateMetadata?.favorites || [];

    let updatedFavorites;
    if (currentFavorites.includes(movieId)) {
      updatedFavorites = currentFavorites.filter((id) => id !== movieId);
    } else {
      updatedFavorites = [...currentFavorites, movieId];
    }

    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: { favorites: updatedFavorites },
    });

    res.json({ success: true, favorites: updatedFavorites });
  } catch (error) {
    console.error("❌ Error updating favorites:", error.message);
    res.status(500).json({ success: false, message: "Failed to update favorites" });
  }
};

// ✅ Get all bookings made by the user
export const getUserBookings = async (req, res) => {
  try {
    const userId = req.auth.userId;

    const bookings = await Booking.find({ user: userId })
      .populate({
        path: "show",
        populate: { path: "movie" },
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (error) {
    console.error("❌ Error fetching bookings:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch bookings" });
  }
};
