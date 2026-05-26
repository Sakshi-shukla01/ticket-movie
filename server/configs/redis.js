import Redis from 'ioredis'

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,

  retryStrategy(times) {
    if (times > 10) return null
    return Math.min(times * 200, 3000)
  },

  reconnectOnError(err) {
    const targets = ['READONLY', 'ECONNRESET']
    return targets.some(e => err.message.includes(e))
  },

  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  commandTimeout: 5000,
  keepAlive: 10000,
  lazyConnect: true,
  db: 0,
})

redis.on('connect',     () => console.log('[Redis] Connected'))
redis.on('ready',       () => console.log('[Redis] Ready'))
redis.on('error',  (err) => console.error('[Redis] Error:', err.message))
redis.on('close',       () => console.warn('[Redis] Connection closed'))
redis.on('reconnecting',(ms) => console.log(`[Redis] Reconnecting in ${ms}ms`))

export default redis