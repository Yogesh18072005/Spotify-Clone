# Melody — Full-Stack Music Library

A responsive music-library application built with the MERN stack: **MongoDB, Express.js, React and Node.js**. The project is an independent educational music player and is not affiliated with Spotify.

## Features

- Responsive React interface with local-library search and Audius music discovery
- Audius catalogue search, trending tracks, artwork and streaming playback
- Indian music catalogue handoff through the official JioSaavn website (no API key or billing)
- Save Audius tracks into the MongoDB-backed Melody library
- Node.js + Express REST API
- MongoDB models for users, songs and playlists
- User registration and login with password hashing and JWT authentication
- Personal playlists and liked songs with paginated library shelves
- Recently played history, an upcoming playback queue and device-local listening statistics
- Audio playback controls: play, pause, previous, next, seek and volume, with a reusable player hook and event cleanup
- Unified local-library / Audius search with debounced Audius queries
- Keyboard shortcuts: Space to play/pause, arrow keys to seek, and Ctrl + arrow keys to change tracks
- Loading skeletons and an application-level React error boundary
- Administrator-only music upload with optional cover artwork
- Protected API routes and rate-limited authentication endpoints

## Technology

- Frontend: React, Vite, CSS, Lucide icons
- Backend: Node.js, Express
- Database: MongoDB + Mongoose
- Authentication: JSON Web Tokens + bcrypt
- File handling: Multer (local uploads for development)
- Music catalogue: Audius REST API; JioSaavn opens on its official website

## Run locally

### Requirements
- Node.js 20 or later
- MongoDB Community Server running locally, or a MongoDB connection URI
- Git

### 1. Clone and install

```bash
git clone https://github.com/Yogesh18072005/Spotify-Clone.git
cd Spotify-Clone
npm install
```

### 2. Configure the backend

Copy the example environment file:

PowerShell:
```powershell
Copy-Item .env.example .env
```

Update `.env` with your MongoDB URI and a long random JWT secret. Keep this file private and never commit real credentials. Audius discovery works without a key for development; optionally set `AUDIUS_API_KEY` to use your own Audius API key for higher rate limits. Indian music catalogue browsing opens the official JioSaavn website; Melody does not scrape JioSaavn or stream its catalogue through an unofficial API.

### 3. Create the administrator account

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, then run:

```bash
npm run seed:admin --workspace=server
```

Use that account to sign in and upload audio files that you own or are licensed to use.

### 4. Start the application

```bash
npm run dev
```

- React frontend: http://localhost:5173
- Express API: http://localhost:5000/api
- Health check: http://localhost:5000/api/health

## API overview

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create an account |
| POST | `/api/auth/login` | Public | Sign in |
| GET | `/api/auth/me` | User | Current account |
| GET | `/api/songs` | Public | Browse/search saved tracks; accepts optional `page` and `limit` parameters |
| GET | `/api/albums?page=1&limit=12` | Public | Paginated album catalogue |
| GET | `/api/playlists?page=1&limit=12` | User | Paginated personal playlists |
| GET | `/api/discover/trending` | Public | Browse trending Audius tracks |
| GET | `/api/discover/search?q=...` | Public | Search Audius tracks |
| GET | `/api/discover/:trackId/stream` | Public | Stream an available Audius track |
| POST | `/api/discover/import` | User | Save an Audius track to the Melody library |
| GET | `/api/playlists` | User | List personal playlists |
| POST | `/api/playlists` | User | Create playlist |
| POST | `/api/playlists/:id/songs` | Owner | Add a track |
| GET | `/api/users/liked` | User | Get liked tracks |
| POST | `/api/users/liked/:songId` | User | Like/unlike track |
| POST | `/api/admin/songs` | Admin | Upload a track |

Authenticated endpoints require an `Authorization: Bearer <token>` header.

## Project structure

```text
Spotify-Clone/
├── client/                 # React + Vite frontend
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       └── styles.css
├── server/                 # Express backend
│   └── src/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       └── scripts/
├── css/                    # Original learning-project assets
├── img/                    # Original icons
├── songs/                  # Original sample playlist folders
├── .env.example
└── package.json
```

## Important notes

- Recently played history and listening statistics are stored in the current browser on this device; they are not synced between devices or accounts.\n- Uploaded audio is stored locally in `server/uploads` for development. For production, use object storage and configure backups.
- This repository does not include a commercial music catalogue or copyrighted tracks. Upload only media you have permission to distribute. JioSaavn is opened on its official website; Melody does not scrape, download or proxy JioSaavn audio.
- Configure HTTPS, production CORS, secure secrets, persistent object storage and deployment-specific limits before public production use.
- The older static HTML/JavaScript learning files remain in the repository; the active full-stack application runs from `client/` and `server/`.

## Author

**Yogesh Chhikara** · [GitHub](https://github.com/Yogesh18072005)
