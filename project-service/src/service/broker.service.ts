import amqplib from 'amqplib';
import { env } from '../config/env.js';

let channel: amqplib.Channel | null = null;


export async function connectToMessageBroker() {

    const connection = await amqplib.connect(env.MESSAGE_BROKER_URL);

    channel = await connection.createChannel();

    console.log('Connected to message broker');
}

export async function publishMessage(queue: string, message: string) {
    if (!channel) {
        throw new Error('Message broker channel is not initialized');
    }

    /**
     * Publishes a message to the specified queue.
     */
    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(message));
}
