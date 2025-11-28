import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const connection = new IORedis(process.env.REDIS_URL);
export const claimQueue = new Queue(process.env.BULL_QUEUE_NAME || 'verification-queue', { connection });
