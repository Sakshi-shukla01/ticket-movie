// routes/adminRoutes.js
import express from "express";
import { protectAdmin } from "../middleware/auth.js";
import {
  getAllBookings,
  getAllShows,
  getDashboardData,
  isAdmin,
} from "../controllers/adminController.js";
import { requireAuth } from "@clerk/express";

const adminRouter = express.Router();

// ✅ IMPORTANT: admin-check should be auth-only, not admin-only
adminRouter.get("/is-admin", requireAuth(), isAdmin);

// ✅ These should remain admin-only
adminRouter.get("/dashboard", protectAdmin, getDashboardData);
adminRouter.get("/all-shows", protectAdmin, getAllShows);
adminRouter.get("/all-bookings", protectAdmin, getAllBookings);

export default adminRouter;
