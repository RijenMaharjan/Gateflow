import { Injectable } from "@nestjs/common";
import { RedisService } from "../../../redis/redis.service";

// This Lua script runs atomically inside Redis — no other command
// can execute between these lines, which prevents race conditions
// where two simultaneous requests both think they're under the limit

const SLIDING_WINDOW_SCRIPT = `
  local key        = KEYS[1]       -- e.g. "rl:apiKeyId:projectId"
  local now        = tonumber(ARGV[1])  -- current time in milliseconds
  local window     = tonumber(ARGV[2])  -- window size in milliseconds
  local max        = tonumber(ARGV[3])  -- max allowed requests

  -- Remove all timestamps older than (now - window)
  -- ZREMRANGEBYSCORE removes members with score < windowStart
  -- This is what makes it a "sliding" window — old entries fall off
  redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

  -- Count how many requests remain in the current window
  local count = redis.call('ZCARD', key)

  if count >= max then
    -- Over limit — return remaining TTL so the caller can set Retry-After header
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retryAfter = 0
    if oldest[2] then
      retryAfter = math.ceil(((tonumber(oldest[2]) + window) - now) / 1000)
    end
    return {0, retryAfter}  -- {allowed: false, retryAfterSeconds}
  end

  -- Under limit — record this request as a member in the sorted set
  -- Score = timestamp, member = timestamp (unique per request)
  -- We use now + math.random() to handle multiple requests in the same millisecond
  redis.call('ZADD', key, now, now .. '-' .. math.random(1, 100000))

  -- Set the key to expire after the window — automatic cleanup
  -- This means idle keys don't accumulate in Redis forever
  redis.call('PEXPIRE', key, window)

  local remaining = max - count - 1
  return {1, remaining}  -- {allowed: true, remainingRequests}
`;

@Injectable()
export class SlidingWindowStrategy {
    constructor(private readonly redisService: RedisService) {}

    async check(
        apiKeyId: string,
        projectId: string,
        maxRequests: number,
        windowSeconds: number,
    ): Promise<{allowed: boolean; remaining: number; retryAfter: number}> {
        const client = this.redisService.getClient();


    // key format: "rl:<apiKeyId>:<projectId>"
    // scoped per API key — different keys on the same project have independent counters
    const key = `rl:${apiKeyId}:${projectId}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    const result = await client.eval(
        SLIDING_WINDOW_SCRIPT,
        1,
        key,
        now,
        windowMs,
        maxRequests,
    ) as [number, number];

        return {
            allowed: result[0] === 1,
            remaining: result[0] === 1 ? result[1] : 0,
            retryAfter: result[0] === 0 ? result[1] : 0,
        };
    }
}