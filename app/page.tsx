"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Disc3, Headphones, Home, Search, Library, Heart, Play, Pause, SkipBack, SkipForward,
  Music2, Menu, X, ListMusic, ExternalLink, LoaderCircle, Settings, TrendingUp,
  Share2, Plus, BarChart3, MoreVertical, ListPlus, Radio, Info, UserPlus, ListOrdered,
  Link2, MessageCircle, Send, Copy, Volume2, Repeat, Shuffle, Album
} from "lucide-react";

type Track = {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100: string;
  previewUrl?: string;
  trackViewUrl: string;
  primaryGenreName?: string;
};

type View = "discover" | "charts" | "library" | "queue";

const categories = ["All", "Afrobeats", "Afropop", "Amapiano", "Highlife", "Gospel", "Hip-Hop"];

const sectionsConfig = [
  { id: "trending", title: "Trending in Nigeria", subtitle: "What people are playing right now", term: "afrobeats nigeria" },
  { id: "afrobeats", title: "Afrobeats Essentials", subtitle: "The sound that moved the world", term: "afrobeats" },
  { id: "amapiano", title: "Amapiano Heat", subtitle: "Log drums and soulful keys", term: "amapiano" },
  { id: "fresh", title: "Fresh Finds", subtitle: "New and rising Afro sounds", term: "afropop 2024" },
];

export default function HomePage() {
  const [view, setView] = useState<View>("discover");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [sectionTracks, setSectionTracks] = useState<Record<string, Track[]>>({});
  const [charts, setCharts] = useState<Track[]>([]);
  const [query, setQuery] = useState("afrobeats");
  const [input, setInput] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [volume, setVolume] = useState(0.85);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const shuffleRef = useRef(false);
  const repeatRef = useRef(false);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [mobileNav, setMobileNav] = useState(false);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<{id:string;name:string;tracks:Track[]}[]>([]);
  const [followedArtists, setFollowedArtists] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchTracks = useCallback(async (term: string, limit = 24) => {
    const response = await fetch(
      "https://itunes.apple.com/search?term=" +
        encodeURIComponent(term) +
        "&entity=song&limit=" + limit + "&country=ng"
    );
    if (!response.ok) throw new Error("Music catalogue is temporarily unavailable.");
    const data = await response.json();
    return (data.results || []).filter(
      (item: Track) => item.trackId && item.trackName && item.artistName
    ) as Track[];
  }, []);

  const loadTracks = useCallback(
    async (term: string) => {
      setLoading(true);
      setError("");
      try {
        const results = await fetchTracks(term, 30);
        setTracks(results);
        if (!results.length) setError("No matching tracks were returned. Try another search.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load music. Check your connection and retry.");
        setTracks([]);
      } finally {
        setLoading(false);
      }
    },
    [fetchTracks]
  );

  const loadSections = useCallback(async () => {
    setSectionsLoading(true);
    try {
      const entries = await Promise.all(
        sectionsConfig.map(async (s) => {
          try {
            const list = await fetchTracks(s.term, 12);
            return [s.id, list] as [string, Track[]];
          } catch {
            return [s.id, [] as Track[]] as [string, Track[]];
          }
        })
      );
      const map: Record<string, Track[]> = {};
      entries.forEach(([id, list]) => {
        map[id] = list;
      });
      setSectionTracks(map);
    } finally {
      setSectionsLoading(false);
    }
  }, [fetchTracks]);

  const loadCharts = useCallback(async () => {
    setChartsLoading(true);
    try {
      const list = await fetchTracks("afrobeats nigeria top", 25);
      setCharts(list);
    } catch {
      setCharts([]);
    } finally {
      setChartsLoading(false);
    }
  }, [fetchTracks]);

  useEffect(() => {
    try {
      setLiked(new Set(JSON.parse(localStorage.getItem("afrovibez.likes.v1") || "[]")));
      setQueue(JSON.parse(localStorage.getItem("afrovibez.queue.v1") || "[]"));
      setPlaylists(JSON.parse(localStorage.getItem("afrovibez.playlists.v1") || "[]"));
      setFollowedArtists(JSON.parse(localStorage.getItem("afrovibez.follows.v1") || "[]"));
    } catch { /* Ignore malformed local preferences. */ }
    finally { setStorageReady(true); }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      localStorage.setItem("afrovibez.likes.v1", JSON.stringify(Array.from(liked)));
      localStorage.setItem("afrovibez.queue.v1", JSON.stringify(queue));
      localStorage.setItem("afrovibez.playlists.v1", JSON.stringify(playlists));
      localStorage.setItem("afrovibez.follows.v1", JSON.stringify(followedArtists));
    } catch { setToast("Browser storage is full; some changes may not persist."); }
  }, [liked, queue, playlists, followedArtists, storageReady]);

  useEffect(() => {
    loadTracks(query);
  }, [query, loadTracks]);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  useEffect(() => {
    if (view === "charts" && charts.length === 0) loadCharts();
  }, [view, charts.length, loadCharts]);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.volume = 0.85;
    audio.addEventListener("ended", () => {
      if (repeatRef.current) {
        audio.currentTime = 0;
        void audio.play().catch(() => setToast("This preview could not be replayed."));
        return;
      }
      setPlaying(false);
      setCurrentTime(0);
      try {
        const prefs = JSON.parse(localStorage.getItem("afrovibez.preferences.v1") || "{}");
        const nextQueue = JSON.parse(localStorage.getItem("afrovibez.queue.v1") || "[]") as Track[];
        if (prefs.autoplay && nextQueue.length && nextQueue[0].previewUrl) {
          const next = nextQueue[0];
          setQueue(items => items.slice(1));
          setCurrent(next);
          audio.src = next.previewUrl!;
          void audio.play().catch(() => setToast("The next preview could not be played."));
        }
      } catch { /* Keep playback stable if saved preferences are invalid. */ }
    });
    audio.addEventListener("pause", () => setPlaying(false));
    audio.addEventListener("play", () => setPlaying(true));
    audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
    audio.addEventListener("loadedmetadata", () =>
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 30)
    );
    audio.addEventListener("ended", () => setCurrentTime(0));
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const playTrack = async (track: Track) => {
    if (!track.previewUrl) return;
    const audio = audioRef.current;
    if (!audio) return;
    if (current?.trackId === track.trackId && !audio.paused) {
      audio.pause();
      return;
    }
    if (current?.trackId === track.trackId && audio.paused) {
      await audio.play();
      return;
    }
    audio.pause();
    audio.src = track.previewUrl;
    setCurrent(track);
    setCurrentTime(0);
    setDuration(30);
    try {
      await audio.play();
    } catch {
      setError("This preview could not be played. Try another track.");
    }
  };

  const notify = (message:string) => { setToast(message); window.setTimeout(()=>setToast(""),2500); };
  const addToQueue = (track:Track, next=false) => {
    setQueue(items => next ? [track,...items.filter(t=>t.trackId!==track.trackId)] : [...items.filter(t=>t.trackId!==track.trackId),track]);
    setMenuTrack(null); notify(next ? "Added to play next." : "Added to queue.");
  };
  const addToPlaylist = (track:Track) => {
    const name=window.prompt("Name your playlist");
    if(!name?.trim()) return;
    setPlaylists(items=>{const found=items.find(p=>p.name.toLowerCase()===name.trim().toLowerCase());return found?items.map(p=>p.id===found.id?{...p,tracks:[...p.tracks.filter(t=>t.trackId!==track.trackId),track]}:p):[...items,{id:String(Date.now()),name:name.trim(),tracks:[track]}];});
    setMenuTrack(null);notify("Playlist saved on this device.");
  };
  const toggleLike = (id: number) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const shareTrack = async (track: Track) => {
    const text = `${track.trackName} — ${track.artistName}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: track.trackName, text, url: track.trackViewUrl });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(track.trackViewUrl);
        setError("Link copied to clipboard");
        setTimeout(() => setError(""), 2000);
      } catch {}
    }
  };

  const shareShortcut = async (track: Track, destination: "copy" | "whatsapp" | "text" | "facebook") => {
    const message = encodeURIComponent(`${track.trackName} — ${track.artistName} ${track.trackViewUrl}`);
    try {
      if (destination === "copy") {
        await navigator.clipboard.writeText(track.trackViewUrl);
        notify("Track link copied.");
      } else if (destination === "whatsapp") {
        window.open("https://wa.me/?text=" + message, "_blank", "noopener,noreferrer");
      } else if (destination === "text") {
        window.location.href = "sms:?&body=" + message;
      } else {
        window.open("https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(track.trackViewUrl), "_blank", "noopener,noreferrer");
      }
    } catch {
      notify("Sharing is unavailable in this browser.");
    }
  };

  const visibleTracks = tracks.filter(
    (t) =>
      category === "All" ||
      (t.primaryGenreName || "").toLowerCase().includes(category.toLowerCase()) ||
      t.artistName.toLowerCase().includes(category.toLowerCase())
  );

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      setQuery(input.trim());
      setCategory("All");
      setView("discover");
    }
  };

  const playAdjacent = (direction: -1 | 1) => {
    if (!current) return;
    const playable = (view === "charts" ? charts : tracks).filter((t) => !!t.previewUrl);
    if (!playable.length) return;
    if (shuffleRef.current && direction > 0) {
      const choices = playable.filter(t => t.trackId !== current.trackId);
      if (choices.length) void playTrack(choices[Math.floor(Math.random() * choices.length)]);
      return;
    }
    const index = playable.findIndex((t) => t.trackId === current.trackId);
    const nextIndex = index < 0 ? (direction > 0 ? 0 : playable.length - 1) : (index + direction + playable.length) % playable.length;
    void playTrack(playable[nextIndex]);
  };

  const seek = (value: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const timeLabel = (value: number) => {
    const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
    return Math.floor(safe / 60) + ":" + String(Math.floor(safe % 60)).padStart(2, "0");
  };

  const TrackCard = ({ track, index = 0 }: { track: Track; index?: number }) => (
    <article className="track-card">
      <div className="cover-wrap">
        <img
          src={track.artworkUrl100?.replace("100x100", "400x400")}
          alt=""
          loading={index > 6 ? "lazy" : "eager"}
        />
        <button
          className="cover-play"
          onClick={() => playTrack(track)}
          disabled={!track.previewUrl}
          aria-label={track.previewUrl ? "Play preview" : "Preview unavailable"}
        >
          {current?.trackId === track.trackId && playing ? (
            <Pause fill="currentColor" size={18} />
          ) : (
            <Play fill="currentColor" size={18} />
          )}
        </button>
      </div>
      <div className="track-info">
        <strong title={track.trackName}>{track.trackName}</strong>
        <span>{track.artistName}</span>
        <small>{track.primaryGenreName || "Music"}</small>
      </div>
      <div className="track-actions">
        <button
          className={"icon-btn " + (liked.has(track.trackId) ? "liked" : "")}
          onClick={() => toggleLike(track.trackId)}
          aria-label="Like"
        >
          <Heart size={15} fill={liked.has(track.trackId) ? "currentColor" : "none"} />
        </button>
        <button className="icon-btn" onClick={() => setMenuTrack(track)} aria-label="More track options"><MoreVertical size={17}/></button>
      </div>
    </article>
  );

  const HorizontalRow = ({ title, subtitle, list, loading: isLoading }: { title: string; subtitle: string; list: Track[]; loading?: boolean }) => (
    <section className="music-row">
      <div className="row-heading">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <span className="row-count">{list.length} tracks</span>
      </div>
      {isLoading ? (
        <div className="row-loading"><LoaderCircle className="spin" size={20} /> Loading…</div>
      ) : list.length ? (
        <div className="row-scroll">
          {list.map((track, i) => (
            <article className="row-card" key={track.trackId}>
              <div className="row-cover">
                <img src={track.artworkUrl100?.replace("100x100", "300x300")} alt="" loading="lazy" />
                <button
                  className="row-play"
                  onClick={() => playTrack(track)}
                  disabled={!track.previewUrl}
                  aria-label="Play"
                >
                  {current?.trackId === track.trackId && playing ? (
                    <Pause fill="currentColor" size={16} />
                  ) : (
                    <Play fill="currentColor" size={16} />
                  )}
                </button>
              </div>
              <strong title={track.trackName}>{track.trackName}</strong>
              <span>{track.artistName}</span>
            </article>
          ))}
        </div>
      ) : (
        <div className="row-empty">No tracks available for this section right now.</div>
      )}
    </section>
  );

  return (
    <main className="app-shell">
      <aside className={"sidebar " + (mobileNav ? "sidebar-open" : "")}>
        <div className="brand">
          <span className="brand-mark"><Disc3 size={24} /></span>
          <span>AFRO<span className="brand-accent">VIBEZ</span></span>
          <button className="close-nav" onClick={() => setMobileNav(false)} aria-label="Close menu"><X /></button>
        </div>
        <div className="nav-label">MENU</div>
        <nav>
          <button
            className={"nav-item " + (view === "discover" ? "active" : "")}
            onClick={() => { setView("discover"); setMobileNav(false); }}
          >
            <Home size={19} /> Discover
          </button>
          <button
            className={"nav-item " + (view === "charts" ? "active" : "")}
            onClick={() => { setView("charts"); setMobileNav(false); }}
          >
            <BarChart3 size={19} /> Charts
          </button>
          <button
            className={"nav-item " + (view === "library" ? "active" : "")}
            onClick={() => { setView("library"); setMobileNav(false); }}
          >
            <Library size={19} /> Your library
          </button>
          <button className={"nav-item " + (view==="queue"?"active":"")} onClick={()=>{setView("queue");setMobileNav(false);}}><ListOrdered size={19}/> Your queue</button>
          <a className="nav-item" href="/settings" onClick={() => setMobileNav(false)}>
            <Settings size={19} /> Settings
          </a>
        </nav>
        <div className="sidebar-note">
          <div className="note-icon"><Headphones size={21} /></div>
          <strong>Your sound. Your roots.</strong>
          <p>Discover Afro-inspired music and listen to available previews.</p>
        </div>
        <div className="sidebar-foot">
          Music catalogue provided by Apple iTunes Search.<br />
          Previews only — full streaming not connected yet.
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu /></button>
          <div className="mobile-brand">AFRO<span>VIBEZ</span></div>
          <form className="searchbar" onSubmit={submitSearch}>
            <Search size={18} />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search songs, artists, albums…"
              aria-label="Search music"
            />
            <button type="submit">Search</button>
          </form>
          <div className="top-tag"><span className="live-dot" /> LIVE CATALOGUE</div>
        </header>

        <div className="content">
          {view === "discover" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <div className="eyebrow"><span /> THE SOUND OF AFRICA</div>
                  <h1>Feel the rhythm.<br /><em>Find your vibe.</em></h1>
                  <p>Discover Afro-inspired sounds, explore artists and listen to available previews — all in one place.</p>
                  <a className="hero-button" href="#browse">Explore music <span>↗</span></a>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orb orb-one" />
                  <div className="orb orb-two" />
                  <div className="vinyl"><div className="vinyl-label"><Disc3 size={54} /></div></div>
                  <div className="sound-wave"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
                  <span className="art-caption">AFRICAN SOUND. GLOBAL VIBE.</span>
                </div>
                <div className="hero-bottom"><span>01 / DISCOVER</span><span>MADE FOR THE RHYTHM</span></div>
              </section>

              {sectionsConfig.map((s) => (
                <HorizontalRow
                  key={s.id}
                  title={s.title}
                  subtitle={s.subtitle}
                  list={sectionTracks[s.id] || []}
                  loading={sectionsLoading}
                />
              ))}

              <section className="section-block" id="browse">
                <div className="section-heading">
                  <div>
                    <div className="eyebrow dark">BROWSE ALL</div>
                    <h2>Explore the catalogue</h2>
                    <p>Real results from Apple’s music catalogue. Nothing is simulated.</p>
                  </div>
                  <span className="results-label">{visibleTracks.length} RESULTS</span>
                </div>
                <div className="chips">
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setCategory(c);
                        if (c !== "All") {
                          setQuery(c.toLowerCase());
                          setInput(c);
                        } else {
                          setQuery("afrobeats");
                          setInput("");
                        }
                      }}
                      className={"chip " + (category === c ? "selected" : "")}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                {error && (
                  <div className="notice" role="alert">
                    {error} <button onClick={() => loadTracks(query)}>Retry</button>
                  </div>
                )}
                {loading ? (
                  <div className="loading"><LoaderCircle className="spin" /> Loading real music catalogue…</div>
                ) : visibleTracks.length ? (
                  <div className="track-grid">
                    {visibleTracks.map((track, index) => (
                      <TrackCard key={track.trackId} track={track} index={index} />
                    ))}
                  </div>
                ) : (
                  !error && (
                    <div className="empty-state">
                      <Music2 size={30} />
                      <strong>No tracks in this view</strong>
                      <span>Try another genre or search for an artist.</span>
                    </div>
                  )
                )}
              </section>
            </>
          )}

          {view === "charts" && (
            <section className="charts-view">
              <div className="charts-header">
                <div className="eyebrow dark">NIGERIA</div>
                <h1>Top Charts</h1>
                <p>Ranked by current catalogue popularity. Previews only.</p>
              </div>
              {chartsLoading ? (
                <div className="loading"><LoaderCircle className="spin" /> Loading charts…</div>
              ) : charts.length ? (
                <div className="charts-list">
                  {charts.map((track, i) => (
                    <article className="chart-row" key={track.trackId}>
                      <span className="rank">{i + 1}</span>
                      <div className="chart-cover">
                        <img src={track.artworkUrl100?.replace("100x100", "200x200")} alt="" />
                        <button
                          className="chart-play"
                          onClick={() => playTrack(track)}
                          disabled={!track.previewUrl}
                        >
                          {current?.trackId === track.trackId && playing ? (
                            <Pause fill="currentColor" size={14} />
                          ) : (
                            <Play fill="currentColor" size={14} />
                          )}
                        </button>
                      </div>
                      <div className="chart-info">
                        <strong>{track.trackName}</strong>
                        <span>{track.artistName}</span>
                      </div>
                      <button
                        className={"icon-btn " + (liked.has(track.trackId) ? "liked" : "")}
                        onClick={() => toggleLike(track.trackId)}
                      >
                        <Heart size={16} fill={liked.has(track.trackId) ? "currentColor" : "none"} />
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <TrendingUp size={28} />
                  <strong>Charts unavailable</strong>
                  <span>Try again in a moment.</span>
                </div>
              )}
            </section>
          )}

          {view === "queue" && (
            <section className="library-view"><div className="section-heading"><div><div className="eyebrow dark">UP NEXT</div><h2>Your queue</h2><p>{queue.length} tracks waiting.</p></div></div>
              {queue.length ? <div className="charts-list">{queue.map((t,i)=><article className="chart-row" key={t.trackId}><span className="rank">{i+1}</span><div className="chart-cover"><img src={t.artworkUrl100} alt=""/></div><div className="chart-info"><strong>{t.trackName}</strong><span>{t.artistName}</span></div><button className="icon-btn" onClick={()=>void playTrack(t)}><Play size={16}/></button><button className="icon-btn" onClick={()=>setQueue(q=>q.filter(x=>x.trackId!==t.trackId))}><X size={16}/></button></article>)}</div>:<div className="bottom-callout"><strong>Your queue is empty</strong><p>Use a song’s options menu to add tracks.</p></div>}
            </section>
          )}

          {view === "library" && (
            <section className="library-view">
              <div className="section-heading">
                <div>
                  <div className="eyebrow dark">YOUR SPACE</div>
                  <h2>Your library</h2>
                  <p>Liked tracks and personal collections will live here.</p>
                </div>
              </div>
              {liked.size > 0 ? (
                <div className="track-grid">
                  {tracks.concat(charts).filter((t) => liked.has(t.trackId)).map((track) => (
                    <TrackCard key={track.trackId} track={track} />
                  ))}
                </div>
              ) : (
                <div className="bottom-callout">
                  <div className="callout-icon"><ListMusic size={23} /></div>
                  <div>
                    <strong>Nothing saved yet</strong>
                    <p>Tap the heart on any track to start building your library. Full accounts, playlists and downloads will arrive when the backend is connected.</p>
                  </div>
                  <span className="coming-label">LOCAL ONLY</span>
                </div>
              )}
            </section>
          )}

          <footer>© {new Date().getFullYear()} AFROVIBEZ <span>Discover. Listen. Feel.</span></footer>
        </div>
      </section>

      {current && (
        <div className="player" role="region" aria-label="Music player">
          <button className="player-open" onClick={() => setPlayerOpen(true)} aria-label="Open full player">
            <img src={current.artworkUrl100} alt="" />
            <span className="player-track">
              <strong>{current.trackName}</strong>
              <span>{current.artistName} · Preview</span>
            </span>
          </button>
          <div className="player-controls">
            <button onClick={() => playTrack(current)} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
            </button>
          </div>
          <div className="player-progress">
            <span style={{ width: (duration ? Math.min(100, (currentTime / duration) * 100) : 0) + "%" }} />
          </div>
          <button className="player-expand" onClick={() => setPlayerOpen(true)} aria-label="Expand player">⌃</button>
          <button
            className="player-close"
            onClick={() => {
              audioRef.current?.pause();
              setCurrent(null);
              setPlayerOpen(false);
            }}
            aria-label="Close player"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {toast && <div className="af-toast" role="status">{toast}</div>}
      {menuTrack && <div className="track-menu-backdrop" onClick={()=>setMenuTrack(null)}><section className="track-menu-sheet" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}>
        <div className="sheet-grip"/><button className="sheet-close" onClick={()=>setMenuTrack(null)}><X/></button>
        <div className="sheet-track"><img src={menuTrack.artworkUrl100} alt=""/><div><span>{menuTrack.artistName}</span><strong>{menuTrack.trackName}</strong></div></div>
        <div className="share-shortcuts"><button onClick={()=>{void shareShortcut(menuTrack,"copy");setMenuTrack(null);}}><Link2/><span>Copy Link</span></button><button onClick={()=>void shareTrack(menuTrack)}><Send/><span>Share</span></button><button onClick={()=>void shareShortcut(menuTrack,"whatsapp")}><MessageCircle/><span>WhatsApp</span></button><button onClick={()=>void shareShortcut(menuTrack,"text")}><Copy/><span>Via Text</span></button><button onClick={()=>void shareShortcut(menuTrack,"facebook")}><span className="facebook-mark">f</span><span>Facebook</span></button></div>
        <div className="track-menu-actions">
          <button onClick={()=>{setFollowedArtists(a=>a.includes(menuTrack.artistName)?a.filter(x=>x!==menuTrack.artistName):[...a,menuTrack.artistName]);setMenuTrack(null);notify("Artist follow preference saved on this device.");}}><UserPlus/> More from Artist · {followedArtists.includes(menuTrack.artistName)?"Following":"Follow"}</button>
          <button onClick={()=>addToQueue(menuTrack,true)}><ListPlus/> Play Next</button><button onClick={()=>addToQueue(menuTrack)}><ListOrdered/> Add to Queue</button>
          <button onClick={()=>{toggleLike(menuTrack.trackId);setMenuTrack(null);}}><Heart/> {liked.has(menuTrack.trackId)?"Unlike":"Like"}</button>
          <button onClick={()=>addToPlaylist(menuTrack)}><Plus/> Add to Playlist</button>
          <button onClick={()=>{setQuery(menuTrack.artistName);setInput(menuTrack.artistName);setView("discover");setMenuTrack(null);}}><Radio/> See similar songs</button><button onClick={()=>{setQuery(menuTrack.artistName);setInput(menuTrack.artistName);setView("discover");setMenuTrack(null);}}><Album/> More from {menuTrack.artistName}</button>
          <button onClick={()=>{window.open(menuTrack.trackViewUrl,"_blank","noopener,noreferrer");setMenuTrack(null);}}><Info/> More Info / Catalogue listing</button>
        </div><p className="local-only-note">Your likes, follows, playlists and queue are saved on this device. Shared social feeds, comments and licensed downloads need connected services.</p>
      </section></div>}
      {current && playerOpen && (
        <div
          className="full-player-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Now playing"
          onClick={() => setPlayerOpen(false)}
        >
          <section className="full-player" onClick={(e) => e.stopPropagation()}>
            <header className="full-player-header">
              <button onClick={() => setPlayerOpen(false)} aria-label="Minimize player"><X /></button>
              <div>
                <small>NOW PLAYING</small>
                <strong>AFROVIBEZ PLAYER</strong>
              </div>
              <span className="full-player-live">PREVIEW</span>
            </header>
            <div className="full-player-art-wrap">
              <img
                className="full-player-art"
                src={current.artworkUrl100?.replace("100x100", "600x600")}
                alt={"Album artwork for " + current.trackName}
              />
            </div>
            <div className="full-player-meta">
              <div>
                <h2>{current.trackName}</h2>
                <p>{current.artistName}</p>
                <span>{current.collectionName || "Single"} · {current.primaryGenreName || "Music"}</span>
              </div>
              <Disc3 size={24} />
            </div>
            <div className="full-player-timeline">
              <input
                aria-label="Seek within preview"
                type="range"
                min={0}
                max={duration || 30}
                step={0.1}
                value={Math.min(currentTime, duration || 30)}
                onChange={(e) => seek(Number(e.target.value))}
              />
              <div>
                <span>{timeLabel(currentTime)}</span>
                <span>-{timeLabel(Math.max(0, (duration || 30) - currentTime))}</span>
              </div>
            </div>
            <div className="full-player-controls">
              <button onClick={() => playAdjacent(-1)} aria-label="Previous track">
                <SkipBack size={25} fill="currentColor" />
              </button>
              <button
                className="full-play-button"
                onClick={() => playTrack(current)}
                aria-label={playing ? "Pause music" : "Play music"}
              >
                {playing ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" />}
              </button>
              <button onClick={() => playAdjacent(1)} aria-label="Next track">
                <SkipForward size={25} fill="currentColor" />
              </button>
            </div>
            <div className="full-player-tools" aria-label="Playback options">
              <button className={"tool-btn " + (shuffleEnabled ? "is-active" : "")} onClick={() => {const next=!shuffleEnabled;shuffleRef.current=next;setShuffleEnabled(next);}} aria-pressed={shuffleEnabled}><Shuffle/><span>Shuffle</span></button>
              <button className="tool-btn" onClick={() => addToQueue(current)}><ListPlus/><span>Queue</span></button>
              <button className={"tool-btn " + (repeatEnabled ? "is-active" : "")} onClick={() => {const next=!repeatEnabled;repeatRef.current=next;setRepeatEnabled(next);}} aria-pressed={repeatEnabled}><Repeat/><span>Repeat</span></button>
              <label className="volume-control"><Volume2/><input aria-label="Volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={e=>{const next=Number(e.target.value);setVolume(next);if(audioRef.current)audioRef.current.volume=next;}}/></label>
            </div>
            <div className="player-actions">
              <button className={"action-btn " + (liked.has(current.trackId) ? "liked" : "")} onClick={() => toggleLike(current.trackId)}><Heart size={19} fill={liked.has(current.trackId) ? "currentColor" : "none"}/><span>{liked.has(current.trackId)?"Liked":"Like"}</span></button>
              <button className="action-btn" onClick={() => shareTrack(current)}><Share2 size={19}/><span>Share</span></button>
              <button className="action-btn" onClick={() => addToQueue(current)}><ListPlus size={19}/><span>Queue</span></button>
              <button className="action-btn" onClick={() => addToPlaylist(current)}><Plus size={19}/><span>Playlist</span></button>
              <button className="action-btn" onClick={() => setMenuTrack(current)}><MoreVertical size={19}/><span>More</span></button>
            </div>
            <div className="full-player-caption">
              You are listening to a short catalogue preview. Full-track playback is not connected yet.
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
