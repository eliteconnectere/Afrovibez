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
  const [playing, setPlaying] = useState(false);
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
    audio.addEventListener("play", () => setPlaying(true));
    return () => { audio.pause(); audio.src = ""; };
  }, []);

  const playTrack = async (track: Track) => {
    if (!track.previewUrl) return;
    const audio = audioRef.current; if (!audio) return;
    if (current?.trackId === track.trackId && !audio.paused) { audio.pause(); return; }
    if (current?.trackId === track.trackId && audio.paused) { await audio.play(); return; }
    audio.pause(); audio.src = track.previewUrl; setCurrent(track);
    try { await audio.play(); } catch { setError("This preview could not be played. Try another track."); }
  };
  const visibleTracks = tracks.filter(t => category === "All" || (t.primaryGenreName || "").toLowerCase().includes(category.toLowerCase()) || t.artistName.toLowerCase().includes(category.toLowerCase()));
  const submitSearch = (e: React.FormEvent) => { e.preventDefault(); if (input.trim()) { setQuery(input.trim()); setCategory("All"); } };
  const featured = tracks.slice(0, 4);

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
    {current && <div className="player"><img src={current.artworkUrl100} alt=""/><div className="player-track"><strong>{current.trackName}</strong><span>{current.artistName} · 30-second preview</span></div><div className="player-controls"><button onClick={() => playTrack(current)} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause fill="currentColor"/> : <Play fill="currentColor"/>}</button></div><div className="player-progress"><span className={playing ? "progress-active" : ""}/></div><button className="player-close" onClick={() => { audioRef.current?.pause(); setCurrent(null); }} aria-label="Close player"><X size={18}/></button></div>}
  </main>;
}