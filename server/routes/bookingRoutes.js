// bookingRoutes.js
import express from 'express';
import {
  createBooking,
  getOccupiedSeats,
  getMyBookings,
  processPayment,
} from '../controllers/bookingController.js';

const bookingRouter = express.Router();

bookingRouter.post('/create', createBooking); // POST /api/booking/create
bookingRouter.get('/seats/:showId', getOccupiedSeats); // GET /api/booking/seats/:showId
bookingRouter.get('/my', getMyBookings); // GET /api/booking/my
bookingRouter.post('/pay/:bookingId', processPayment); // Optional payment route

export default bookingRouter;
