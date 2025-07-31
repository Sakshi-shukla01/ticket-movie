import { clerkClient } from "@clerk/express";

export const protectAdmin = async (req, res, next) => {
  try {
    const { userId } = await req.auth(); // ✅ await is necessary here

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await clerkClient.users.getUser(userId);

    if (!user || user.privateMetadata.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    next();
  } catch (error) {
    console.error("❌ Error in protectAdmin middleware:", error);
    return res.status(500).json({ success: false, message: "Server error in admin check" });
  }
};
