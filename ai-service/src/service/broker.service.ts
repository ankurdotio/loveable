import amqplib from 'amqplib';
import { env } from '../config/env.js';
import { ProjectModel } from "../models/project.model.js"

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

export async function consumeMessage(queue: string, callback: (message: amqplib.ConsumeMessage | null) => void) {

    if (!channel) {
        throw new Error('Message broker channel is not initialized');
    }

    /**
     * Consumes messages from the specified queue.
     */
    await channel.assertQueue(queue, { durable: true });
    await channel.consume(queue,
        message => {
            if (message) {

                callback(message);
                channel!.ack(message);
            }
        }
        , { noAck: false });

}


export async function setupConsumers() {
    consumeMessage('project_created', async (message) => {
        if (!message) return;

        const content = JSON.parse(message.content.toString());

        await ProjectModel.create({
            projectId: content.projectId,
            userId: content.userId,
            context: ""
        })
    })
}

