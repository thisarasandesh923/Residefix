# ResideFix Backend (Express + MongoDB)

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your values:
   ```
   MONGO_URI=mongodb://localhost:27017/residefix
   PORT=5000
   JWT_SECRET=replace-this-with-a-long-random-string
   ```
   If you're using MongoDB Atlas instead of local MongoDB, paste your Atlas
   connection string as MONGO_URI instead.

3. Start the server:
   ```
   npm run dev
   ```
   You should see:
   ```
   Connected to MongoDB
   Server running on port 5000
   ```

## API Endpoints

- `POST /api/auth/signup` — create an account `{ name, email, password, role, property? }`
- `POST /api/auth/login` — log in `{ email, password }`, returns a JWT token
- `GET /api/complaints` — list complaints (residents: own, managers: all); filters `?status=&category=&priority=&q=`
- `POST /api/complaints` — create a complaint
- `GET /api/complaints/:id` — one complaint (owner or manager)
- `PATCH /api/complaints/:id` — residents edit details of their own open complaints; managers change `status`
- `DELETE /api/complaints/:id` — residents withdraw their own open complaints; managers delete any

Complaint routes require `Authorization: Bearer <token>`.
