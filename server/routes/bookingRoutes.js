import express from 'express';
import {
  createBooking,
  getOccupiedSeats,
  getMyBookings,
  processPayment,
} from '../controllers/bookingController.js';

const bookingRouter = express.Router();

bookingRouter.post('/create', createBooking);
bookingRouter.get('/seats/:showId', getOccupiedSeats);
bookingRouter.get('/my', getMyBookings);
bookingRouter.post('/pay/:bookingId', processPayment); // Optional fallback

export default bookingRouter;
