import amqp from 'amqplib';

let channel = null;

export const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(
      process.env.RABBITMQ_URL || 'amqp://localhost'
    );
    channel = await connection.createChannel();

    await channel.assertQueue('booking_confirmed', { durable: true });
    await channel.assertQueue('booking_cancelled', { durable: true });

    console.log('[RabbitMQ] Connected and queues ready');

    connection.on('error', (err) => {
      console.error('[RabbitMQ] Connection error:', err.message);
    });

    connection.on('close', () => {
      console.warn('[RabbitMQ] Connection closed');
    });

  } catch (err) {
    console.error('[RabbitMQ] Connection failed:', err.message);
  }
};

export const publishToQueue = async (queueName, data) => {
  try {
    if (!channel) {
      console.error('[RabbitMQ] No channel available');
      return;
    }
    channel.sendToQueue(
      queueName,
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );
    console.log(`[RabbitMQ] ✅ Published to ${queueName}`);
  } catch (err) {
    console.error('[RabbitMQ] Publish error:', err.message);
  }
};

export const getChannel = () => channel;