# 🎬 QuickShow — Movie Ticket Booking Platform

A full-stack SaaS movie ticket booking application with real-time seat selection, payment processing, and AI-powered background workflows.



---

## 🚀 Tech Stack

### Frontend
- React.js + Vite
- Tailwind CSS
- Clerk (Authentication)
- Socket.io Client (Real-time)
- Axios

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- Redis (ioredis) — Caching + Distributed Seat Locking
- RabbitMQ (CloudAMQP) — Async Message Queue
- Socket.io — Real-time WebSocket
- Stripe — Payment Processing
- Inngest — Background Job Workflows
- Nodemailer + Brevo SMTP — Transactional Emails
- JWT via Clerk — Authentication

### DevOps & Testing
- Docker ready
- Vercel (Frontend deployment)
- Jest + Supertest — Unit Testing
- GitHub Actions ready

---

## ✨ Features

### User Features
- Browse now-playing movies (fetched from TMDB API)
- Real-time seat selection — seats update live across all users
- Secure checkout via Stripe
- Booking confirmation emails
- View booking history

### Admin Features
- Add movies and shows from TMDB
- Dashboard with total bookings, revenue, active shows, user count
- View all bookings with user details

### Technical Features
- **Distributed Seat Locking** — Redis atomic `SET NX EX` prevents double booking under concurrent load
- **Redis Caching** — Show listings, seat availability, user roles, and Clerk API responses all cached with appropriate TTLs
- **WebSocket Real-time** — Socket.io rooms per show; when a seat is booked, all users on the same show page see it go red instantly
- **RabbitMQ Message Queue** — Booking confirmation events published asynchronously; separate worker process consumes and processes them
- **Background Payments** — Inngest workflow checks unpaid bookings and cancels expired ones automatically
- **Role-based Access** — Admin routes protected via Clerk + MongoDB role check with Redis caching

---

## 🏗️ Architecture

```
Client (React + Vite)
    │
    ├── REST API calls → Express Server
    │       ├── Clerk Auth Middleware
    │       ├── Show Routes → showController (Redis cached)
    │       ├── Booking Routes → bookingController
    │       │       ├── Redis seat lock (atomic NX)
    │       │       ├── MongoDB write
    │       │       ├── Socket.io emit → all clients in show room
    │       │       ├── RabbitMQ publish → booking_confirmed queue
    │       │       └── Stripe checkout session
    │       ├── Admin Routes → adminController (Clerk API cached)
    │       └── Stripe Webhook → payment confirmation
    │
    ├── WebSocket (Socket.io)
    │       └── Real-time seat updates to all connected clients
    │
    ├── RabbitMQ Worker (separate process)
    │       └── Consumes booking_confirmed queue
    │
    └── Inngest Worker
            └── Checks unpaid bookings, sends confirmation emails
```

---


---

## ⚙️ Environment Variables

Create `server/.env`:

```env
MONGODB_URI=your_mongodb_atlas_uri
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
CLERK_SECRET_KEY=sk_xxx
TMDB_API_KEY=your_tmdb_bearer_token
REDIS_HOST=localhost
REDIS_PORT=6379
RABBITMQ_URL=amqps://your_cloudamqp_url
SENDER_EMAIL=your_email@gmail.com
SENDER_PASSWORD=your_app_password
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_CLERK_PUBLISHABLE_KEY=pk_xxx
VITE_CURRENCY=₹
```

---

## 🚀 Running Locally

**Prerequisites:** Node.js 18+, Redis, RabbitMQ (or CloudAMQP URL)

```bash
# 1. Clone the repo
git clone https://github.com/Sakshi-shukla01/ticket-movie.git
cd ticket-movie

# 2. Install dependencies
cd server && npm install
cd ../client && npm install

# 3. Start Redis (Windows)
redis-server

# 4. Start backend
cd server
npm run dev

# 5. Start RabbitMQ worker (separate terminal)
cd server
npm run worker

# 6. Start frontend
cd client
npm run dev
```

---

## 🧪 Running Tests

```bash
cd server
npm test
```

```
Test Suites: 2 passed, 2 total
Tests:       11 passed, 11 total
Time:        0.975 s
```

Tests use `jest.unstable_mockModule` for ES module mocking. All external dependencies (MongoDB, Redis, RabbitMQ, Stripe, Socket.io, Clerk) are mocked — no real services needed to run tests.

---

## 🔑 Key Implementation Details

### Distributed Seat Locking
```js
// Atomic Redis lock — prevents double booking under concurrent load
const result = await redis.set(key, userId, "EX", 10, "NX");
```

### Real-time Seat Updates
```js
// Server emits when booking confirmed
getIO().to(showId).emit('seats-booked', { showId, bookedSeats });

// Client updates UI instantly
socket.on('seats-booked', ({ bookedSeats }) => {
  setOccupiedSeats(prev => [...new Set([...prev, ...bookedSeats])]);
});
```

### Async Booking Processing
```js
// After booking — publish to queue (non-blocking)
await publishToQueue('booking_confirmed', { bookingId, email, movieTitle });

// Worker processes asynchronously
channel.consume('booking_confirmed', (msg) => {
  const data = JSON.parse(msg.content.toString());
  // process confirmation...
  channel.ack(msg);
});
```

---

## 📊 Redis Cache Strategy

| Data | Cache Key | TTL |
|------|-----------|-----|
| All shows | `shows:all` | 5 min |
| Show by movie | `shows:movie:{id}` | 2 min |
| Occupied seats | `seats:occupied:{id}` | 1 min |
| User bookings | `bookings:user:{id}` | 5 min |
| User role | `user:role:{id}` | 5 min |
| Clerk users | `clerk:users:all` | 5 min |
| Seat lock | `lock:seat:{showId}:{seat}` | 10 sec |

---
---
##screenshots
<img width="1509" height="775" alt="Screenshot 2026-05-26 144416" src="https://github.com/user-attachments/assets/017b9421-0015-4b1b-bcc6-de921a70ba14" />
<img width="1463" height="283" alt="Screenshot 2026-05-26 144327" src="https://github.com/user-attachments/assets/80581d3d-7e0d-4dd7-ac66-e33666022a00" />
<img width="1497" height="278" alt="Screenshot 2026-05-26 144032" src="https://github.com/user-attachments/assets/070910e6-2c01-4f30-893d-d74a2cd38aa2" />
<img width="1366" height="352" alt="Screenshot 2026-05-26 143916" src="https://github.com/user-attachments/assets/ac693d4a-a29c-4cc9-93ba-8a901eafda34" />
<img width="1500" height="187" alt="Screenshot 2026-05-26 143734" src="https://github.com/user-attachments/assets/91908f3e-8ce7-4a95-8a38-be87ee0d39bb" />
<img width="1191" height="307" alt="Screenshot 2026-05-26 143721" src="https://github.com/user-attachments/assets/63773402-b41f-4bc0-a423-e13a07d2eb6a" />



## 🙋 Author

**Sakshi Shukla**
- GitHub: [@Sakshi-shukla01](https://github.com/Sakshi-shukla01)
