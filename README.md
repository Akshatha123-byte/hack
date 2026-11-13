# IT Helpdesk Ticket Router

Parts A, B, C, and D of the P2 scenario are implemented with the paper's MERN stack:

- React + Vite frontend
- Express.js REST API
- MongoDB with Mongoose
- DFA and equivalent regular-expression validation
- Deterministic classification, routing, capacity checks, escalation, and status tracking
- Zones 1–4 each handle two issue types; Zone 5 handles Level-2 escalation for all issue types
- Deterministic priority ordering, high-priority override, duplicate prevention, and status history

## Run locally

1. Install Node.js 18+ and start MongoDB (local MongoDB or MongoDB Atlas).
2. Copy `backend/.env.example` to `backend/.env` and set `MONGO_URI`.
3. Run `npm run install:all`.
4. Run `npm run dev`.
5. Open `http://localhost:5173`.

When `MONGO_URI` is omitted, the API uses a clearly labelled in-memory development repository. This is useful for a classroom demonstration, but MongoDB should be configured for the database-backed submission.

## Test

`npm test` runs the documented Part D suite (28 tests). `npm run build` validates the production frontend build.

## API

- `POST /api/reports` submit, validate, classify, route, and assign a report
- `GET /api/reports?userEmail=...` list reports
- `GET /api/reports/:reportId` track one report
- `PATCH /api/reports/:reportId/status` update status
- `PATCH /api/handlers/:handlerId` update handler availability/capacity
- `GET /api/dashboard/summary` user/handler/routing/analytics data
