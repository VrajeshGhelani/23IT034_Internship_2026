# SplitEase — Expense Splitter

A full-stack, production-ready expense splitting web application built with the MERN stack.

## ✨ Features

- **Authentication** — JWT-based login/register with 7-day token expiry
- **Google Sign-In** — OAuth 2.0 integration for quick sign-in with Google
- **Groups** — Create groups, invite members by email, remove members
- **Invite via Link** — Generate shareable invite links with 7-day expiry
- **Expenses** — Add expenses with 4 split types: Equal, Exact, Percentage, Shares
- **Receipt Upload** — Attach receipt images/PDFs to expenses via Cloudinary
- **Balances** — Real-time net balance calculation per member
- **Settle Up** — Minimum-transaction debt simplification algorithm
- **Activity Feed** — Reverse-chronological expense history
- **Dashboard** — Cross-group balance summary
- **PDF Export** — Export group expenses, balances, and summaries to PDF
- **Dark Mode** — Full dark mode with glassmorphism UI

## 🏗 Tech Stack

| Layer      | Technology                               |
|------------|------------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS, React Router v6 |
| State      | Zustand (global), React Context (auth)   |
| Backend    | Node.js, Express.js (MVC)               |
| Database   | MongoDB + Mongoose                      |
| Auth       | JWT (7d) + bcrypt + Google OAuth 2.0 (Passport) |
| File Storage | Cloudinary (receipt images/PDFs)      |
| PDF        | PDFKit (server-side generation)          |
| Deployment | Vercel (frontend) / Render (backend)    |

## 📁 Project Structure

```
expense-splitter/
├── client/          # React + Vite frontend
│   └── src/
│       ├── api/            # Axios API calls
│       ├── components/     # Reusable components
│       ├── context/        # Auth context
│       ├── hooks/          # Custom hooks
│       ├── pages/          # Page components
│       └── utils/          # Utilities
└── server/          # Express.js backend
    ├── config/             # DB, Cloudinary, Passport configs
    ├── controllers/        # Route controllers
    ├── middleware/          # Auth, upload, error handlers
    ├── models/             # Mongoose models
    ├── routes/             # Express routes
    └── utils/              # Algorithms
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB Atlas account (or local MongoDB)

### 1. Clone & Install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables

**Server** (`server/.env`):
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/expense-splitter?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_key_change_in_production
CLIENT_URL=http://localhost:5173

# Cloudinary (Feature: Receipt Upload)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Google OAuth (Feature: Google Sign-In)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SESSION_SECRET=your_session_secret
```

**Client** (`client/.env`):
```env
VITE_API_URL=http://localhost:5000
```

### 3. Run Locally

**Start the backend** (Terminal 1):
```bash
cd server
npm run dev
```
Server runs on `http://localhost:5000`

**Start the frontend** (Terminal 2):
```bash
cd client
npm run dev
```
Frontend runs on `http://localhost:5173`

## 🔧 Feature Setup

### Cloudinary (Receipt Upload)

1. Create a free account at [cloudinary.com](https://cloudinary.com)
2. Navigate to **Dashboard** → copy **Cloud Name**, **API Key**, **API Secret**
3. Add these values to `server/.env`:
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

### Google OAuth (Google Sign-In)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a **New Project** (or use an existing one)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add **Authorized redirect URIs**:
   - `http://localhost:5000/api/auth/google/callback` (development)
   - `https://your-backend-url.com/api/auth/google/callback` (production)
7. Copy **Client ID** and **Client Secret**
8. Add to `server/.env`:
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   SESSION_SECRET=any_random_string_for_sessions
   ```

## 🌐 API Endpoints

### Auth (Public)
| Method | Endpoint                     | Description          |
|--------|------------------------------|----------------------|
| POST   | `/api/auth/register`         | Register new user    |
| POST   | `/api/auth/login`            | Login user           |
| GET    | `/api/auth/me`               | Get current user     |
| GET    | `/api/auth/google`           | Initiate Google OAuth|
| GET    | `/api/auth/google/callback`  | Google OAuth callback|

### Groups (JWT required unless noted)
| Method | Endpoint                          | Description           |
|--------|-----------------------------------|-----------------------|
| POST   | `/api/groups`                     | Create group          |
| GET    | `/api/groups`                     | List user's groups    |
| GET    | `/api/groups/:id`                 | Get group detail      |
| PUT    | `/api/groups/:id`                 | Update group          |
| DELETE | `/api/groups/:id`                 | Delete group          |
| POST   | `/api/groups/:id/members`         | Invite by email       |
| DELETE | `/api/groups/:id/members/:uid`    | Remove member         |
| POST   | `/api/groups/:id/invite-link`     | Generate invite link  |
| GET    | `/api/groups/join/:token`         | Preview invite (public)|
| POST   | `/api/groups/join/:token`         | Join via invite token |
| POST   | `/api/groups/:id/revoke-invite`   | Revoke invite link    |
| GET    | `/api/groups/:id/export-pdf`      | Export expenses to PDF|

### Expenses (JWT required)
| Method | Endpoint                       | Description             |
|--------|--------------------------------|-------------------------|
| POST   | `/api/groups/:id/expenses`     | Add expense (w/ receipt)|
| GET    | `/api/groups/:id/expenses`     | List expenses           |
| PUT    | `/api/expenses/:id`            | Update expense          |
| DELETE | `/api/expenses/:id`            | Delete expense          |
| PUT    | `/api/expenses/:id/receipt`    | Replace receipt         |

### Balances & Settle (JWT required)
| Method | Endpoint                       | Description           |
|--------|--------------------------------|-----------------------|
| GET    | `/api/groups/:id/balances`     | Net balances          |
| GET    | `/api/groups/:id/settleup`     | Settle-up suggestions |
| POST   | `/api/groups/:id/settle`       | Record settlement     |
| GET    | `/api/dashboard`               | Cross-group summary   |

## 💡 Split Types

| Type        | Description                                   |
|-------------|-----------------------------------------------|
| `equal`     | Divide evenly among selected members          |
| `exact`     | Specify exact amount per member (must sum)    |
| `percentage`| Specify % per member (must total 100%)        |
| `shares`    | Assign share units, compute proportional split|

## 📎 Receipt Upload

- Supports: JPG, JPEG, PNG, WEBP, PDF
- Max file size: 5MB
- Images stored on Cloudinary in `expense-receipts` folder
- Receipts are auto-deleted from Cloudinary when expense is deleted
- Image receipts show a clickable thumbnail → lightbox
- PDF receipts show a "View Receipt PDF" link → new tab
- Receipts can be replaced via the "Replace Receipt" button

## 🔗 Group Invite Links

- Creators can generate a shareable invite link
- Links expire after 7 days
- Anyone with the link can preview the group (name, creator, member count)
- Authenticated users can join directly; unauthenticated users are redirected to login first
- Creators can revoke links at any time

## 📄 PDF Export

- Export group expenses, balance summary, and category subtotals to PDF
- Streamed directly from server (no temporary files)
- Includes page headers, footers with page numbers, alternating row shading
- Color-coded balances (green for positive, red for negative)

## 🚢 Deployment

### Frontend (Vercel)
1. Push `client/` to a Git repository
2. Import in [Vercel](https://vercel.com)
3. Set env var `VITE_API_URL=https://your-backend.onrender.com`

### Backend (Render)
1. Push `server/` to a Git repository
2. Create a new **Web Service** on [Render](https://render.com)
3. Set environment variables from `server/.env`
4. Build command: `npm install`
5. Start command: `npm start`

## 🔒 Security

- Passwords hashed with bcrypt (saltRounds=10)
- JWT tokens expire after 7 days
- Passwords never returned in API responses (`.select('-password')`)
- CORS configured to allow only specified origins
- All inputs validated server-side via `express-validator`
- Receipt uploads validated for file type and size (server-side)
- Invite links checked for expiry server-side
- Google OAuth: access token never stored; only used to get profile, then own JWT issued
- PDF export streamed directly, never saved to disk

## 📜 License

MIT
