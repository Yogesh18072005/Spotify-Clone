import { useEffect, useMemo, useRef, useState } from "react";
import { Home, Search, Library, Plus, Heart, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, LogIn, LogOut, Music2, Upload, X, Disc3, Download, Shuffle, Repeat, Moon, Check, Clock, UserRoundCheck } from "lucide-react";
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
      const endpoint = mode === "artist-register" ? "/auth/register-artist" : `/auth/${mode}`;
      const data = await request(endpoint, { method: "POST", body: JSON.stringify(form) });
      localStorage.setItem("melody_token", data.token); onSuccess(data.user);
    } catch (err) { setError(err.message); }
  }
  return <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <form className="modal" onSubmit={submit}>
      <button className="icon-btn modal-close" type="button" onClick={onClose}><X size={19}/></button>
      <div className="brand-mark">♫</div><h2>{mode === "login" ? "Welcome back" : mode === "artist-register" ? "Apply as an artist" : "Create your account"}</h2>
      <p className="muted">Your music, your library.</p>
      {mode === "artist-register" && <><input required placeholder="Artist / stage name" value={form.artistName || ""} onChange={e => setForm({...form,artistName:e.target.value})}/><textarea placeholder="Short artist bio (optional)" value={form.bio || ""} onChange={e => setForm({...form,bio:e.target.value})}/><p className="muted">Artist accounts require administrator approval before publishing.</p></>}
      {(mode === "register" || mode === "artist-register") && <input required placeholder="Your name" value={form.name} onChange={e => setForm({...form,name:e.target.value})}/>}
      <input required type="email" placeholder="Email address" value={form.email} onChange={e => setForm({...form,email:e.target.value})}/>
      <input required minLength="8" type="password" placeholder="Password (min. 8 characters)" value={form.password} onChange={e => setForm({...form,password:e.target.value})}/>
      {error && <p className="error">{error}</p>}
      <button className="primary full" type="submit">{mode === "login" ? "Log in" : mode === "artist-register" ? "Submit artist application" : "Sign up"}</button>
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
  const [albums, setAlbums] = useState([]);
  const [savedAlbums, setSavedAlbums] = useState([]);
  const [pendingArtists, setPendingArtists] = useState([]);
  const [artistData, setArtistData] = useState({ songs: [], albums: [], profile: {} });
  const [selectedStudioSong, setSelectedStudioSong] = useState("");
  const [likedSongs, setLikedSongs] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [recommendedTracks, setRecommendedTracks] = useState([]);
  const [liked, setLiked] = useState([]);
  const [activeSong, setActiveSong] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [query, setQuery] = useState("");
  const [authMode, setAuthMode] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showArtistStudio, setShowArtistStudio] = useState(false);
  const [showApprovals, setShowApprovals] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState("off");
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const audio = useRef(null);

  async function loadLibrary() {
    try {
      const songData = await request("/songs");
      setSongs(songData.songs);
      const albumData = await request("/albums");
      setAlbums(albumData.albums || []);
      if (getToken()) {
        const savedData = await request("/albums/library/saved");
        setSavedAlbums(savedData.albums || []);
      } else setSavedAlbums([]);
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
      const likedData = await request("/users/liked"); setLikedSongs(likedData.songs || []); setLiked((likedData.songs || []).map(s => s._id));
      if (data.user.role === "artist" || data.user.role === "admin") {
        try { setArtistData(await request("/artist/me")); } catch {}
      }
      if (data.user.role === "admin") loadPendingArtists();
    } catch { localStorage.removeItem("melody_token"); }
  }
  useEffect(() => { loadLibrary(); loadProfile(); }, []);
  useEffect(() => { request("/discover/trending").then(data => { setAudiusTracks(data.tracks || []); setRecommendedTracks(data.tracks || []); }).catch(() => {}); }, []);
  useEffect(() => {
    if (!activeSong?.artist) return;
    let cancelled = false;
    request("/discover/search?q=" + encodeURIComponent(activeSong.artist)).then(data => {
      if (!cancelled) setRecommendedTracks((data.tracks || []).filter(track => track.title !== activeSong.title).slice(0, 8));
    }).catch(() => { if (!cancelled) setRecommendedTracks(audiusTracks.filter(track => track.title !== activeSong.title).slice(0, 8)); });
    return () => { cancelled = true; };
  }, [activeSong?._id]);
  useEffect(() => { if (audio.current) audio.current.volume = muted ? 0 : volume; }, [volume, muted]);
  useEffect(() => {
    if (!selectedCollection) return;
    const timer = setTimeout(() => document.getElementById("selected-collection")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    return () => clearTimeout(timer);
  }, [selectedCollection]);
  useEffect(() => {
    if (!sleepMinutes) return;
    const timer = setTimeout(() => { audio.current?.pause(); setPlaying(false); setSleepMinutes(0); setNotice("Sleep timer ended. Playback paused."); }, sleepMinutes * 60 * 1000);
    return () => clearTimeout(timer);
  }, [sleepMinutes]);
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
    setActiveSong(song); setPlaying(true); setShowNowPlaying(true);
    requestAnimationFrame(() => audio.current?.play().catch(() => setNotice("Unable to play this audio file.")));
  }
  function togglePlay() {
    if (!activeSong && songs.length) { playSong(songs[0]); return; }
    if (!audio.current) return;
    if (audio.current.paused) audio.current.play().then(() => setPlaying(true)).catch(() => setNotice("Playback failed."));
    else { audio.current.pause(); setPlaying(false); }
  }
  function stepTrack(direction) {
    if (activeSong?.provider === "audius" && audiusTracks.length) {
      const index = audiusTracks.findIndex(track => "audius:" + track.id === activeSong._id);
      let nextIndex = index + direction;
      if (shuffle) nextIndex = Math.floor(Math.random() * audiusTracks.length);
      else nextIndex = (nextIndex + audiusTracks.length) % audiusTracks.length;
      playAudius(audiusTracks[nextIndex]); return;
    }
    if (!songs.length) return;
    const index = songs.findIndex(song => song._id === activeSong?._id);
    const nextIndex = shuffle ? Math.floor(Math.random() * songs.length) : (index + direction + songs.length) % songs.length;
    playSong(songs[nextIndex]);
  }
  async function refreshAlbums() {
    try { const [all, saved] = await Promise.all([request("/albums"), getToken() ? request("/albums/library/saved") : Promise.resolve({ albums: [] })]); setAlbums(all.albums || []); setSavedAlbums(saved.albums || []); }
    catch (err) { setNotice(err.message); }
  }
  async function toggleAlbumSave(album) {
    if (!user) { setAuthMode("login"); return; }
    try { const result = await request("/albums/" + album._id + "/save", { method: "POST" }); await refreshAlbums(); setNotice(result.saved ? "Album added to Your Library." : "Album removed from Your Library."); }
    catch (err) { setNotice(err.message); }
  }
  async function loadPendingArtists() {
    if (user?.role !== "admin") return;
    try { const data = await request("/admin/artists/pending"); setPendingArtists(data.artists || []); } catch (err) { setNotice(err.message); }
  }
  async function approveArtist(artist) {
    try { await request("/admin/artists/" + artist._id + "/approve", { method: "PATCH" }); setPendingArtists(items => items.filter(item => item._id !== artist._id)); setNotice(artist.artistName + " approved."); }
    catch (err) { setNotice(err.message); }
  }
  async function loadArtistStudio() {
    try { setArtistData(await request("/artist/me")); setShowArtistStudio(true); }
    catch (err) { setNotice(err.message); }
  }
  async function saveArtistProfile(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    try { await request("/artist/profile", { method: "PUT", body: JSON.stringify({ artistName: form.get("artistName"), bio: form.get("bio") }) }); setArtistData(await request("/artist/me")); setNotice("Artist profile saved."); }
    catch (err) { setNotice(err.message); }
  }
  async function attachSongToAlbum(album) {
    if (!selectedStudioSong) { setNotice("Choose a track to add to this album."); return; }
    try { await request("/albums/" + album._id + "/songs", { method: "POST", body: JSON.stringify({ songId: selectedStudioSong }) }); setArtistData(await request("/artist/me")); setSelectedStudioSong(""); setNotice("Track added to " + album.title + "."); }
    catch (err) { setNotice(err.message); }
  }
  async function createArtistAlbum(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    try { await request("/artist/albums", { method: "POST", body: JSON.stringify({ title: form.get("title"), description: form.get("description"), coverUrl: form.get("coverUrl") }) }); event.currentTarget.reset(); setArtistData(await request("/artist/me")); await refreshAlbums(); setNotice("Album created."); }
    catch (err) { setNotice(err.message); }
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
      setLiked(current => data.liked ? [...new Set([...current, songId, ...(song.provider === "audius" ? [song._id] : [])])] : current.filter(id => id !== songId && id !== song._id));
      const refreshed = await request("/users/liked");
      setLikedSongs(refreshed.songs || []);
    } catch (err) { setNotice(err.message); }
  }
  async function createPlaylist(event) {
    event?.preventDefault();
    if (!user) { setAuthMode("login"); return; }
    if (!newPlaylistName.trim()) { setNotice("Enter a playlist name first."); return; }
    try {
      const data = await request("/playlists", { method: "POST", body: JSON.stringify({ name: newPlaylistName.trim() }) });
      setNewPlaylistName(""); setShowCreatePlaylist(false); await loadLibrary();
      setSelectedCollection({ type: "playlist", id: data.playlist._id });
      setNotice("Playlist created in Your Library.");
    } catch (err) { setNotice(err.message); }
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
    localStorage.removeItem("melody_token"); setUser(null); setLiked([]); setLikedSongs([]); setSavedAlbums([]); setPlaylists([]); setSelectedCollection(null); setNotice("Logged out");
  }
  async function uploadSong(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const endpoint = user?.role === "artist" ? "/artist/songs" : "/admin/songs";
    try { await request(endpoint, { method: "POST", body: form }); setShowUpload(false); formElement.reset(); await loadLibrary(); if (user?.role === "artist") setArtistData(await request("/artist/me")); setNotice("Track uploaded successfully"); }
    catch (err) { setNotice(err.message); }
  }

  return <div className={showNowPlaying && activeSong ? "app-shell now-playing-open" : "app-shell"}>
    <aside className="sidebar">
      <a className="brand" href="#"><span className="brand-mark">♫</span> melody</a>
      <nav className="main-nav"><button className="nav-link active"><Home/>Home</button><label className="nav-search"><Search/><input placeholder="Search music" value={query} onChange={e => setQuery(e.target.value)}/></label></nav>
      <section className="library-panel"><div className="library-heading"><span><Library/> Your Library</span><button className="icon-btn" title="Create playlist" onClick={() => user ? setShowCreatePlaylist(v => !v) : setAuthMode("login")}><Plus/></button></div>
        {showCreatePlaylist && <form className="inline-playlist-create" onSubmit={createPlaylist}><input autoFocus maxLength="80" placeholder="Playlist name" value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)}/><button className="primary" type="submit">Create</button></form>}
        <div className="side-playlists">
          {playlists.map(list => <button key={list._id} className={selectedCollection?.id === list._id ? "side-playlist selected" : "side-playlist"} onClick={() => { setSelectedCollection({ type: "playlist", id: list._id }); document.getElementById("selected-collection")?.scrollIntoView({ behavior: "smooth" }); }}><span className="mini-cover">♫</span><span><b>{list.name}</b><small>Playlist · {list.songs.length} tracks</small></span></button>)}
          {user && <button className={selectedCollection?.type === "liked" ? "side-playlist selected" : "side-playlist"} onClick={() => { setSelectedCollection({ type: "liked" }); document.getElementById("selected-collection")?.scrollIntoView({ behavior: "smooth" }); }}><span className="mini-cover liked"><Heart/></span><span><b>Liked Songs</b><small>{liked.length} liked tracks</small></span></button>}
          {!playlists.length && <p className="muted small">Your playlists will appear here.</p>}
        </div>
        <div className="sidebar-bottom"><p>Build your own music space.</p><small>Independent music player project</small></div>
      </section>
    </aside>

    <main className="main-content">
      <header className="topbar"><div className="breadcrumbs"><span>Discover</span><span className="dot">/</span><b>Music</b></div>
        <div className="account-actions">{user ? <>{user.role === "artist" && <button className="outline" onClick={loadArtistStudio}>Artist Studio</button>}{user.role === "artist_pending" && <span className="user-chip">Artist application pending</span>}{isAdmin && <><button className="outline" onClick={() => {loadPendingArtists();setShowApprovals(true);}}>Artist approvals ({pendingArtists.length})</button><button className="outline" onClick={() => setShowUpload(true)}><Upload size={15}/> Upload</button></>}<span className="user-chip">{user.name}{isAdmin && <em>ADMIN</em>}</span><button className="outline" onClick={logout}><LogOut size={16}/> Log out</button></> : <><button className="text-btn" onClick={() => setAuthMode("artist-register")}>Artist account</button><button className="text-btn" onClick={() => setAuthMode("register")}>Sign up</button><button className="primary" onClick={() => setAuthMode("login")}><LogIn size={16}/> Log in</button></>}</div>
      </header>
      <section className="hero"><div><span className="eyebrow">YOUR SOUNDTRACK STARTS HERE</span><h1>Music that moves<br/><span>with you.</span></h1><p>Discover tracks, build playlists and keep your favourites close.</p><button className="primary hero-cta" onClick={() => document.getElementById("music-library")?.scrollIntoView({behavior:"smooth"})}><Play size={17} fill="currentColor"/> Explore music</button></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-disc"><span>♫</span></div><div className="floating-note note-one">♪</div><div className="floating-note note-two">♫</div></div></section>

      {selectedCollection && <section className="section selected-collection" id="selected-collection">
        <div className="section-heading"><div><span className="eyebrow">YOUR MUSIC</span><h2>{selectedCollection.type === "liked" ? "Liked Songs" : selectedCollection.type === "album" ? (albums.find(a => a._id === selectedCollection.id)?.title || savedAlbums.find(a => a._id === selectedCollection.id)?.title || "Album") : playlists.find(p => p._id === selectedCollection.id)?.name || "Your Playlist"}</h2></div><button className="outline" onClick={() => setSelectedCollection(null)}>Back to Home</button></div>
        {(() => { const list = selectedCollection.type === "liked" ? likedSongs : selectedCollection.type === "album" ? (albums.find(a => a._id === selectedCollection.id) || savedAlbums.find(a => a._id === selectedCollection.id))?.songs || [] : playlists.find(p => p._id === selectedCollection.id)?.songs || []; return list.length ? <div className="song-grid">{list.map(song => <article className="song-card" key={song._id}><button className="cover" onClick={() => playSong(song)}>{song.coverUrl ? <img src={song.coverUrl} alt={song.title + " artwork"}/> : <span>♫</span>}<i><Play size={20} fill="currentColor"/></i></button><div className="song-card-meta"><div><b>{song.title}</b><small>{song.artist || "Unknown artist"}</small></div>{selectedCollection.type === "liked" && <button className="like liked" onClick={() => toggleLike(song)} title="Remove from liked songs"><Heart size={18} fill="currentColor"/></button>}</div></article>)}</div> : <div className="empty-state"><div className="empty-icon"><Music2 size={30}/></div><h3>{selectedCollection.type === "liked" ? "No liked songs yet" : "This playlist is empty"}</h3><p>Like a song or add tracks to this playlist and they will appear here.</p></div>; })()}
      </section>}
      <section className="section recommendation-section"><div className="section-heading"><div><span className="eyebrow">A LITTLE MORE TO LOVE</span><h2>Picked for you</h2></div></div>{recommendedTracks.length ? <div className="song-grid">{recommendedTracks.slice(0,6).map(track => <article className="song-card" key={"browse-"+track.id}><button className="cover" onClick={() => playAudius(track)}>{track.artwork ? <img src={track.artwork} alt={track.title + " artwork"}/> : <span>♫</span>}<i><Play size={20} fill="currentColor"/></i></button><div className="song-card-meta"><div><b>{track.title}</b><small>{track.artist}</small></div><button className="icon-btn" title="Add to library" onClick={() => addAudiusToLibrary(track)}><Plus size={17}/></button></div></article>)}</div> : <p className="muted small">Recommendations will appear as the catalogue loads.</p>}</section>
      <section className="section audius-section" id="audius-discovery">
        <div className="section-heading"><div><span className="eyebrow">OPEN MUSIC CATALOGUE</span><h2>Discover on Audius</h2></div><span className="source-pill">POWERED BY AUDIUS</span></div>
        <div className="discover-controls"><input className="discover-input" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && searchAudius()} placeholder="Search songs, artists or genres..."/><button className="primary" onClick={searchAudius} disabled={audiusLoading}>{audiusLoading ? "Searching..." : "Search Audius"}</button></div>
        {audiusTracks.length ? <div className="song-grid audius-grid">{audiusTracks.map(track => <article className="song-card" key={track.id}><button className="cover" onClick={() => playAudius(track)}>{track.artwork ? <img src={track.artwork} alt={track.title + " artwork"}/> : <span>♫</span>}<i><Play size={20} fill="currentColor"/></i></button><div className="song-card-meta"><div><b>{track.title}</b><small>{track.artist}</small></div><button className="icon-btn" title="Add to Melody library" onClick={() => addAudiusToLibrary(track)}><Plus size={18}/></button></div><div className="audius-credit"><a href={track.permalink} target="_blank" rel="noreferrer">View on Audius ↗</a></div></article>)}</div> : <div className="audius-empty">{audiusLoading ? "Looking for tracks..." : "Trending tracks will appear here. Search Audius to find more music."}</div>}
        <p className="audius-note">Music streams from Audius. Availability depends on each creator’s streaming settings. Track pages open on Audius for artist and source details.</p>
      </section>
      <section className="section album-section"><div className="section-heading"><div><span className="eyebrow">FULL RELEASES</span><h2>Albums</h2></div><span className="muted">{savedAlbums.length} saved</span></div>{albums.length ? <div className="playlist-grid">{albums.map(album => <article className="playlist-card album-card" key={album._id}><button className="album-art" onClick={() => setSelectedCollection({type:"album",id:album._id})}>{album.coverUrl ? <img src={album.coverUrl} alt={album.title}/> : <Disc3 size={42}/>}</button><div className="playlist-title"><h3>{album.title}</h3><button className={savedAlbums.some(item => item._id === album._id) ? "like liked" : "like"} title="Save album" onClick={() => toggleAlbumSave(album)}><Heart size={17} fill={savedAlbums.some(item => item._id === album._id) ? "currentColor" : "none"}/></button></div><p>{album.artist?.artistName || album.artist?.name || "Artist"} · {album.songs?.length || 0} tracks</p><button className="outline album-open" onClick={() => setSelectedCollection({type:"album",id:album._id})}>Open album</button></article>)}</div> : <div className="audius-empty">Artist albums will appear here.</div>}</section>
      {savedAlbums.length > 0 && <section className="section"><div className="section-heading"><div><span className="eyebrow">SAVED BY YOU</span><h2>Your Albums</h2></div></div><div className="playlist-grid">{savedAlbums.map(album => <article className="playlist-card album-card" key={"saved-"+album._id}><button className="album-art" onClick={() => setSelectedCollection({type:"album",id:album._id})}>{album.coverUrl ? <img src={album.coverUrl} alt={album.title}/> : <Disc3 size={42}/>}</button><div className="playlist-title"><h3>{album.title}</h3><button className="like liked" onClick={() => toggleAlbumSave(album)}><Heart size={17} fill="currentColor"/></button></div><p>{album.artist?.artistName || album.artist?.name || "Artist"}</p></article>)}</div></section>}
      <section className="section" id="music-library"><div className="section-heading"><div><span className="eyebrow">THE COLLECTION</span><h2>{query ? "Search results" : "Explore tracks"}</h2></div><span className="muted">{filteredSongs.length} tracks</span></div>
        {filteredSongs.length ? <div className="song-grid">{filteredSongs.map(song => <article className="song-card" key={song._id}><button className="cover" onClick={() => playSong(song)}>{song.coverUrl ? <img src={song.coverUrl} alt=""/> : <span>♫</span>}<i><Play size={20} fill="currentColor"/></i></button><div className="song-card-meta"><div><b>{song.title}</b><small>{song.artist || "Unknown artist"}</small></div><button className={liked.includes(song._id) ? "like liked" : "like"} onClick={() => toggleLike(song)} title="Like song"><Heart size={18} fill={liked.includes(song._id) ? "currentColor" : "none"}/></button></div></article>)}</div> : <div className="empty-state"><div className="empty-icon"><Music2 size={30}/></div><h3>{query ? "No matching tracks" : "Your music library is ready"}</h3><p>{query ? "Try another title, artist or album." : "No tracks have been uploaded yet. Sign in as an administrator to add music you have permission to use."}</p>{isAdmin && <button className="primary" onClick={() => setShowUpload(true)}><Upload size={16}/> Upload first track</button>}</div>}
      </section>
      {playlists.length > 0 && <section className="section"><div className="section-heading"><div><span className="eyebrow">MADE BY YOU</span><h2>Your playlists</h2></div></div><div className="playlist-grid">{playlists.map(list => <article className="playlist-card" key={list._id}><div className="playlist-art">♫</div><div className="playlist-title"><h3>{list.name}</h3><button className="icon-btn" title="Delete playlist" onClick={() => deletePlaylist(list)}><X size={15}/></button></div><p>{list.songs.length} tracks</p><div className="playlist-track-list">{list.songs.slice(0,3).map(song => <button key={song._id} onClick={() => playSong(song)}>{song.title}</button>)}</div></article>)}</div></section>}
    </main>

    <footer className="player"><div className="now-playing">{activeSong ? <><div className="now-cover">{activeSong.coverUrl ? <img src={activeSong.coverUrl} alt=""/> : "♫"}</div><div className="now-meta"><b>{activeSong.title}</b><small>{activeSong.artist || "Unknown artist"}</small></div><button className={liked.includes(activeSong._id) ? "like liked" : "like"} onClick={() => toggleLike(activeSong)} title="Like track"><Heart size={17} fill={liked.includes(activeSong._id) ? "currentColor" : "none"}/></button>{user && playlists.length > 0 && <div className="player-playlist-menu"><button className="icon-btn" title="Add to playlist" onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}><Plus size={17}/></button>{showPlaylistMenu && <div className="playlist-popover">{playlists.map(list => <button key={list._id} onClick={() => addToPlaylist(list)}>{list.name}</button>)}</div>}</div>}</> : <span className="muted small">Select a track to start listening</span>}</div>
      <div className="player-center"><div className="player-controls"><button className={shuffle ? "player-icon mode-active" : "player-icon"} onClick={() => setShuffle(v => !v)} title="Shuffle"><Shuffle size={16}/></button><button className="player-icon" onClick={() => stepTrack(-1)} aria-label="Previous"><SkipBack/></button><button className="play-toggle" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause fill="currentColor"/> : <Play fill="currentColor"/>}</button><button className="player-icon" onClick={() => stepTrack(1)} aria-label="Next"><SkipForward/></button><button className={repeatMode !== "off" ? "player-icon mode-active" : "player-icon"} onClick={() => setRepeatMode(v => v === "off" ? "all" : v === "all" ? "one" : "off")} title={"Repeat " + repeatMode}><Repeat size={16}/>{repeatMode === "one" ? "1" : ""}</button></div><div className="timeline"><span>{formatTime(progress)}</span><input aria-label="Seek" type="range" min="0" max={duration || 0} value={Math.min(progress,duration || 0)} onChange={e => { audio.current.currentTime = Number(e.target.value); setProgress(Number(e.target.value)); }}/><span>{formatTime(duration)}</span></div></div>
      <div className="player-volume"><button className="volume-mute" onClick={() => setMuted(v => !v)} title={muted ? "Unmute" : "Mute"}>{muted || volume === 0 ? <VolumeX size={18}/> : <Volume2 size={18}/>}</button><input aria-label="Volume" className="volume-range" type="range" min="0" max="1" step="0.01" value={volume} style={{"--volume": `${(muted ? 0 : volume) * 100}%`}} onChange={e => {setVolume(Number(e.target.value));setMuted(false);}}/></div>
    </footer>
    <audio ref={audio} src={activeSong?.audioUrl || ""} onTimeUpdate={e => setProgress(e.currentTarget.currentTime)} onLoadedMetadata={e => setDuration(e.currentTarget.duration || 0)} onEnded={() => { if (repeatMode === "one") { audio.current.currentTime = 0; audio.current.play(); } else if (repeatMode === "off" && activeSong?.provider !== "audius" && !shuffle && songs.findIndex(song => song._id === activeSong?._id) === songs.length - 1) { setPlaying(false); } else stepTrack(1); }} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}/>
    {showNowPlaying && activeSong && <section className="now-playing-screen" aria-label="Now playing">
      <div className="now-playing-topbar">
        <button className="np-back" onClick={() => setShowNowPlaying(false)}><X size={18}/> Back to browsing</button>
        <span className="np-label">NOW PLAYING</span>
        <span className="np-provider">{activeSong.provider === "audius" ? "AUDIOUS" : "YOUR LIBRARY"}</span>
      </div>
      <div className="now-playing-content">
        <div className="np-art-wrap"><div className="np-art-glow"/><div className="np-art">{activeSong.coverUrl ? <img src={activeSong.coverUrl} alt={activeSong.title + " artwork"}/> : <span>♫</span>}</div></div>
        <div className="np-track-info"><span className="eyebrow">MELODY PLAYER</span><h1>{activeSong.title}</h1><p>{activeSong.artist || "Unknown artist"}</p>
          <div className="np-actions"><button className={liked.includes(activeSong._id) ? "np-like active" : "np-like"} onClick={() => toggleLike(activeSong)}><Heart size={19} fill={liked.includes(activeSong._id) ? "currentColor" : "none"}/> {liked.includes(activeSong._id) ? "Liked" : "Like"}</button>
          {user && playlists.length > 0 && <div className="np-playlist-wrap"><button className="np-like" onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}><Plus size={19}/> Add to playlist</button>{showPlaylistMenu && <div className="np-playlist-popover">{playlists.map(list => <button key={list._id} onClick={() => addToPlaylist(list)}>{list.name}</button>)}</div>}</div>}
          {activeSong.provider === "audius" && activeSong.sourceUrl && <a className="np-source" href={activeSong.sourceUrl} target="_blank" rel="noreferrer">View on Audius ↗</a>}</div>
        </div>
        <div className="np-playback"><div className="np-controls"><button className={shuffle ? "mode-active" : ""} onClick={() => setShuffle(v => !v)} title="Shuffle"><Shuffle size={18}/></button><button onClick={() => stepTrack(-1)} aria-label="Previous track"><SkipBack size={25}/></button><button className="np-main-play" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={27} fill="currentColor"/> : <Play size={27} fill="currentColor"/>}</button><button onClick={() => stepTrack(1)} aria-label="Next track"><SkipForward size={25}/></button><button className={repeatMode !== "off" ? "mode-active" : ""} onClick={() => setRepeatMode(v => v === "off" ? "all" : v === "all" ? "one" : "off")} title={"Repeat " + repeatMode}><Repeat size={18}/><small>{repeatMode === "one" ? "1" : ""}</small></button></div>
          <div className="np-seek"><span>{formatTime(progress)}</span><input aria-label="Track progress" type="range" min="0" max={duration || 0} value={Math.min(progress,duration || 0)} onChange={e => { if (audio.current) audio.current.currentTime = Number(e.target.value); setProgress(Number(e.target.value)); }}/><span>{formatTime(duration)}</span></div>
          <div className="np-volume"><button className="volume-mute" onClick={() => setMuted(v => !v)}>{muted || volume === 0 ? <VolumeX size={18}/> : <Volume2 size={18}/>}</button><input aria-label="Volume" className="volume-range" type="range" min="0" max="1" step="0.01" value={volume} style={{"--volume": `${(muted ? 0 : volume) * 100}%`}} onChange={e => {setVolume(Number(e.target.value));setMuted(false);}}/></div><div className="sleep-control"><Moon size={16}/><label htmlFor="sleep-timer">Sleep timer</label><select id="sleep-timer" value={sleepMinutes} onChange={e => setSleepMinutes(Number(e.target.value))}><option value="0">Off</option><option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option></select></div>{activeSong?.provider !== "audius" && activeSong?.audioUrl?.startsWith("/uploads/") && <a className="download-track" href={activeSong.audioUrl} download><Download size={15}/> Download</a>}
        </div>
        <div className="np-recommendations"><div className="np-rec-heading"><span className="eyebrow">KEEP THE MUSIC GOING</span><h2>Recommended for you</h2><p>More tracks based on the artist you’re listening to.</p></div>
          {recommendedTracks.length ? <div className="np-rec-grid">{recommendedTracks.slice(0,6).map(track => <article className="np-rec-card" key={track.id}><button className="np-rec-cover" onClick={() => playAudius(track)}>{track.artwork ? <img src={track.artwork} alt={track.title + " artwork"}/> : "♫"}<i><Play size={15} fill="currentColor"/></i></button><div><b>{track.title}</b><small>{track.artist}</small></div></article>)}</div> : <p className="muted small">Finding similar tracks…</p>}
        </div>
      </div>
    </section>}
    {showArtistStudio && <div className="overlay"><div className="modal studio-modal"><button className="icon-btn modal-close" onClick={() => setShowArtistStudio(false)}><X/></button><span className="eyebrow">CREATOR SPACE</span><h2>Artist Studio</h2><p className="muted">Manage your artist identity, releases and uploads.</p><form onSubmit={saveArtistProfile}><label>Stage name<input name="artistName" defaultValue={artistData.profile?.artistName || user?.artistName || user?.name || ""} required/></label><label>Artist bio<textarea name="bio" defaultValue={artistData.profile?.bio || ""} rows="3" placeholder="Tell listeners about your music"/></label><button className="primary full" type="submit">Save profile</button></form><div className="studio-stats"><span><b>{artistData.songs?.length || 0}</b><small>Tracks</small></span><span><b>{artistData.albums?.length || 0}</b><small>Albums</small></span></div><button className="outline full" onClick={() => setShowUpload(true)}><Upload size={16}/> Upload a song</button><form onSubmit={createArtistAlbum}><h3>Create an album</h3><label>Album title<input name="title" required placeholder="Album title"/></label><label>Description<input name="description" placeholder="Optional description"/></label><label>Album cover image URL<input name="coverUrl" type="url" placeholder="https://... (optional)"/></label><button className="primary full" type="submit">Create album</button></form><div className="studio-track-list"><b>Your uploaded tracks</b>{(artistData.songs || []).map(song => <p key={song._id}>{song.title} <small>· {song.album}</small></p>)}</div><div className="studio-track-list"><b>Manage album tracklists</b>{(artistData.albums || []).map(album => <div className="album-track-editor" key={album._id}><b>{album.title}</b><small>{album.songs?.length || 0} tracks</small><div className="album-track-add"><select value={selectedStudioSong} onChange={e => setSelectedStudioSong(e.target.value)}><option value="">Choose your uploaded track</option>{(artistData.songs || []).map(song => <option key={song._id} value={song._id}>{song.title}</option>)}</select><button className="primary" onClick={() => attachSongToAlbum(album)}>Add</button></div></div>)}</div></div></div>}
    {showApprovals && <div className="overlay"><div className="modal approvals-modal"><button className="icon-btn modal-close" onClick={() => setShowApprovals(false)}><X/></button><span className="eyebrow">ADMINISTRATION</span><h2>Artist applications</h2><p className="muted">Review applicants before they can publish tracks.</p>{pendingArtists.length ? pendingArtists.map(artist => <div className="approval-row" key={artist._id}><div><b>{artist.artistName || artist.name}</b><small>{artist.email}</small><p>{artist.artistBio || artist.artistApplicationNote || "No artist bio supplied."}</p></div><button className="primary" onClick={() => approveArtist(artist)}><Check size={15}/> Approve</button></div>) : <p className="muted">No pending applications.</p>}</div></div>}
    {notice && <div className="toast">{notice}</div>}
    {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode("")} onSuccess={nextUser => {setUser(nextUser); setAuthMode(""); loadLibrary(); loadProfile(); if (nextUser.role === "artist_pending") setNotice("Artist application submitted. Wait for administrator approval."); if (nextUser.role === "artist") loadArtistStudio(); if (nextUser.role === "admin") loadPendingArtists();}} switchMode={setAuthMode}/>}
    {showUpload && <div className="overlay"><form className="modal upload-modal" onSubmit={uploadSong}><button className="icon-btn modal-close" type="button" onClick={() => setShowUpload(false)}><X/></button><h2>Upload a track</h2><p className="muted">Only upload audio and artwork you own or are licensed to use.</p><label>Song title<input required name="title" placeholder="Track title"/></label><label>Artist<input name="artist" placeholder="Artist name"/></label><label>Album<input name="album" placeholder="Album name"/></label><label>Audio file<input required name="audio" type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg"/></label><label>Cover image (optional)<input name="cover" type="file" accept="image/png,image/jpeg,image/webp"/></label><button className="primary full" type="submit"><Upload size={16}/> Upload track</button></form></div>}
    {(isAdmin || user?.role === "artist") && <button className="admin-fab" onClick={() => setShowUpload(true)}><Upload size={17}/> Add music</button>}
  </div>;
}

export default App;