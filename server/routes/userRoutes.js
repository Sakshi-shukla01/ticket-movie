import express from "express";
import {
  getFavorites,
  getUserBookings,
  updateFavorite,
} from "../controllers/userController.js";
import { requireAuth } from "@clerk/express";

const userRouter = express.Router();

// ✅ Protect all user-related routes
userRouter.use(requireAuth);

userRouter.get("/bookings", getUserBookings);
userRouter.get("/favorites", getFavorites);
userRouter.post("/update-favorite", updateFavorite);

export default userRouter;
