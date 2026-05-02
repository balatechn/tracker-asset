const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  retryStrategy: (times) => {
    if (times > 3) return null;
    return Math.min(times * 200, 3000);
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err.message));

const DEFAULT_TTL = 300; // 5 minutes

async function getCache(key) {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Cache get error:', err.message);
    return null;
  }
}

async function setCache(key, value, ttl = DEFAULT_TTL) {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (err) {
    console.error('Cache set error:', err.message);
  }
}

async function deleteCache(key) {
  try {
    await redis.del(key);
  } catch (err) {
    console.error('Cache delete error:', err.message);
  }
}

async function deleteCachePattern(pattern) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.error('Cache delete pattern error:', err.message);
  }
}

module.exports = { redis, getCache, setCache, deleteCache, deleteCachePattern };
