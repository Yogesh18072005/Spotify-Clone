# Spotify-Inspired Music Player

A responsive, browser-based music player built with **HTML, CSS and vanilla JavaScript**, inspired by Spotify's dark music-player interface. This project was developed as a hands-on web development project while learning frontend fundamentals.

> This is an independent educational project. It is not affiliated with, endorsed by, or connected to Spotify.

## Overview

The application presents a music-library layout with playlist cards, a song list and a persistent playback bar. Playlist information is loaded from local folders, while audio playback is handled by the browser's native `HTMLAudioElement`.

## Features

- Spotify-inspired dark interface with a sidebar, playlist cards and playback bar
- Dynamically reads MP3 files from playlist folders
- Loads playlist title and description from each folder's `info.json`
- Displays playlist cover artwork
- Play and pause controls
- Previous and next track navigation
- Clickable playback progress / seek bar
- Current playback time and track duration
- Volume slider and mute toggle
- Responsive sidebar behaviour for smaller screens

## Tech Stack

- **HTML5** — page structure and audio player interface
- **CSS3** — layout, styling, responsive media queries and hover states
- **JavaScript (ES6)** — playlist loading, DOM updates and playback controls
- **HTML Audio API** — in-browser audio playback

## Project Structure

```text
Spotify-Clone/
├── css/
│   ├── style.css
│   └── utility.css
├── img/
│   └── interface icons and artwork
├── js/
│   └── script.js
├── songs/
│   └── ncs/
│       ├── info.json
│       ├── cover.jpg
│       └── *.mp3
└── index.html
```

Each playlist folder should contain:
- `info.json` with a `title` and `description`
- `cover.jpg` for its artwork
- One or more MP3 files that you are permitted to use

Example `info.json`:

```json
{
  "title": "My Playlist",
  "description": "A collection of sample tracks"
}
```

## Run Locally

This project uses folder-listing requests to discover playlist directories and MP3 files. Run it through a local web server rather than opening `index.html` directly.

1. Clone the repository:
   ```bash
   git clone https://github.com/Yogesh18072005/Spotify-Clone.git
   cd Spotify-Clone
   ```
2. Open the project folder in VS Code.
3. Start the folder using the **Live Server** extension (or another static server that supports directory listings).
4. Open the local URL provided by the server.

## Current Scope

This is a **frontend-only learning project**. It does not currently implement user accounts, a backend API, cloud music storage or streaming from a commercial music catalogue. Audio files are loaded from the project's local playlist folders.

## Learning Outcomes

- Structuring a multi-section web interface with semantic HTML
- Building responsive layouts with CSS Flexbox and media queries
- Manipulating the DOM to render playlists and tracks dynamically
- Working with asynchronous `fetch()` requests
- Managing audio playback events and player state
- Implementing interactive controls for seeking and volume

## Author

**Yogesh Chhikara**  
GitHub: [@Yogesh18072005](https://github.com/Yogesh18072005)

---

*Built for learning and portfolio demonstration.*
