import { useEffect, useMemo, useRef, useState } from "react";
import { Home, Search, Library, Plus, Heart, Play, Pause, SkipBack, SkipForward, Volume2, LogIn, LogOut, Music2, Upload, X } from "lucide-react";
import { getToken, request } from "./api";

const formatTime = (value = 0) => {
  if (!Number.isFinite(value)) return "0:00";
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
};

function AuthModal({ mode, onClose, onSuccess, switchMode }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault(); setError("");
    try {
      const data = await request(`/auth/${mode}`, { method: "POST", body: JSON.stringify(form) });
      localStorage.setItem("melody_token", data.token); onSuccess(data.user);
    } catch (err) { setError(err.message); }
  }
  return <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <form className="modal" onSubmit={submit}>
      <button className="icon-btn modal-close" type="button" onClick={onClose}><X size={19}/></button>
      <div className="brand-mark">♫</div><h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
      <p className="muted">Your music, your library.</p>
      {mode === "register" && <input required placeholder="Your name" value={form.name} onChange={e => setForm({...form,name:e.target.value})}/>}
      <input required type="email" placeholder="Email address" value={form.email} onChange={e => setForm({...form,email:e.target.value})}/>
      <input required minLength="8" type="password" placeholder="Password (min. 8 characters)" value={form.password} onChange={e => setForm({...form,password:e.target.value})}/>
      {error && <p className="error">{error}</p>}
      <button className="primary full" type="submit">{mode === "login" ? "Log in" : "Sign up"}</button>
      <p className="switch-auth">{mode === "login" ? "New here?" : "Already have an account?"} <button type="button" onClick={() => switchMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Create account" : "Log in"}</button></p>
    </form>
  </div>;
}

function App() {
  const [user, setUser] = useState(null);
  const [songs, setSongs] = useState([]);
  const [audiusTracks, setAudiusTracks] = useState([]);
  const [audiusLoading, setAudiusLoading] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [liked, setLiked] = useState([]);
  const [activeSong, setActiveSong] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [query, setQuery] = useState("");
  const [authMode, setAuthMode] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const audio = useRef(null);

  async function loadLibrary() {
    try {
      const songData = await request("/songs");
      setSongs(songData.songs);
      if (getToken()) {
        const playlistData = await request("/playlists");
        setPlaylists(playlistData.playlists);
      } else {
        setPlaylists([]);
      }
    } catch (err) { setNotice(err.message); }
  }
  async function loadProfile() {
    if (!getToken()) return;
    try {
      const data = await request("/auth/me"); setUser(data.user);
      const likedData = await request("/users/liked"); setLiked(likedData.songs.map(s => s._id));
    } catch { localStorage.removeItem("melody_token"); }
  }
  useEffect(() => { loadLibrary(); loadProfile(); }, []);
  useEffect(() => { request("/discover/trending").then(data => setAudiusTracks(data.tracks || [])).catch(() => {}); }, []);
  useEffect(() => { if (audio.current) audio.current.volume = volume; }, [volume]);
  useEffect(() => { if (notice) { const timer = setTimeout(() => setNotice(""), 3500); return () => clearTimeout(timer); } }, [notice]);

  const filteredSongs = useMemo(() => songs.filter(song => `${song.title} ${song.artist} ${song.album}`.toLowerCase().includes(query.toLowerCase())), [songs, query]);
  async function searchAudius() {
    if (!query.trim()) { setNotice("Enter a song or artist to search Audius."); return; }
    setAudiusLoading(true);
    try { const data = await request("/discover/search?q=" + encodeURIComponent(query.trim())); setAudiusTracks(data.tracks || []); }
    catch (err) { setNotice(err.message); }
    finally { setAudiusLoading(false); }
  }
  function playAudius(track) {
    playSong({ _id: "audius:" + track.id, title: track.title, artist: track.artist, album: "Audius", audioUrl: "/api/discover/" + encodeURIComponent(track.id) + "/stream", coverUrl: track.artwork, provider: "audius", sourceUrl: track.permalink });
  }
  async function addAudiusToLibrary(track) {
    if (!user) { setAuthMode("login"); setNotice("Log in to save tracks to your library."); return; }
    try {
      await request("/discover/import", { method: "POST", body: JSON.stringify(track) });
      await loadLibrary(); setNotice("Added to your Melody library.");
    } catch (err) { setNotice(err.message); }
  }
  const isAdmin = user?.role === "admin";
  function playSong(song) {
    if (!song?.audioUrl) return;
    setActiveSong(song); setPlaying(true);
    requestAnimationFrame(() => audio.current?.play().catch(() => setNotice("Unable to play this audio file.")));
  }
  function togglePlay() {
    if (!activeSong && songs.length) { playSong(songs[0]); return; }
    if (!audio.current) return;
    if (audio.current.paused) audio.current.play().then(() => setPlaying(true)).catch(() => setNotice("Playback failed."));
    else { audio.current.pause(); setPlaying(false); }
  }
  function stepTrack(direction) {
    if (!songs.length) return;
    const index = songs.findIndex(song => song._id === activeSong?._id);
    const next = songs[(index + direction + songs.length) % songs.length];
    playSong(next);
  }
  async function toggleLike(song) {
    if (!user) { setAuthMode("login"); return; }
    try {
      let songId = song._id;
      if (song.provider === "audius") {
        const imported = await request("/discover/import", { method: "POST", body: JSON.stringify({ id: song._id.replace("audius:", ""), title: song.title, artist: song.artist, artwork: song.coverUrl, permalink: song.sourceUrl }) });
        songId = imported.song._id;
        await loadLibrary();
      }
      const data = await request(`/users/liked/${songId}`, { method: "POST" });
      setLiked(data.liked ? [...liked, songId] : liked.filter(id => id !== songId));
    } catch (err) { setNotice(err.message); }
  }
  async function createPlaylist() {
    if (!user) { setAuthMode("login"); return; }
    const name = window.prompt("Name your playlist");
    if (!name?.trim()) return;
    try { await request("/playlists", { method: "POST", body: JSON.stringify({ name }) }); await loadLibrary(); }
    catch (err) { setNotice(err.message); }
  }
  async function addToPlaylist(playlist) {
    if (!activeSong) return;
    try {
      let songId = activeSong._id;
      if (activeSong.provider === "audius") {
        const imported = await request("/discover/import", { method: "POST", body: JSON.stringify({ id: activeSong._id.replace("audius:", ""), title: activeSong.title, artist: activeSong.artist, artwork: activeSong.coverUrl, permalink: activeSong.sourceUrl }) });
        songId = imported.song._id;
      }
      await request(`/playlists/${playlist._id}/songs`, { method: "POST", body: JSON.stringify({ songId }) });
      setShowPlaylistMenu(false); setNotice("Added to " + playlist.name); await loadLibrary();
    } catch (err) { setNotice(err.message); }
  }
  async function deletePlaylist(playlist) {
    if (!window.confirm("Delete playlist " + playlist.name + "?")) return;
    try { await request("/playlists/" + playlist._id, { method: "DELETE" }); await loadLibrary(); setNotice("Playlist deleted"); }
    catch (err) { setNotice(err.message); }
  }
  async function logout() {
    localStorage.removeItem("melody_token"); setUser(null); setLiked([]); setPlaylists([]); setNotice("Logged out");
  }
  async function uploadSong(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try { await request("/admin/songs", { method: "POST", body: form }); setShowUpload(false); formElement.reset(); await loadLibrary(); setNotice("Track uploaded successfully"); }
    catch (err) { setNotice(err.message); }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#"><span className="brand-mark">♫</span> melody</a>
      <nav className="main-nav"><button className="nav-link active"><Home/>Home</button><label className="nav-search"><Search/><input placeholder="Search music" value={query} onChange={e => setQuery(e.target.value)}/></label></nav>
      <section className="library-panel"><div className="library-heading"><span><Library/> Your Library</span><button className="icon-btn" title="Create playlist" onClick={createPlaylist}><Plus/></button></div>
        <div className="side-playlists">
          {playlists.map(list => <button key={list._id} className="side-playlist" onClick={() => setQuery("")}><span className="mini-cover">♫</span><span><b>{list.name}</b><small>Playlist · {list.songs.length} tracks</small></span></button>)}
          {user && <button className="side-playlist" onClick={() => setQuery("")}><span className="mini-cover liked"><Heart/></span><span><b>Liked Songs</b><small>{liked.length} liked tracks</small></span></button>}
          {!playlists.length && <p className="muted small">Your playlists will appear here.</p>}
        </div>
        <div className="sidebar-bottom"><p>Build your own music space.</p><small>Independent music player project</small></div>
      </section>
    </aside>

    <main className="main-content">
      <header className="topbar"><div className="breadcrumbs"><span>Discover</span><span className="dot">/</span><b>Music</b></div>
        <div className="account-actions">{user ? <><span className="user-chip">{user.name}{isAdmin && <em>ADMIN</em>}</span><button className="outline" onClick={logout}><LogOut size={16}/> Log out</button></> : <><button className="text-btn" onClick={() => setAuthMode("register")}>Sign up</button><button className="primary" onClick={() => setAuthMode("login")}><LogIn size={16}/> Log in</button></>}</div>
      </header>
      <section className="hero"><div><span className="eyebrow">YOUR SOUNDTRACK STARTS HERE</span><h1>Music that moves<br/><span>with you.</span></h1><p>Discover tracks, build playlists and keep your favourites close.</p><button className="primary hero-cta" onClick={() => document.getElementById("music-library")?.scrollIntoView({behavior:"smooth"})}><Play size={17} fill="currentColor"/> Explore music</button></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-disc"><span>♫</span></div><div className="floating-note note-one">♪</div><div className="floating-note note-two">♫</div></div></section>

      <section className="section audius-section" id="audius-discovery">
        <div className="section-heading"><div><span className="eyebrow">OPEN MUSIC CATALOGUE</span><h2>Discover on Audius</h2></div><span className="source-pill">POWERED BY AUDIUS</span></div>
        <div className="discover-controls"><input className="discover-input" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && searchAudius()} placeholder="Search songs, artists or genres..."/><button className="primary" onClick={searchAudius} disabled={audiusLoading}>{audiusLoading ? "Searching..." : "Search Audius"}</button></div>
        {audiusTracks.length ? <div className="song-grid audius-grid">{audiusTracks.map(track => <article className="song-card" key={track.id}><button className="cover" onClick={() => playAudius(track)}>{track.artwork ? <img src={track.artwork} alt={track.title + " artwork"}/> : <span>♫</span>}<i><Play size={20} fill="currentColor"/></i></button><div className="song-card-meta"><div><b>{track.title}</b><small>{track.artist}</small></div><button className="icon-btn" title="Add to Melody library" onClick={() => addAudiusToLibrary(track)}><Plus size={18}/></button></div><div className="audius-credit"><a href={track.permalink} target="_blank" rel="noreferrer">View on Audius ↗</a></div></article>)}</div> : <div className="audius-empty">{audiusLoading ? "Looking for tracks..." : "Trending tracks will appear here. Search Audius to find more music."}</div>}
        <p className="audius-note">Music streams from Audius. Availability depends on each creator’s streaming settings. Track pages open on Audius for artist and source details.</p>
      </section>
      <section className="section" id="music-library"><div className="section-heading"><div><span className="eyebrow">THE COLLECTION</span><h2>{query ? "Search results" : "Explore tracks"}</h2></div><span className="muted">{filteredSongs.length} tracks</span></div>
        {filteredSongs.length ? <div className="song-grid">{filteredSongs.map(song => <article className="song-card" key={song._id}><button className="cover" onClick={() => playSong(song)}>{song.coverUrl ? <img src={song.coverUrl} alt=""/> : <span>♫</span>}<i><Play size={20} fill="currentColor"/></i></button><div className="song-card-meta"><div><b>{song.title}</b><small>{song.artist || "Unknown artist"}</small></div><button className={liked.includes(song._id) ? "like liked" : "like"} onClick={() => toggleLike(song)} title="Like song"><Heart size={18} fill={liked.includes(song._id) ? "currentColor" : "none"}/></button></div></article>)}</div> : <div className="empty-state"><div className="empty-icon"><Music2 size={30}/></div><h3>{query ? "No matching tracks" : "Your music library is ready"}</h3><p>{query ? "Try another title, artist or album." : "No tracks have been uploaded yet. Sign in as an administrator to add music you have permission to use."}</p>{isAdmin && <button className="primary" onClick={() => setShowUpload(true)}><Upload size={16}/> Upload first track</button>}</div>}
      </section>
      {playlists.length > 0 && <section className="section"><div className="section-heading"><div><span className="eyebrow">MADE BY YOU</span><h2>Your playlists</h2></div></div><div className="playlist-grid">{playlists.map(list => <article className="playlist-card" key={list._id}><div className="playlist-art">♫</div><div className="playlist-title"><h3>{list.name}</h3><button className="icon-btn" title="Delete playlist" onClick={() => deletePlaylist(list)}><X size={15}/></button></div><p>{list.songs.length} tracks</p><div className="playlist-track-list">{list.songs.slice(0,3).map(song => <button key={song._id} onClick={() => playSong(song)}>{song.title}</button>)}</div></article>)}</div></section>}
    </main>

    <footer className="player"><div className="now-playing">{activeSong ? <><div className="now-cover">{activeSong.coverUrl ? <img src={activeSong.coverUrl} alt=""/> : "♫"}</div><div className="now-meta"><b>{activeSong.title}</b><small>{activeSong.artist || "Unknown artist"}</small></div><button className={liked.includes(activeSong._id) ? "like liked" : "like"} onClick={() => toggleLike(activeSong)} title="Like track"><Heart size={17} fill={liked.includes(activeSong._id) ? "currentColor" : "none"}/></button>{user && playlists.length > 0 && <div className="player-playlist-menu"><button className="icon-btn" title="Add to playlist" onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}><Plus size={17}/></button>{showPlaylistMenu && <div className="playlist-popover">{playlists.map(list => <button key={list._id} onClick={() => addToPlaylist(list)}>{list.name}</button>)}</div>}</div>}</> : <span className="muted small">Select a track to start listening</span>}</div>
      <div className="player-center"><div className="player-controls"><button className="player-icon" onClick={() => stepTrack(-1)} aria-label="Previous"><SkipBack/></button><button className="play-toggle" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause fill="currentColor"/> : <Play fill="currentColor"/>}</button><button className="player-icon" onClick={() => stepTrack(1)} aria-label="Next"><SkipForward/></button></div><div className="timeline"><span>{formatTime(progress)}</span><input aria-label="Seek" type="range" min="0" max={duration || 0} value={Math.min(progress,duration || 0)} onChange={e => { audio.current.currentTime = Number(e.target.value); setProgress(Number(e.target.value)); }}/><span>{formatTime(duration)}</span></div></div>
      <div className="player-volume"><Volume2 size={18}/><input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(Number(e.target.value))}/></div>
    </footer>
    <audio ref={audio} src={activeSong?.audioUrl || ""} onTimeUpdate={e => setProgress(e.currentTarget.currentTime)} onLoadedMetadata={e => setDuration(e.currentTarget.duration || 0)} onEnded={() => stepTrack(1)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}/>
    {notice && <div className="toast">{notice}</div>}
    {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode("")} onSuccess={nextUser => {setUser(nextUser); setAuthMode(""); loadLibrary();}} switchMode={setAuthMode}/>}
    {showUpload && <div className="overlay"><form className="modal upload-modal" onSubmit={uploadSong}><button className="icon-btn modal-close" type="button" onClick={() => setShowUpload(false)}><X/></button><h2>Upload a track</h2><p className="muted">Only upload audio and artwork you own or are licensed to use.</p><label>Song title<input required name="title" placeholder="Track title"/></label><label>Artist<input name="artist" placeholder="Artist name"/></label><label>Album<input name="album" placeholder="Album name"/></label><label>Audio file<input required name="audio" type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg"/></label><label>Cover image (optional)<input name="cover" type="file" accept="image/png,image/jpeg,image/webp"/></label><button className="primary full" type="submit"><Upload size={16}/> Upload track</button></form></div>}
    {isAdmin && <button className="admin-fab" onClick={() => setShowUpload(true)}><Upload size={17}/> Add music</button>}
  </div>;
}

export default App;