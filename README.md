# 🎟️ SeatSure — High-Concurrency Real-Time Seat Booking Platform

**SeatSure** is a production-ready, full-stack event ticket booking platform engineered to handle extreme concurrency and flash-sale traffic without double-bookings or race conditions. It combines distributed atomic caching, database-level transactions, and instantaneous real-time WebSockets.

---

## 🚀 Key Features

* **⚡ Real-Time WebSocket Synchronization:** Instant UI updates across all connected browser clients using `Socket.IO`.
* **🔒 Distributed Atomic Locking:** Prevents double-bookings during peak traffic using **Upstash Redis** atomic locks (`SETNX`).
* **🛡️ Bot & Scalper Protection:** Express rate limiting prevents burst requests and automated script scraping.
* **⏱️ Automatic Hold Expiration:** Unconfirmed seat holds automatically release back to the public inventory after a timeout window.
* **📊 Multi-Tier Seating Grid:** Interactive layout categorized into VIP, Premium, and Standard seating sections with dynamic pricing.
* **🌐 Cloud Native Architecture:** Fully decoupled architecture deployed live across Vercel (Frontend), Render (Backend), MongoDB Atlas, and Upstash Redis.

---

## 🛠️ Tech Stack

### **Frontend**
* **Framework:** React / Vite
* **Styling:** Tailwind CSS
* **Real-Time Client:** `socket.io-client`
* **HTTP Client:** Axios

### **Backend**
* **Runtime:** Node.js & Express.js
* **Real-Time Server:** `Socket.IO`
* **Database:** MongoDB Atlas (Mongoose ORM)
* **Caching & Locking:** Upstash Redis (`ioredis` with TLS)
* **Security & Utility:** `express-rate-limit`, `cors`, `dotenv`

---

## 📐 Architecture Overview

```text
[ React Frontend (Vercel) ]
       │
       ├──────────── HTTP API Requests ───────────► [ Node.js Express Backend (Render) ]
       │                                                  │
       └─────────── WebSocket Connection ─────────┐       ├─► [ MongoDB Atlas ] (Persistent Storage)
                                                   ▼      │
                                         [ Socket.IO / Redis ]┴─► [ Upstash Redis ] (Atomic Lock Engine)
