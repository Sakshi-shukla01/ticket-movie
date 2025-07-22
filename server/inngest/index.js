import { Inngest } from "inngest";
import User from "../models/User.js";

export const inngest = new Inngest({ id: "QuickShow App" });

// Create user
const syncUserCreation = inngest.createFunction(
  { id: 'sync-user-from-clerk' },
  { event: 'clerk/user.created' },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } = event.data;

    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      name: `${first_name} ${last_name}`,
      image: image_url
    };

    return await User.create(userData);
  }
);

// Delete user
const syncUserDeletion = inngest.createFunction(
  { id: 'delete-user-from-clerk' },
  { event: 'clerk/user.deleted' },
  async ({ event }) => {
    const { id } = event.data;
    return await User.findByIdAndDelete(id);
  }
);

// Update user
const syncUserUpdation = inngest.createFunction(
  { id: 'update-user-from-clerk' },
  { event: 'clerk/user.updated' },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } = event.data;

    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      name: `${first_name} ${last_name}`,
      image: image_url
    };

    return await User.findByIdAndUpdate(id, userData);
  }
);

export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation
];
