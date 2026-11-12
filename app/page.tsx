"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Disc3, Headphones, Home, Search, Library, Heart, Play, Pause, SkipBack, SkipForward, Music2, Menu, X, Radio, ListMusic, ExternalLink, LoaderCircle, Settings } from "lucide-react";

type Track = { trackId: number; trackName: string; artistName: string; collectionName?: string; artworkUrl100: string; previewUrl?: string; trackViewUrl: string; primaryGenreName?: string; };
const categories = ["All", "Afrobeats", "Afropop", "Amapiano", "Highlife", "Gospel", "Hip-Hop"];

export default function HomePage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [query, setQuery] = useState("afrobeats");
  const [input, setInput] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);\n  const [playerOpen, setPlayerOpen] = useState(false);\n  const [currentTime, setCurrentTime] = useState(0);\n  const [duration, setDuration] = useState(30);
  const [mobileNav, setMobileNav] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadTracks = useCallback(async (term: string) => {
    setLoading(true); setError("");
    try {
      const response = await fetch("https://itunes.apple.com/search?term=" + encodeURIComponent(term) + "&entity=song&limit=30&country=ng");
      if (!response.ok) throw new Error("Music catalogue is temporarily unavailable.");
      const data = await response.json();
      setTracks((data.results || []).filter((item: Track) => item.trackId && item.trackName && item.artistName));
      if (!data.results?.length) setError("No matching tracks were returned. Try another search.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load music. Check your connection and retry."); setTracks([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTracks(query); }, [query, loadTracks]);
  useEffect(() => {
    const audio = new Audio(); audioRef.current = audio;
    audio.addEventListener("ended", () => setPlaying(false));
    audio.addEventListener("pause", () => setPlaying(false));
    audio.addEventListener("play", () => setPlaying(true));\n    audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));\n    audio.addEventListener("loadedmetadata", () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 30));\n    audio.addEventListener("ended", () => setCurrentTime(0));
    return () => { audio.pause(); audio.src = ""; };
  }, []);

  const playTrack = async (track: Track) => {
    if (!track.previewUrl) return;
    const audio = audioRef.current; if (!audio) return;
    if (current?.trackId === track.trackId && !audio.paused) { audio.pause(); return; }
    if (current?.trackId === track.trackId && audio.paused) { await audio.play(); return; }
    audio.pause(); audio.src = track.previewUrl; setCurrent(track); setCurrentTime(0); setDuration(30);
    try { await audio.play(); } catch { setError("This preview could not be played. Try another track."); }
  };
  const visibleTracks = tracks.filter(t => category === "All" || (t.primaryGenreName || "").toLowerCase().includes(category.toLowerCase()) || t.artistName.toLowerCase().includes(category.toLowerCase()));
  const submitSearch = (e: React.FormEvent) => { e.preventDefault(); if (input.trim()) { setQuery(input.trim()); setCategory("All"); } };
  const featured = tracks.slice(0, 4);\n  const playAdjacent = (direction: -1 | 1) => {\n    if (!current) return;\n    const playable = tracks.filter(t => !!t.previewUrl);\n    if (!playable.length) return;\n    const index = playable.findIndex(t => t.trackId === current.trackId);\n    const next = playable[(index + direction + playable.length) % playable.length];\n    void playTrack(next);\n  };\n  const seek = (value: number) => { if (audioRef.current) { audioRef.current.currentTime = value; setCurrentTime(value); } };\n  const timeLabel = (value: number) => { const safe = Number.isFinite(value) ? Math.max(0, value) : 0; return Math.floor(safe / 60) + ":" + String(Math.floor(safe % 60)).padStart(2, "0"); };

  return <main className="app-shell">
    <aside className={"sidebar " + (mobileNav ? "sidebar-open" : "")}>
      <div className="brand"><span className="brand-mark"><Disc3 size={24}/></span><span>AFRO<span className="brand-accent">VIBEZ</span></span><button className="close-nav" onClick={() => setMobileNav(false)} aria-label="Close menu"><X/></button></div>
      <div className="nav-label">MENU</div>
      <nav>
        <a className="nav-item active" href="#discover" onClick={() => setMobileNav(false)}><Home size={19}/> Discover</a>
        <a className="nav-item" href="#browse" onClick={() => setMobileNav(false)}><Search size={19}/> Browse music</a>
        <a className="nav-item" href="#library" onClick={() => setMobileNav(false)}><Library size={19}/> Your library</a>
        <a className="nav-item" href="/settings" onClick={() => setMobileNav(false)}><Settings size={19}/> Settings</a>
      </nav>
      <div className="sidebar-note"><div className="note-icon"><Headphones size={21}/></div><strong>Your sound. Your roots.</strong><p>Find music, explore artists and preview new sounds.</p></div>
      <div className="sidebar-foot">Music catalogue provided by Apple iTunes Search.<br/>Preview availability varies by track.</div>
    </aside>

    <section className="main-area">
      <header className="topbar"><button className="menu-btn" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu/></button><div className="mobile-brand">AFRO<span>VIBEZ</span></div><form className="searchbar" onSubmit={submitSearch}><Search size={18}/><input value={input} onChange={e => setInput(e.target.value)} placeholder="Search songs, artists, albums..." aria-label="Search music"/><button type="submit">Search</button></form><div className="top-tag"><span className="live-dot"/> MUSIC DISCOVERY</div></header>

      <div className="content" id="discover">
        <section className="hero">
          <div className="hero-copy"><div className="eyebrow"><span/> THE SOUND OF AFRICA</div><h1>Feel the rhythm.<br/><em>Find your vibe.</em></h1><p>Discover Afro-inspired sounds, explore artists and listen to available previews — all in one place.</p><a className="hero-button" href="#browse">Explore music <span>↗</span></a></div>
          <div className="hero-art" aria-hidden="true"><div className="orb orb-one"/><div className="orb orb-two"/><div className="vinyl"><div className="vinyl-label"><Disc3 size={54}/></div></div><div className="sound-wave"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><span className="art-caption">AFRICAN SOUND. GLOBAL VIBE.</span></div>
          <div className="hero-bottom"><span>01 / DISCOVER</span><span>MADE FOR THE RHYTHM</span></div>
        </section>

        <section className="section-block" id="browse"><div className="section-heading"><div><div className="eyebrow dark">CURATED DISCOVERY</div><h2>Explore the sound</h2><p>Real catalogue results. No made-up artists or tracks.</p></div><span className="results-label">{tracks.length} RESULTS</span></div>
          <div className="chips">{categories.map(c => <button key={c} onClick={() => { setCategory(c); if (c !== "All") { setQuery(c.toLowerCase()); setInput(c); } else { setQuery("afrobeats"); setInput(""); } }} className={"chip " + (category === c ? "selected" : "")}>{c}</button>)}</div>
          {error && <div className="notice" role="alert">{error} <button onClick={() => loadTracks(query)}>Retry</button></div>}
          {loading ? <div className="loading"><LoaderCircle className="spin"/> Loading real music catalogue…</div> : visibleTracks.length ? <div className="track-grid">{visibleTracks.map((track, index) => <article className="track-card" key={track.trackId}><div className="cover-wrap"><img src={track.artworkUrl100?.replace("100x100", "400x400")} alt="" loading={index > 7 ? "lazy" : "eager"}/><button className="cover-play" onClick={() => playTrack(track)} disabled={!track.previewUrl} aria-label={track.previewUrl ? "Play preview" : "Preview unavailable"}>{current?.trackId === track.trackId && playing ? <Pause fill="currentColor"/> : <Play fill="currentColor"/>}</button></div><div className="track-info"><strong title={track.trackName}>{track.trackName}</strong><span>{track.artistName}</span><small>{track.primaryGenreName || "Music"}</small></div><button className="more-link" onClick={() => window.open(track.trackViewUrl, "_blank", "noopener,noreferrer")} aria-label="Open track details"><ExternalLink size={15}/></button></article>)}</div> : !error && <div className="empty-state"><Music2 size={30}/><strong>No tracks in this view</strong><span>Try another genre or search for an artist.</span></div>}
        </section>
        <section className="bottom-callout" id="library"><div className="callout-icon"><ListMusic size={23}/></div><div><strong>Your library starts here</strong><p>Personal accounts, saved playlists and downloads will appear when a secure backend is connected. Nothing is being simulated.</p></div><span className="coming-label">NOT CONNECTED</span></section>
        <footer>© {new Date().getFullYear()} AFROVIBEZ <span>Discover. Listen. Feel.</span></footer>
      </div>
    </section>
    {current && <div className="player" role="region" aria-label="Music player">
      <button className="player-open" onClick={() => setPlayerOpen(true)} aria-label="Open full player"><img src={current.artworkUrl100} alt=""/><span className="player-track"><strong>{current.trackName}</strong><span>{current.artistName} · Preview</span></span></button>
      <div className="player-controls"><button onClick={() => playTrack(current)} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause fill="currentColor"/> : <Play fill="currentColor"/>}</button></div>
      <div className="player-progress"><span style={{width: (duration ? Math.min(100, currentTime / duration * 100) : 0) + "%"}}/></div>
      <button className="player-expand" onClick={() => setPlayerOpen(true)} aria-label="Expand player">⌃</button>
      <button className="player-close" onClick={() => { audioRef.current?.pause(); setCurrent(null); setPlayerOpen(false); }} aria-label="Close player"><X size={18}/></button>
    </div>}
    {current && playerOpen && <div className="full-player-backdrop" role="dialog" aria-modal="true" aria-label="Now playing" onClick={() => setPlayerOpen(false)}>
      <section className="full-player" onClick={e => e.stopPropagation()}>
        <header className="full-player-header"><button onClick={() => setPlayerOpen(false)} aria-label="Minimize player"><X/></button><div><small>NOW PLAYING</small><strong>AFROVIBEZ PLAYER</strong></div><span className="full-player-live">PREVIEW</span></header>
        <div className="full-player-art-wrap"><img className="full-player-art" src={current.artworkUrl100?.replace("100x100","600x600")} alt={"Album artwork for " + current.trackName}/></div>
        <div className="full-player-meta"><div><h2>{current.trackName}</h2><p>{current.artistName}</p><span>{current.collectionName || "Single"} · {current.primaryGenreName || "Music"}</span></div><Disc3 size={24}/></div>
        <div className="full-player-timeline"><input aria-label="Seek within preview" type="range" min="0" max={duration || 30} step="0.1" value={Math.min(currentTime, duration || 30)} onChange={e => seek(Number(e.target.value))}/><div><span>{timeLabel(currentTime)}</span><span>-{timeLabel(Math.max(0,(duration || 30)-currentTime))}</span></div></div>
        <div className="full-player-controls"><button onClick={() => playAdjacent(-1)} aria-label="Previous track"><SkipBack size={25} fill="currentColor"/></button><button className="full-play-button" onClick={() => playTrack(current)} aria-label={playing ? "Pause music" : "Play music"}>{playing ? <Pause size={30} fill="currentColor"/> : <Play size={30} fill="currentColor"/>}</button><button onClick={() => playAdjacent(1)} aria-label="Next track"><SkipForward size={25} fill="currentColor"/></button></div>
        <div className="full-player-caption">You are listening to a short catalogue preview. Full-track playback is not connected yet.</div>
      </section>
    </div>}
  </main>;
}