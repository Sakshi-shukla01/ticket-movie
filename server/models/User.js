import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: String, // Clerk userId
      required: true,
    },
    name: String,
    email: {
      type: String,
      required: true,
      unique: true,
    },
    image: String,
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
