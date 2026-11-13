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
  trackExplicitness?: string;
  contentAdvisoryRating?: string;
  source?: "studio" | "apple";
};

type View = "discover" | "charts" | "library" | "queue";

const categories = ["All", "Afrobeats", "Afropop", "Amapiano", "Highlife", "Gospel", "Hip-Hop"];

const sectionsConfig: { id: string; title: string; subtitle: string; term: string }[] = [];

export default function HomePage() {
  const [view, setView] = useState<View>("discover");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [studioTracks, setStudioTracks] = useState<Track[]>([]);
  const [sectionTracks, setSectionTracks] = useState<Record<string, Track[]>>({});
  const [charts, setCharts] = useState<Track[]>([]);
  const [query, setQuery] = useState("");
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
  const [duration, setDuration] = useState(0);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [audioMode, setAudioMode] = useState<"normal"|"sped"|"slowed"|"nightcore"|"daycore">("normal");
  const [keepAudioMode, setKeepAudioMode] = useState(false);
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
  const [highQualityArtwork, setHighQualityArtwork] = useState(true);
  const [showExplicitContent, setShowExplicitContent] = useState(true);
  const catalogueRef = useRef<Track[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackIdRef = useRef<number | null>(null);

  // No third-party catalogue: AfroVibez only plays full-length artist uploads.
  const fetchTracks = useCallback(async (_term: string, _limit = 24) => [] as Track[], []);
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
      setLiked(new Set());
      setQueue((JSON.parse(localStorage.getItem("afrovibez.queue.v1") || "[]") as Track[]).filter(t => t.source === "studio"));
      setPlaylists((JSON.parse(localStorage.getItem("afrovibez.playlists.v1") || "[]") as {id:string;name:string;tracks:Track[]}[]).map(p => ({...p, tracks:p.tracks.filter(t => t.source === "studio")})));
      setFollowedArtists([]);
      const preferences = JSON.parse(localStorage.getItem("afrovibez.preferences.v1") || "{}");
      setHighQualityArtwork(preferences.highQuality !== false);
      setShowExplicitContent(preferences.explicitContent !== false);
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
    try {
      const saved = JSON.parse(localStorage.getItem("afrovibez.preferences.v1") || "{}");
      document.documentElement.dataset.theme = saved.theme === "dark" ? "dark" : "light";
    } catch {
      document.documentElement.dataset.theme = "light";
    }
  }, []);

  useEffect(() => {
    catalogueRef.current = [...studioTracks, ...tracks, ...charts, ...Object.values(sectionTracks).flat()]
      .filter((track, index, all) => all.findIndex(item => item.trackId === track.trackId) === index);
  }, [tracks, studioTracks, charts, sectionTracks]);

  useEffect(() => {
    const stay = localStorage.getItem("afrovibez.keepAudioMode") === "true";
    setKeepAudioMode(stay);
  }, []);

  useEffect(() => {
    loadTracks(query);
  }, [query, loadTracks]);

  useEffect(() => {
    const loadStudioCatalogue = async () => {
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!base || !key) return;
      try {
        const now = new Date();
        const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const response = await fetch(`${base}/rest/v1/studio_tracks?select=id,artist_id,title,genre,language,audio_path,artwork_path,explicit_content,release_type,release_date&status=eq.approved&release_date=lte.${localToday}&order=approved_at.desc.nullslast`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
        if (!response.ok) throw new Error("Published AfroVibe releases are temporarily unavailable.");
        const rows = await response.json();
        const artistIds = Array.from(new Set((rows || []).map((row: any) => row.artist_id)));
        const artistResponse = artistIds.length ? await fetch(`${base}/rest/v1/studio_artist_public?select=id,stage_name&id=in.(${artistIds.join(",")})`, { headers: { apikey: key, Authorization: `Bearer ${key}` } }) : null;
        const artistRows = artistResponse?.ok ? await artistResponse.json() : [];
        const artistNames = new Map<string, string>((artistRows || []).map((artist: any) => [artist.id, artist.stage_name] as [string, string]));
        const signed = await Promise.all((rows || []).map(async (row: any) => {
          const sign = async (bucket: string, path: string) => {
            const encoded = path.split("/").map(encodeURIComponent).join("/");
            const result = await fetch(`${base}/storage/v1/object/sign/${bucket}/${encoded}`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: 3600 }) });
            if (!result.ok) return "";
            const data = await result.json();
            return data.signedURL?.startsWith("http") ? data.signedURL : `${base}/storage/v1${data.signedURL || ""}`;
          };
          const [audio, artwork] = await Promise.all([sign("studio-audio", row.audio_path), sign("studio-artwork", row.artwork_path)]);
          if (!audio || !artwork) return null;
          const numericId = row.id.replace(/-/g, "").slice(0, 12);
          return { trackId: parseInt(numericId, 16), trackName: row.title, artistName: artistNames.get(row.artist_id) || "AfroVibe Artist", collectionName: row.release_type || "Single", artworkUrl100: artwork, previewUrl: audio, trackViewUrl: window.location.href, primaryGenreName: row.genre, trackExplicitness: row.explicit_content?.toLowerCase().includes("explicit") ? "explicit" : "clean", source: "studio" } as Track;
        }));
        setStudioTracks(signed.filter(Boolean) as Track[]);
      } catch (e) {
        console.error("AfroVibe Studio catalogue:", e);
      }
    };
    void loadStudioCatalogue();
    const refreshPublishedReleases = window.setInterval(() => { void loadStudioCatalogue(); }, 60 * 60 * 1000);
    return () => window.clearInterval(refreshPublishedReleases);
  }, []);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  useEffect(() => {
    if (view === "charts" && charts.length === 0) loadCharts();
  }, [view, charts.length, loadCharts]);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    try {
      const preferences = JSON.parse(localStorage.getItem("afrovibez.preferences.v1") || "{}");
      audio.volume = Math.max(0, Math.min(100, Number(preferences.volume ?? 85))) / 100;
    } catch { audio.volume = 0.85; }
    audio.addEventListener("ended", () => {
      if (repeatRef.current) {
        audio.currentTime = 0;
        void audio.play().catch(() => setToast("This preview could not be replayed."));
        return;
      }
      try {
        const preferences = JSON.parse(localStorage.getItem("afrovibez.preferences.v1") || "{}");
        if (preferences.autoplay !== true) {
          setPlaying(false);
          setCurrentTime(0);
          return;
        }
        const savedQueue = JSON.parse(localStorage.getItem("afrovibez.queue.v1") || "[]") as Track[];
        const nextQueue = savedQueue.filter(t => t.previewUrl);
        if (nextQueue.length) {
          const nextIndex = shuffleRef.current ? Math.floor(Math.random() * nextQueue.length) : 0;
          const next = nextQueue[nextIndex];
          const remaining = nextQueue.filter((_, index) => index !== nextIndex);
          setQueue(remaining);
          localStorage.setItem("afrovibez.queue.v1", JSON.stringify(remaining));
          currentTrackIdRef.current = next.trackId;
          setCurrent(next);
          audio.src = next.previewUrl!;
          void audio.play().catch(() => { setPlaying(false); setToast("The next preview could not be played."); });
          return;
        }
      } catch { /* Ignore invalid saved queue data. */ }
      const available = catalogueRef.current.filter(track => track.previewUrl && track.trackId !== currentTrackIdRef.current);
      if (available.length) {
        const next = shuffleRef.current ? available[Math.floor(Math.random() * available.length)] : available[0];
        currentTrackIdRef.current = next.trackId;
        setCurrent(next);
        audio.src = next.previewUrl!;
        void audio.play().catch(() => { setPlaying(false); setToast("The next preview could not be played."); });
        return;
      }
      setPlaying(false);
      setCurrentTime(0);
    });
    audio.addEventListener("pause", () => setPlaying(false));
    audio.addEventListener("error", () => { setPlaying(false); setToast("This uploaded track could not be played. Please try again."); });
    audio.addEventListener("play", () => setPlaying(true));
    audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
    audio.addEventListener("loadedmetadata", () =>
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
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
    let savedPreferences: Record<string, unknown> = {};
    try { savedPreferences = JSON.parse(localStorage.getItem("afrovibez.preferences.v1") || "{}"); } catch {}
    audio.volume = Math.max(0, Math.min(100, Number(savedPreferences.volume ?? 85))) / 100;
    const selectedMode = keepAudioMode ? audioMode : ((savedPreferences.defaultMode as typeof audioMode) || "normal");
    setAudioMode(selectedMode);
    audio.playbackRate = selectedMode === "sped" ? 1.25 : selectedMode === "slowed" ? 0.8 : selectedMode === "nightcore" ? 1.35 : selectedMode === "daycore" ? 0.85 : 1;
    currentTrackIdRef.current = track.trackId;
    setCurrent(track);
    setCurrentTime(0);
    setDuration(0);
    try {
      await audio.play();
    } catch {
      setError("This full track could not be played. Please try again.");
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

  const isExplicit = (track: Track) => track.trackExplicitness?.toLowerCase() === "explicit" || track.contentAdvisoryRating?.toLowerCase() === "explicit";
  const artworkUrl = (track: Track, high: string, low: string) => track.artworkUrl100?.replace("100x100", highQualityArtwork ? high : low);
  const visibleTracks = [...studioTracks.filter((t) => {
    const term = query.trim().toLowerCase();
    return !term || `${t.trackName} ${t.artistName} ${t.primaryGenreName || ""}`.toLowerCase().includes(term);
  })].filter(
    (t) => (showExplicitContent || !isExplicit(t)) && (
      category === "All" ||
      (t.primaryGenreName || "").toLowerCase().includes(category.toLowerCase()) ||
      t.artistName.toLowerCase().includes(category.toLowerCase())
    )
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
    const playable = studioTracks
      .filter((t, index, all) => !!t.previewUrl && all.findIndex(x => x.trackId === t.trackId) === index);
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

  const applyAudioMode = (mode: typeof audioMode) => {
    setAudioMode(mode);
    if (audioRef.current) audioRef.current.playbackRate =
      mode === "sped" ? 1.25 : mode === "slowed" ? 0.8 : mode === "nightcore" ? 1.35 : mode === "daycore" ? 0.85 : 1;
    notify(mode === "normal" ? "Original speed" : `${mode === "sped" ? "Sped Up" : mode === "slowed" ? "Slowed" : mode === "nightcore" ? "Nightcore" : "Daycore"} mode enabled`);
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
          src={artworkUrl(track, "400x400", "100x100")}
          alt=""
          loading={index > 6 ? "lazy" : "eager"}
        />
        <button
          className="cover-play"
          onClick={() => playTrack(track)}
          disabled={!track.previewUrl}
          aria-label={track.previewUrl ? (track.source === "studio" ? "Play full release" : "Play preview") : "Playback unavailable"}
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
                <img src={artworkUrl(track, "300x300", "100x100")} alt="" loading="lazy" />
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
          <p>Discover full songs uploaded by AfroVibe artists.</p>
        </div>
        <div className="sidebar-foot">
          Only approved artist uploads appear here.<br />
          Full-track playback from AfroVibe Studio.
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
              placeholder="Search uploaded songs and artists…"
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
                  <p>Discover music uploaded and approved by artists on AfroVibe Studio. Listen to complete releases, not short previews.</p>
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
                  list={(sectionTracks[s.id] || []).filter(track => showExplicitContent || !isExplicit(track))}
                  loading={sectionsLoading}
                />
              ))}

              <section className="section-block" id="browse">
                <div className="section-heading">
                  <div>
                    <div className="eyebrow dark">BROWSE ALL</div>
                    <h2>Explore the catalogue</h2>
                    <p>Only approved full-length releases from AfroVibe Studio appear here.</p>
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
                          setQuery("");
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
                  <div className="loading"><LoaderCircle className="spin" /> Loading approved AfroVibe releases…</div>
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
                      <span>Your catalogue is fresh and ready. Be the first to upload a song in AfroVibez Studio.</span>
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
                <p>Official AfroVibe releases will appear here as listening data becomes available.</p>
              </div>
              {chartsLoading ? (
                <div className="loading"><LoaderCircle className="spin" /> Loading charts…</div>
              ) : charts.length ? (
                <div className="charts-list">
                  {charts.filter(track => showExplicitContent || !isExplicit(track)).map((track, i) => (
                    <article className="chart-row" key={track.trackId}>
                      <span className="rank">{i + 1}</span>
                      <div className="chart-cover">
                        <img src={artworkUrl(track, "200x200", "100x100")} alt="" />
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
              <span>{current.artistName} · {current.source === "studio" ? "Full release" : "Preview"}</span>
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
        <div className="full-player-backdrop" role="dialog" aria-modal="true" aria-label="Now playing">
          <section className="full-player af-now-playing">
            <header className="af-player-topbar">
              <button onClick={() => setPlayerOpen(false)} aria-label="Close player"><X/></button>
              <div><small>NOW PLAYING</small><strong>AFROVIBEZ</strong></div>
              <button onClick={() => {setView("queue");setPlayerOpen(false);}} aria-label={`Open queue, ${queue.length} tracks`}><ListMusic/></button>
            </header>
            <div className="af-player-art" style={{backgroundImage:`linear-gradient(180deg,rgba(12,20,54,.28),#0b1024 95%),url(${current.artworkUrl100?.replace("100x100","600x600")})`}}>
              <img src={current.artworkUrl100?.replace("100x100","600x600")} alt={`Album artwork for ${current.trackName}`}/>
            </div>
            <div className="af-track-heading">
              <div><span>{current.artistName}</span><h1>{current.trackName}</h1><small>{current.collectionName || "Single"} · {current.primaryGenreName || "Music"}</small></div>
              <button className={liked.has(current.trackId)?"is-liked":""} onClick={()=>toggleLike(current.trackId)} aria-label={liked.has(current.trackId)?"Unlike track":"Like track"}><Heart fill={liked.has(current.trackId)?"currentColor":"none"}/></button>
            </div>
            <div className="af-primary-actions">
              <button onClick={()=>addToPlaylist(current)}><ListPlus/><span>Playlist</span></button>
              <button onClick={()=>void shareTrack(current)}><Share2/><span>Share</span></button>
              <button onClick={()=>setMenuTrack(current)}><MoreVertical/><span>More</span></button>
            </div>
            <div className="af-wave-wrap">
              <div className="af-wave-bars" aria-hidden="true">
                {Array.from({length:64},(_,i)=>{
                  const height=18+((i*37+i*i*13)%47);
                  return <span key={i} className={i/64 <= currentTime/Math.max(duration,1)?"played":""} style={{height:height+"%"}}/>;
                })}
              </div>
              <input aria-label="Seek through full track" type="range" min="0" max={duration||1} step="0.1" value={Math.min(currentTime,duration||0)} onChange={e=>seek(Number(e.target.value))}/>
              <div className="af-time-labels"><span>{timeLabel(currentTime)}</span><span>{timeLabel(Math.max(0,duration-currentTime))} left</span></div>
            </div>
            <div className="af-transport">
              <button onClick={()=>setMenuTrack(current)} aria-label="More playback options"><MoreVertical/></button>
              <button onClick={()=>playAdjacent(-1)} aria-label="Previous track"><SkipBack fill="currentColor"/></button>
              <button className="af-play-toggle" onClick={()=>void playTrack(current)} aria-label={playing?"Pause":"Play"}>{playing?<Pause fill="currentColor"/>:<Play fill="currentColor"/>}</button>
              <button onClick={()=>playAdjacent(1)} aria-label="Next track"><SkipForward fill="currentColor"/></button>
              <button className={shuffleEnabled?"active":""} onClick={()=>{const v=!shuffleEnabled;shuffleRef.current=v;setShuffleEnabled(v);notify(v?"Shuffle enabled":"Shuffle disabled");}} aria-label="Toggle shuffle" aria-pressed={shuffleEnabled}><Shuffle/></button>
            </div>
            <div className="af-audiomod">
              <div className="af-section-title"><strong>Audiomod</strong><label>Stay on <input type="checkbox" checked={keepAudioMode} onChange={e=>{setKeepAudioMode(e.target.checked);localStorage.setItem("afrovibez.keepAudioMode",String(e.target.checked));}}/><span/></label></div>
              <div className="af-mode-list">
                {([{id:"sped",label:"Sped Up"},{id:"slowed",label:"Slowed"},{id:"nightcore",label:"Nightcore"},{id:"daycore",label:"Daycore"},{id:"normal",label:"Original"}] as const).map(mode=><button key={mode.id} className={audioMode===mode.id?"selected":""} onClick={()=>applyAudioMode(mode.id)}><span>{mode.label}</span><small>{mode.id==="normal"?"1.0×":mode.id==="sped"?"1.25×":mode.id==="slowed"?"0.8×":mode.id==="nightcore"?"1.35×":"0.85×"}</small></button>)}
              </div>
            </div>
            <div className="af-repeat-row">
              <button className={repeatEnabled?"active":""} onClick={()=>{const v=!repeatEnabled;repeatRef.current=v;setRepeatEnabled(v);notify(v?"Repeat preview enabled":"Repeat disabled");}} aria-pressed={repeatEnabled}><Repeat/> Repeat {repeatEnabled?"On":"Off"}</button>
              <button onClick={()=>{setView("queue");setPlayerOpen(false);}}><ListMusic/> Queue ({queue.length})</button>
            </div>
            <section className="af-artist-card">
              <div className="af-section-title"><strong>Artist</strong><button onClick={()=>{setInput(current.artistName);setQuery(current.artistName);setView("discover");setPlayerOpen(false);}}>See catalogue <ExternalLink/></button></div>
              <div className="af-artist-row"><div className="af-artist-avatar">{current.artistName.slice(0,1).toUpperCase()}</div><strong>{current.artistName}</strong><button onClick={()=>{setFollowedArtists(a=>a.includes(current.artistName)?a.filter(x=>x!==current.artistName):[...a,current.artistName]);notify(followedArtists.includes(current.artistName)?"Artist unfollowed":"Artist followed");}}>{followedArtists.includes(current.artistName)?"FOLLOWING":"FOLLOW"}</button></div>
              <p>Catalogue listing · {current.primaryGenreName || "Music"} · {current.collectionName || "Single"}</p>
              <a href={current.trackViewUrl} target="_blank" rel="noreferrer">Open official catalogue listing <ExternalLink/></a>
            </section>
            <div className="af-preview-note">{current.source === "studio" ? "You are listening to an approved full release delivered by AfroVibe Studio." : "You are listening to an Apple Music full track. Full-track playback and licensed downloads are not connected for full tracks."}</div>
          </section>
        </div>
      )}
    </main>
  );
}
