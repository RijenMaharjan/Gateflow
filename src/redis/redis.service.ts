import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name)
    private client!: Redis;

    onModuleInit() {
        this.client = new Redis({
            host: process.env.REDIS_HOST ?? 'localhost',
            port: parseInt(process.env.REDIS_PORT ?? '6379'),
            
            retryStrategy: (times) => {
                if ( times > 10 ) return null; //stop retry and fail
                return Math.min(times * 500, 3000);
            },
        });

        this.client.on('connect', () => this.logger.log('Redis connected'));
        this.client.on('error', (err) => this.logger.log('Redis error',err));
    }

    onModuleDestroy() {
        // cleanly close connection when nestjs shutsdown
        // prevents connection leak between hot reloads in dev
        this.client.quit();
    }

    getClient(): Redis {
        return this.client;
    }
}