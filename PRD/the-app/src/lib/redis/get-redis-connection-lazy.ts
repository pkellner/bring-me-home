import IORedis, { Redis } from "ioredis";

let redisConnection: Redis | null = null;

export default function getRedisConnectionLazy(
  redisHost: string,
  redisPort: number,
): Redis {
  if (!redisConnection) {
    redisConnection = new IORedis({
      host: redisHost,
      port: redisPort,
      lazyConnect: true,        // Only connect when a command is issued
      maxRetriesPerRequest: null,
      // Example custom retry strategy
      retryStrategy(times: number) {
        // After X retries, stop trying
        if (times > 5) return null;
        // Otherwise, wait 500ms and try again
        console.log("/get-redis-connection-lazy.ts: retrying in 500ms");
        return 500;
      },
    });

    // Attach an error listener to prevent unhandled exceptions
    redisConnection.on("error", (error) => {
      console.error("Redis Error:", error);
    });
  }

  return redisConnection;
}