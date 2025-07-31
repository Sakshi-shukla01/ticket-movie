import { Inngest } from "inngest";
//import connectDB from "../configs/db.js";
import User from "../models/User.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-ticket-booking" });

// Inngest Function to save user data to a database
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    //await connectDB();

    const { id, first_name, last_name, email_addresses, image_url } = event.data;

    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      name: first_name + " " + last_name,
      image: image_url
    };

    await User.create(userData);
  }
);

// Inngest Function to update user data
const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    //await connectDB();

    const { id, first_name, last_name, email_addresses, image_url } = event.data;

    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      name: first_name + " " + last_name,
      image: image_url
    };

    await User.findByIdAndUpdate(id, userData);
  }
);

// Inngest Function to delete user data
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-from-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const {id}=event.data
    await User.findByIdAndDelete(id);
  }
);

export const functions = [
  syncUserCreation,
  syncUserUpdation,
  syncUserDeletion
];
