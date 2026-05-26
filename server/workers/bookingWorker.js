import amqp from 'amqplib';
import 'dotenv/config';

const startWorker = async () => {
  try {
    const connection = await amqp.connect(
      process.env.RABBITMQ_URL || 'amqp://localhost'
    );
    const channel = await connection.createChannel();

    await channel.assertQueue('booking_confirmed', { durable: true });

    channel.prefetch(1);

    console.log('[Worker] ✅ Waiting for booking_confirmed messages...');

    channel.consume('booking_confirmed', (msg) => {
      if (!msg) return;

      const data = JSON.parse(msg.content.toString());
      console.log('[Worker] 📩 Booking received:', {
        bookingId: data.bookingId,
        email: data.email,
        movie: data.movieTitle,
        seats: data.bookedSeats,
        amount: data.amount
      });

      // Here you can add email sending, analytics, notifications etc
      // For now logging is enough

      channel.ack(msg);
    });

  } catch (err) {
    console.error('[Worker] Error:', err.message);
  }
};

startWorker();