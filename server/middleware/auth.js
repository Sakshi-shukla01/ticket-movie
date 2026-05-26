// middleware/auth.js
import User from "../models/User.js";
import redis from "../configs/redis.js";

export const protectAdmin = async (req, res, next) => {
  try {
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Check Redis first — skip DB hit on every admin request
    const cacheKey = `user:role:${userId}`;
    let role = await redis.get(cacheKey);

    if (!role) {
      // Cache miss — query MongoDB exactly as before
      const user = await User.findById(userId);
      role = user?.role;

      // Cache the role for 5 min
      if (role) await redis.setex(cacheKey, 300, role);
    }

    if (!role || role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    next();
  } catch (error) {
    console.error("❌ Error in protectAdmin middleware:", error);
    return res.status(500).json({ success: false, message: "Server error in admin check" });
  }
};