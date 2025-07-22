// inngest/index.js
import { Inngest } from "inngest";
import connectDB from "../configs/db.js";
import User from "../models/user.js";

export const inngest = new Inngest({ id: "QuickShow App" });

const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    await connectDB();
    const { id, first_name, last_name, email_addresses, image_url } = event.data;

    return await User.create({
      _id: id,
      email: email_addresses[0].email_address,
      name: `${first_name} ${last_name}`,
      image: image_url,
    });
  }
);

const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    await connectDB();
    const { id, first_name, last_name, email_addresses, image_url } = event.data;

    return await User.findByIdAndUpdate(id, {
      email: email_addresses[0].email_address,
      name: `${first_name} ${last_name}`,
      image: image_url,
    });
  }
);

const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-from-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    await connectDB();
    return await User.findByIdAndDelete(event.data.id);
  }
);

export const functions = [
  syncUserCreation,
  syncUserUpdation,
  syncUserDeletion
];
