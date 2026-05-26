import redis from '../configs/redis.js'

// Keys — matched to your exact models
export const KEYS = {
  shows:       (movieId) => `shows:movie:${movieId}`,
  show:        (showId)  => `show:${showId}`,
  seats:       (showId)  => `seats:${showId}`,
  movie:       (movieId) => `movie:${movieId}`,
  allMovies:   ()        => `movies:all`,
  userBooking: (userId)  => `user:bookings:${userId}`,
  seatLock:    (seatId)  => `lock:seat:${seatId}`,
  adminRole:   (userId)  => `user:role:${userId}`,
}

export const TTL = {
  shows:    5 * 60,    // 5 min
  seats:    60,        // 1 min — volatile during booking
  movie:    60 * 60,   // 1 hour
  booking:  10 * 60,   // 10 min
  lock:     10,        // 10s seat hold
  adminRole:5 * 60,    // 5 min
}

// Cache-aside — always falls back to DB if Redis fails
export async function cached(key, ttl, fetcher) {
  try {
    const hit = await redis.get(key)
    if (hit) return JSON.parse(hit)

    const data = await fetcher()
    if (data) await redis.setex(key, ttl, JSON.stringify(data))
    return data
  } catch (err) {
    console.error(`[Cache] Miss for key ${key}:`, err.message)
    return fetcher()   // Redis down → still works via MongoDB
  }
}

// Bust one or multiple keys after write
export async function bust(...keys) {
  if (keys.length === 0) return
  await redis.del(...keys)
}

// Distributed seat lock — works alongside your MongoDB lock
// Returns true = lock acquired, false = seat already being booked
export async function acquireSeatLock(seatId, userId) {
  const key = KEYS.seatLock(seatId)
  const result = await redis.set(key, userId, 'EX', TTL.lock, 'NX')
  return result === 'OK'
}

export async function releaseSeatLock(seatId) {
  await redis.del(KEYS.seatLock(seatId))
}