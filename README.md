# IOE Mock Exam Platform — Kantipur Engineering College

A full-stack mock exam platform for the IOE (Institute of Engineering) entrance examination, built for **Kantipur Engineering College (KEC)**.

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL 16 (Prisma ORM)
- **Cache**: Redis 7
- **Auth**: Passport.js (Local + Google OAuth) + JWT
- **Real-time**: Socket.IO

## Getting Started

```bash
# 1. Clone and install
cp .env.example .env
cd server && npm install
cd ../client && npm install

# 2. Start services (Docker)
docker-compose up -d postgres redis

# 3. Setup database
cd server && npx prisma migrate dev && npx prisma db seed

# 4. Run dev servers
cd server && npm run dev   # port 5000
cd client && npm run dev   # port 5173
```

## Project Structure

```
ioe-mock-exam/
├── client/          React frontend
├── server/          Express backend
├── prisma/          Database schema + seeds
├── docker-compose.yml
└── .env.example
```
