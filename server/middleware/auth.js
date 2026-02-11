// middleware/auth.js
import User from "../models/User.js";

export const protectAdmin = async (req, res, next) => {
  try {
    // ✅ Clerk auth middleware puts this on req
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ✅ Your schema stores Clerk userId as _id
    const user = await User.findById(userId);

    if (!user || user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    next();
  } catch (error) {
    console.error("❌ Error in protectAdmin middleware:", error);
    return res.status(500).json({ success: false, message: "Server error in admin check" });
  }
};
