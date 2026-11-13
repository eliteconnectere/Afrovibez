"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { translateText } from "../lib/i18n";
import { ensureListenerAccessToken } from "../lib/listener-auth";
import {
  Disc3, Headphones, Home, Search, Library, Heart, Play, Pause, SkipBack, SkipForward,
  Music2, Menu, X, ListMusic, ExternalLink, LoaderCircle, Settings, TrendingUp,
  Share2, Plus, BarChart3, MoreVertical, ListPlus, Radio, Info, UserPlus, ListOrdered,
  Link2, MessageCircle, Send, Copy, Volume2, Repeat, Shuffle, Album, ChevronDown,
  CheckCircle2, AlertTriangle, XCircle
} from "lucide-react";

type Track = {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100: string;
  audioUrl?: string;
  trackViewUrl: string;
  source?: "studio";
  artistId?: string;
  studioTrackId?: string;
  allowDownloads?: boolean;
  primaryGenreName?: string;
  trackExplicitness?: string;
  contentAdvisoryRating?: string;
};

type View = "discover" | "charts" | "search" | "feed" | "library" | "queue";

const categories = ["All", "African", "Afrobeats", "Afropop", "Afro-fusion", "Amapiano", "Highlife", "Bongo Flava", "Hiplife", "Gqom", "Afro House", "Soukous", "Ndombolo", "Mbalax", "Fuji", "Juju", "Caribbean", "Dancehall", "Reggae", "Soca", "Zouk", "Kompa", "Latin", "Reggaeton", "Salsa", "Bachata", "Latin Pop", "Hip-Hop / Rap", "R&B / Soul", "Pop", "Rock", "Alternative", "Indie", "Metal", "Punk", "Electronic", "House", "Techno", "Trance", "Drum & Bass", "Dubstep", "EDM", "Jazz", "Blues", "Country", "Folk", "Classical", "Gospel / Christian", "Soundtracks", "Traditional"];
const categoryAliases: Record<string, string[]> = {
  "African": ["afro", "amapiano", "highlife", "hiplife", "gqom", "kuduro", "kizomba", "soukou", "ndombolo", "mbalax", "fuji", "juju", "apala", "bongo", "gengetone", "singeli", "palm-wine"],
  "Caribbean": ["dancehall", "reggae", "soca", "zouk", "kompa", "calypso"],
  "Latin": ["latin", "reggaeton", "salsa", "bachata", "merengue", "cumbia", "bossa"],
  "Hip-Hop / Rap": ["hip-hop", "hip hop", "rap", "drill", "trap", "grime"],
  "R&B / Soul": ["r&b", "rnb", "soul", "neo-soul", "quiet storm", "funk"],
  "Electronic": ["electronic", "edm", "house", "techno", "trance", "drum & bass", "drum and bass", "dubstep", "garage", "ambient", "disco", "synthwave"],
  "Pop": ["pop", "dance-pop", "synth-pop", "k-pop", "j-pop"],
  "Rock": ["rock", "metal", "punk", "alternative", "indie", "grunge"],
  "Jazz": ["jazz", "blues", "bebop", "swing"],
  "Country": ["country", "bluegrass", "americana"],
  "Folk": ["folk", "traditional", "world"],
  "Gospel / Christian": ["gospel", "christian", "worship", "praise"],
};
function genreMatchesCategory(genre: string, category: string) {
  const value = genre.toLowerCase();
  if (value.includes(category.toLowerCase())) return true;
  return (categoryAliases[category] || []).some(alias => value.includes(alias));
}


const sectionsConfig: { id: string; title: string; subtitle: string; term: string }[] = [];
const countryCodes = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const countryFlagUrl = (code: string) => `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
const countryOptions = countryCodes.map(code => ({ code, name: countryNames.of(code) || code, flagUrl: countryFlagUrl(code) })).sort((a,b)=>a.name.localeCompare(b.name));


export default function HomePage() {
  const [view, setView] = useState<View>("discover");
  const [language, setLanguage] = useState("en");
  const t = (value: string) => translateText(value, language);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [studioTracks, setStudioTracks] = useState<Track[]>([]);
  const [sectionTracks, setSectionTracks] = useState<Record<string, Track[]>>({});
  const [charts, setCharts] = useState<Track[]>([]);
  const [query, setQuery] = useState("");
  const [input, setInput] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("US");
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState<Track | null>(null);
  const [artistProfiles, setArtistProfiles] = useState<Record<string, any>>({});
  const [artistProfileOpen, setArtistProfileOpen] = useState(false);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [offlineDownloads, setOfflineDownloads] = useState<Set<number>>(new Set());
  const offlineDownloadsRef = useRef<Set<number>>(new Set());
  const [offlineTracks, setOfflineTracks] = useState<Track[]>([]);
  const [offlineBusy, setOfflineBusy] = useState<number | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{trackId:number;trackName:string;loaded:number;total:number|null;percent:number|null} | null>(null);
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
  const [followedArtistIds, setFollowedArtistIds] = useState<string[]>([]);
  const [followerCounts, setFollowerCounts] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<{title:string;message:string;tone:"success"|"error"|"warning"|"info"} | null>(null);
  const [appDialog, setAppDialog] = useState<{title:string;message:string;confirmLabel:string;tone:"danger"|"primary";input?:boolean;onConfirm:(value?:string)=>void} | null>(null);
  const [dialogInput, setDialogInput] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [highQualityArtwork, setHighQualityArtwork] = useState(true);
  const [showExplicitContent, setShowExplicitContent] = useState(true);
  const catalogueRef = useRef<Track[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackIdRef = useRef<number | null>(null);
  const currentTrackUuidRef = useRef<string | null>(null);
  const listenedSecondsRef = useRef(0);
  const lastAudioTimeRef = useRef(0);
  const recordedStreamsRef = useRef<Set<string>>(new Set());
  const activeObjectUrlRef = useRef<string | null>(null);
  offlineDownloadsRef.current = offlineDownloads;


  const getListenerKey = () => {
    const keyName = "afrovibez.listener-key.v1";
    let key = localStorage.getItem(keyName);
    if (!key) {
      key = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === "x" ? r : (r & 3 | 8)).toString(16);
          });
      localStorage.setItem(keyName, key);
    }
    return key;
  };
  const recordVerifiedStream = async (trackUuid: string, seconds: number) => {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!base || !key) return;
    try {
      await fetch(`${base}/rest/v1/rpc/record_track_stream`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_track_id: trackUuid, p_listener_key: getListenerKey(), p_listened_seconds: Math.max(30, Math.floor(seconds)) })
      });
    } catch (e) { console.warn("AfroVibez stream metric was not recorded:", e); }
  };

  const loadArtistSocial = async (artists: any[]) => {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const ids = artists.map((artist:any)=>artist.id).filter(Boolean);
    if (!base || !key || !ids.length) return;
    let token = key;
    let signedIn = false;
    try {
      token = await ensureListenerAccessToken();
      signedIn = true;
      const userResponse = await fetch(`${base}/auth/v1/user`, { headers: { apikey:key, Authorization:`Bearer ${token}` } });
      if (userResponse.ok) {
        const user = await userResponse.json();
        const oldNames = JSON.parse(localStorage.getItem("afrovibez.follows.v1") || "[]");
        const legacyIds = artists.filter((artist:any)=>Array.isArray(oldNames)&&oldNames.includes(artist.stage_name)).map((artist:any)=>artist.id).filter((id:string)=>id!==undefined);
        if (user.id && legacyIds.length) {
          await fetch(`${base}/rest/v1/studio_artist_follows`, {
            method:"POST", headers:{apikey:key,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"resolution=ignore-duplicates,return=minimal"},
            body:JSON.stringify(legacyIds.map((artist_id:string)=>({artist_id,follower_id:user.id})))
          });
        }
      }
    } catch (error) {
      console.warn("AfroVibez listener sign-in is not available yet:", error);
    }
    try {
      const response = await fetch(`${base}/rest/v1/rpc/get_artist_follow_counts`, {
        method:"POST", headers:{apikey:key,Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({p_artist_ids:ids})
      });
      if (!response.ok) throw new Error(await response.text());
      const rows = await response.json();
      const counts:Record<string,number>={};
      const following:string[]=[];
      for (const row of rows||[]) {
        counts[row.artist_id]=Number(row.follower_count||0);
        if (signedIn && row.is_following) following.push(row.artist_id);
      }
      setFollowerCounts(current=>({...current,...counts}));
      if (signedIn) {
        setFollowedArtistIds(following);
        const names=artists.filter((artist:any)=>following.includes(artist.id)).map((artist:any)=>artist.stage_name);
        setFollowedArtists(names);
        localStorage.setItem("afrovibez.follows.v1",JSON.stringify(names));
      }
    } catch (error) {
      console.warn("AfroVibez follower totals could not be loaded:",error);
    }
  };

  const toggleArtistFollow = async (artistId:string, stageName:string) => {
    const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if(!base||!key){notify("Artist follows are not configured yet.","error");return;}
    try {
      const token=await ensureListenerAccessToken();
      const userResponse=await fetch(`${base}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});
      if(!userResponse.ok)throw new Error("Could not verify your listener account. Please try again.");
      const user=await userResponse.json();
      const already=followedArtistIds.includes(artistId);
      const response=already
        ? await fetch(`${base}/rest/v1/studio_artist_follows?artist_id=eq.${artistId}&follower_id=eq.${user.id}`,{method:"DELETE",headers:{apikey:key,Authorization:`Bearer ${token}`}})
        : await fetch(`${base}/rest/v1/studio_artist_follows`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({artist_id:artistId,follower_id:user.id})});
      if(!response.ok)throw new Error(await response.text()||"The follow could not be saved.");
      setFollowedArtistIds(ids=>already?ids.filter(id=>id!==artistId):[...ids,artistId]);
      setFollowedArtists(names=>already?names.filter(name=>name!==stageName):names.includes(stageName)?names:[...names,stageName]);
      setFollowerCounts(counts=>({...counts,[artistId]:Math.max(0,(counts[artistId]||0)+(already?-1:1))}));
      const names=JSON.parse(localStorage.getItem("afrovibez.follows.v1")||"[]");
      localStorage.setItem("afrovibez.follows.v1",JSON.stringify(already?names.filter((name:string)=>name!==stageName):[...new Set([...names,stageName])]));
      notify(already?"Artist unfollowed":"Artist followed","success");
    } catch(error:any) {
      notify(error?.message||"Could not update your follow. Enable Anonymous Sign-Ins in Supabase Auth settings and try again.","error");
    }
  };

  const OFFLINE_DB = "afrovibez-offline-v1";
  const openOfflineDb = () => new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(OFFLINE_DB,1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains("tracks"))request.result.createObjectStore("tracks",{keyPath:"trackId"});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  const getOfflineBlob = async (id:number):Promise<Blob|null>=>{try{const db=await openOfflineDb();return await new Promise((resolve,reject)=>{const req=db.transaction("tracks","readonly").objectStore("tracks").get(id);req.onsuccess=()=>resolve(req.result?.blob||null);req.onerror=()=>reject(req.error);});}catch{return null;}};
  const saveOfflineBlob = async (track:Track,blob:Blob)=>{const db=await openOfflineDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction("tracks","readwrite");tx.objectStore("tracks").put({trackId:track.trackId,studioTrackId:track.studioTrackId,blob,trackName:track.trackName,artistName:track.artistName,artworkUrl100:track.artworkUrl100,artistId:track.artistId,primaryGenreName:track.primaryGenreName,collectionName:track.collectionName,allowDownloads:track.allowDownloads,savedAt:Date.now()});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});};
  const deleteOfflineBlob = async (id:number):Promise<boolean>=>{try{const db=await openOfflineDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction("tracks","readwrite");tx.objectStore("tracks").delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();setOfflineDownloads(prev=>{const next=new Set(prev);next.delete(id);return next;});setOfflineTracks(prev=>prev.filter(track=>track.trackId!==id));return true;}catch{return false;}};

  // No third-party catalogue: AfroVibez only plays full-length artist uploads.
  const fetchTracks = useCallback(async (_term: string, _limit = 24) => [] as Track[], []);
  const loadTracks = useCallback(async (_term: string) => {
    setLoading(true);
    setError("");
    setTracks([]);
    setLoading(false);
  }, []);

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

  useEffect(() => { document.documentElement.lang = language; }, [language]);

  useEffect(() => {
    if("serviceWorker" in navigator){void navigator.serviceWorker.register("/sw.js").catch(error=>console.warn("AfroVibez offline app shell registration failed:",error));}
  }, []);

  useEffect(() => {
    try {
      if(typeof indexedDB!=="undefined"){void openOfflineDb().then(db=>new Promise<any[]>((resolve,reject)=>{const req=db.transaction("tracks","readonly").objectStore("tracks").getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);})).then(rows=>{setOfflineDownloads(new Set(rows.map(row=>row.trackId)));setOfflineTracks(rows.map(row=>({trackId:row.trackId,trackName:row.trackName,artistName:row.artistName,artworkUrl100:row.artworkUrl100,artistId:row.artistId,studioTrackId:row.studioTrackId,primaryGenreName:row.primaryGenreName,collectionName:row.collectionName,allowDownloads:row.allowDownloads!==false,trackViewUrl:window.location.href,source:"studio"} as Track)));}).catch(()=>{});}
      const savedPreferences = JSON.parse(localStorage.getItem("afrovibez.preferences.v1") || "{}");
      const savedLanguage = String(savedPreferences.language || "en").toLowerCase();
      setLanguage(savedLanguage === "french" ? "fr" : savedLanguage === "spanish" ? "es" : savedLanguage === "portuguese" ? "pt" : savedLanguage);
      const savedLikes = JSON.parse(localStorage.getItem("afrovibez.likes.v1") || "[]");
      setLiked(new Set(Array.isArray(savedLikes) ? savedLikes.filter((id): id is number => Number.isFinite(id)) : []));
      setQueue((JSON.parse(localStorage.getItem("afrovibez.queue.v1") || "[]") as Track[]).filter(t => t.source === "studio"));
      setPlaylists((JSON.parse(localStorage.getItem("afrovibez.playlists.v1") || "[]") as {id:string;name:string;tracks:Track[]}[]).map(p => ({...p, tracks:p.tracks.filter(t => t.source === "studio")})));
      const savedSearches = JSON.parse(localStorage.getItem("afrovibez.searches.v1") || "[]");
      setRecentSearches(Array.isArray(savedSearches) ? savedSearches.filter((x): x is string => typeof x === "string").slice(0,8) : []);
      const savedFollows = JSON.parse(localStorage.getItem("afrovibez.follows.v1") || "[]");
      setFollowedArtists(Array.isArray(savedFollows) ? savedFollows.filter((name): name is string => typeof name === "string") : []);
      const savedCountry = localStorage.getItem("afrovibez.explore-country.v1");
      const localeCountry = (navigator.language.split("-")[1] || "US").toUpperCase();
      const validCountry = countryCodes.includes(savedCountry || "") ? savedCountry! : countryCodes.includes(localeCountry) ? localeCountry : "US";
      setSelectedCountry(validCountry);
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
      localStorage.setItem("afrovibez.searches.v1", JSON.stringify(recentSearches));
      localStorage.setItem("afrovibez.explore-country.v1", selectedCountry);
    } catch { notify("Some changes could not be saved on this device. Free up storage and try again.", "warning", "Storage is full"); }
  }, [liked, queue, playlists, followedArtists, recentSearches, selectedCountry, storageReady]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("afrovibez.preferences.v1") || "{}");
      document.documentElement.dataset.theme = saved.theme === "dark" ? "dark" : "light";
    } catch {
      document.documentElement.dataset.theme = "light";
    }
  }, []);

  useEffect(() => {
    catalogueRef.current = [...studioTracks, ...offlineTracks, ...tracks, ...charts, ...Object.values(sectionTracks).flat()]
      .filter((track, index, all) => all.findIndex(item => item.trackId === track.trackId) === index);
  }, [tracks, studioTracks, offlineTracks, charts, sectionTracks]);

  useEffect(() => {
    const savedCountry = localStorage.getItem("afrovibez.explore-country.v1");
    if (savedCountry && countryOptions.some(country => country.code === savedCountry)) setSelectedCountry(savedCountry);
  }, []);

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
        const response = await fetch(`${base}/rest/v1/studio_tracks?select=id,artist_id,title,genre,language,audio_path,artwork_path,explicit_content,release_type,release_date,allow_downloads&status=eq.approved&release_date=lte.${localToday}&order=approved_at.desc.nullslast`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
        if (!response.ok) throw new Error("Published AfroVibe releases are temporarily unavailable.");
        const rows = await response.json();
        // Download permission controls whether a NEW offline copy may be saved.
        // It must never remove a release from the streaming catalogue or silently
        // delete a listener's existing local copy during catalogue refresh.
        const artistIds = Array.from(new Set((rows || []).map((row: any) => row.artist_id)));
        const artistResponse = artistIds.length ? await fetch(`${base}/rest/v1/studio_artist_public?select=id,stage_name,avatar_path,artist_type,country,city,primary_language,bio,website,instagram,tiktok,youtube,facebook,music_link&id=in.(${artistIds.join(",")})`, { headers: { apikey: key, Authorization: `Bearer ${key}` } }) : null;
        const artistRows = artistResponse?.ok ? await artistResponse.json() : [];
        const artistNames = new Map<string, string>((artistRows || []).map((artist: any) => [artist.id, artist.stage_name] as [string, string]));
        const profileMap:Record<string,any>={};
        await Promise.all((artistRows||[]).map(async(artist:any)=>{let avatarUrl="";if(artist.avatar_path){const path=artist.avatar_path.split("/").map(encodeURIComponent).join("/");const response=await fetch(`${base}/storage/v1/object/sign/studio-artwork/${path}`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({expiresIn:3600})});if(response.ok){const data=await response.json();avatarUrl=data.signedURL?.startsWith("http")?data.signedURL:`${base}/storage/v1${data.signedURL||""}`;}}profileMap[artist.id]={...artist,avatarUrl};}));
        setArtistProfiles(profileMap);
        void loadArtistSocial(artistRows);
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
          return { trackId: parseInt(numericId, 16), artistId:row.artist_id, studioTrackId:row.id, allowDownloads:row.allow_downloads!==false, trackName: row.title, artistName: artistNames.get(row.artist_id) || "AfroVibe Artist", collectionName: row.release_type || "Single", artworkUrl100: artwork, audioUrl: audio, trackViewUrl: window.location.href, primaryGenreName: row.genre, source: "studio", trackExplicitness: row.explicit_content?.toLowerCase().includes("explicit") ? "explicit" : "clean" } as Track;
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
        void audio.play().catch(() => notify("This track could not be replayed. Try playing it again.", "error", "Playback interrupted"));
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
        const nextQueue = savedQueue.filter(t => t.audioUrl || offlineDownloadsRef.current.has(t.trackId));
        if (nextQueue.length) {
          const nextIndex = shuffleRef.current ? Math.floor(Math.random() * nextQueue.length) : 0;
          const next = nextQueue[nextIndex];
          const remaining = nextQueue.filter((_, index) => index !== nextIndex);
          setQueue(remaining);
          localStorage.setItem("afrovibez.queue.v1", JSON.stringify(remaining));
          void playTrack(next);
          return;
        }
      } catch { /* Ignore invalid saved queue data. */ }
      const available = catalogueRef.current.filter(track => (track.audioUrl || offlineDownloadsRef.current.has(track.trackId)) && track.trackId !== currentTrackIdRef.current);
      if (available.length) {
        const next = shuffleRef.current ? available[Math.floor(Math.random() * available.length)] : available[0];
        void playTrack(next);
        return;
      }
      setPlaying(false);
      setCurrentTime(0);
    });
    audio.addEventListener("pause", () => { lastAudioTimeRef.current = audio.currentTime; setPlaying(false); });
    audio.addEventListener("error", () => { setPlaying(false); notify("This track could not be played right now. Please try again.", "error", "Unable to play track"); });
    audio.addEventListener("play", () => { lastAudioTimeRef.current = audio.currentTime; setPlaying(true); });
    audio.addEventListener("timeupdate", () => {
      const now = audio.currentTime;
      const delta = now - lastAudioTimeRef.current;
      if (!audio.paused && delta > 0 && delta <= 3) listenedSecondsRef.current += delta;
      lastAudioTimeRef.current = now;
      const uuid = currentTrackUuidRef.current;
      if (uuid && listenedSecondsRef.current >= 30 && !recordedStreamsRef.current.has(uuid)) {
        recordedStreamsRef.current.add(uuid);
        void recordVerifiedStream(uuid, listenedSecondsRef.current);
      }
      setCurrentTime(now);
    });
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
    if(activeObjectUrlRef.current){URL.revokeObjectURL(activeObjectUrlRef.current);activeObjectUrlRef.current=null;}
    const offlineBlob=await getOfflineBlob(track.trackId);
    if(!offlineBlob&&!track.audioUrl){notify("This song is not saved offline. Connect to the internet to play it.");return;}
    if(!offlineBlob&&!navigator.onLine){notify("This song is not saved offline. Connect to the internet to play or download it.");return;}
    if(offlineBlob){activeObjectUrlRef.current=URL.createObjectURL(offlineBlob);audio.src=activeObjectUrlRef.current;}else{audio.src=track.audioUrl;}
    let savedPreferences: Record<string, unknown> = {};
    try { savedPreferences = JSON.parse(localStorage.getItem("afrovibez.preferences.v1") || "{}"); } catch {}
    audio.volume = Math.max(0, Math.min(100, Number(savedPreferences.volume ?? 85))) / 100;
    const selectedMode = keepAudioMode ? audioMode : ((savedPreferences.defaultMode as typeof audioMode) || "normal");
    setAudioMode(selectedMode);
    audio.playbackRate = selectedMode === "sped" ? 1.25 : selectedMode === "slowed" ? 0.8 : selectedMode === "nightcore" ? 1.35 : selectedMode === "daycore" ? 0.85 : 1;
    currentTrackIdRef.current = track.trackId;
    currentTrackUuidRef.current = track.studioTrackId || null;
    listenedSecondsRef.current = 0;
    lastAudioTimeRef.current = 0;
    setCurrent(track);
    setPlayerOpen(true);
    setCurrentTime(0);
    setDuration(0);
    try {
      await audio.play();
    } catch {
      setError("This full track could not be played. Please try again.");
    }
  };

  const notify = (message:string, tone:"success"|"error"|"warning"|"info"="success", title?:string) => {
    const heading = title || (tone==="success" ? "All set" : tone==="error" ? "Something went wrong" : tone==="warning" ? "A quick heads-up" : "AfroVibez update");
    setToast({title:heading,message,tone});
    window.setTimeout(()=>setToast(current=>current?.message===message?null:current),3600);
  };
  const openAppDialog = (options:{title:string;message:string;confirmLabel:string;tone?:"danger"|"primary";input?:boolean;onConfirm:(value?:string)=>void}) => {
    setDialogInput("");
    setAppDialog({...options,tone:options.tone||"primary"});
  };
  const removeOfflineDownload = async (track: Track) => {
    openAppDialog({title:"Remove download?",message:"You won't be able to listen offline unless you download it again.",confirmLabel:"Remove",tone:"danger",onConfirm:()=>{void (async()=>{const removed=await deleteOfflineBlob(track.trackId);notify(removed?"Download removed":"We couldn't remove this download. Please try again.",removed?"success":"error",removed?"Removed from Downloads":"Couldn't remove download");})();}});
  };
  const startOfflineDownload = async (track:Track) => {
    setOfflineBusy(track.trackId);
    setDownloadProgress({trackId:track.trackId,trackName:track.trackName,loaded:0,total:null,percent:null});
    try{
      const response=await fetch(track.audioUrl!);
      if(!response.ok)throw new Error("Download could not start.");
      const headerLength=Number(response.headers.get("content-length"));
      const total=Number.isFinite(headerLength)&&headerLength>0?headerLength:null;
      let blob:Blob;
      if(response.body){
        const reader=response.body.getReader();
        const chunks:ArrayBuffer[]=[];
        let loaded=0;
        while(true){
          const {done,value}=await reader.read();
          if(done)break;
          if(value){const chunk=new ArrayBuffer(value.byteLength);new Uint8Array(chunk).set(value);chunks.push(chunk);loaded+=value.byteLength;setDownloadProgress({trackId:track.trackId,trackName:track.trackName,loaded,total,percent:total?Math.min(100,Math.round(loaded/total*100)):null});}
        }
        blob=new Blob(chunks,{type:response.headers.get("content-type")||"audio/mpeg"});
      }else{
        blob=await response.blob();
        setDownloadProgress({trackId:track.trackId,trackName:track.trackName,loaded:blob.size,total:blob.size,percent:100});
      }
      if(!blob.size)throw new Error("The downloaded audio file was empty.");
      await saveOfflineBlob(track,blob);
      setOfflineDownloads(prev=>new Set(Array.from(prev).concat(track.trackId)));
      setOfflineTracks(prev=>prev.filter(item=>item.trackId!==track.trackId).concat({...track,audioUrl:undefined}));
      notify("Ready whenever you are. Find it in your Downloads.", "success", "Saved for offline listening");
    }catch(error:any){notify(error?.message||"Your download couldn't be completed. Please try again.", "error", "Download failed");}
    finally{setOfflineBusy(null);setDownloadProgress(null);}
  };
  const downloadTrack = (track:Track) => {
    if(track.allowDownloads===false){notify("Downloads aren't available for this release.", "warning", "Download unavailable");return;}
    if(offlineDownloads.has(track.trackId)){notify("This song is already in your offline Downloads.", "info", "Already downloaded");return;}
    if(offlineBusy!==null){notify("One download is already in progress. Try again when it finishes.", "info", "Download in progress");return;}
    if(!track.audioUrl){notify("The full audio file isn't available right now.", "error", "Audio unavailable");return;}
    if(!navigator.onLine){notify("Connect to the internet before downloading this song.", "warning", "You're offline");return;}
    openAppDialog({title:"Save for offline?",message:"This song will be available in your Downloads, even when you're offline. The first download uses internet data.",confirmLabel:"Download",onConfirm:()=>{void startOfflineDownload(track);}});
  };
  const openArtistProfile = (track:Track) => {if(!track.artistId||!artistProfiles[track.artistId]){notify("Artist details are not available right now.");return;}setSelectedArtistId(track.artistId);setArtistProfileOpen(true);};
  const addToQueue = (track:Track, next=false) => {
    setQueue(items => next ? [track,...items.filter(t=>t.trackId!==track.trackId)] : [...items.filter(t=>t.trackId!==track.trackId),track]);
    setMenuTrack(null); notify(next ? "Added to play next." : "Added to queue.");
  };
  const addToPlaylist = (track:Track) => {
    openAppDialog({title:"Create a playlist",message:"Give your playlist a name. You can add more songs whenever you like.",confirmLabel:"Save playlist",input:true,onConfirm:(value)=>{const name=(value||"").trim();if(!name){notify("Enter a name for your playlist first.","warning","Playlist name needed");return;}setPlaylists(items=>{const found=items.find(p=>p.name.toLowerCase()===name.toLowerCase());return found?items.map(p=>p.id===found.id?{...p,tracks:[...p.tracks.filter(t=>t.trackId!==track.trackId),track]}:p):[...items,{id:String(Date.now()),name,tracks:[track]}];});setMenuTrack(null);notify("Your playlist is ready in Library.","success","Playlist saved");}});
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
  const likedTracks = [...studioTracks, ...offlineTracks]
    .filter((track, index, all) => liked.has(track.trackId) && all.findIndex(item => item.trackId === track.trackId) === index);

  const visibleTracks = [...studioTracks, ...offlineTracks]
    .filter((track, index, all) => all.findIndex(item => item.trackId === track.trackId) === index)
    .filter((t) => {
      const term = query.trim().toLowerCase();
      return !term || `${t.trackName} ${t.artistName} ${t.collectionName || ""} ${t.primaryGenreName || ""}`.toLowerCase().includes(term);
    })
    .filter(
      (t) => (showExplicitContent || !isExplicit(t)) && (
        category === "All" || genreMatchesCategory(t.primaryGenreName || "", category)
      )
    );

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      setQuery(input.trim());
      setCategory("All");
      setRecentSearches(prev => [input.trim(), ...prev.filter(x => x.toLowerCase() !== input.trim().toLowerCase())].slice(0,8));
      setView("search");
    }
  };

  const playAdjacent = (direction: -1 | 1) => {
    if (!current) return;
    const playable = studioTracks.concat(offlineTracks)
      .filter((t, index, all) => (!!t.audioUrl || offlineDownloads.has(t.trackId)) && all.findIndex(x => x.trackId === t.trackId) === index);
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
    <article className="track-card" onClick={(e)=>{if((e.target as HTMLElement).closest("button"))return;void playTrack(track);}} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();void playTrack(track);}}}>
      <div className="cover-wrap">
        <img
          src={artworkUrl(track, "400x400", "100x100")}
          alt=""
          loading={index > 6 ? "lazy" : "eager"}
        />
        <button
          className="cover-play"
          onClick={() => playTrack(track)}
          disabled={!track.audioUrl && !offlineDownloads.has(track.trackId)}
          aria-label={track.audioUrl || offlineDownloads.has(track.trackId) ? ("Play full release") : "Playback unavailable"}
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
        <button className="track-artist-link" onClick={()=>openArtistProfile(track)}>{track.artistName}</button>
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
            <article className="row-card" key={track.trackId} role="button" tabIndex={0} onClick={()=>void playTrack(track)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")void playTrack(track);}}>
              <div className="row-cover">
                <img src={artworkUrl(track, "300x300", "100x100")} alt="" loading="lazy" />
                <button
                  className="row-play"
                  onClick={() => playTrack(track)}
                  disabled={!track.audioUrl && !offlineDownloads.has(track.trackId)}
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
              <button className="artist-inline-link" onClick={e=>{e.stopPropagation();openArtistProfile(track);}}>{track.artistName}</button>
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
          <button className="close-nav" onClick={() => setMobileNav(false)} aria-label={t("Close menu")}><X /></button>
        </div>
        <div className="nav-label">{t("MENU")}</div>
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
          <button className={"nav-item " + (view === "search" ? "active" : "")} onClick={() => { setView("search"); setMobileNav(false); }}><Search size={19}/> {t("Search")}</button>
          <button className={"nav-item " + (view === "feed" ? "active" : "")} onClick={() => { setView("feed"); setMobileNav(false); }}><Radio size={19}/> {t("Feed")}</button>
          <button
            className={"nav-item " + (view === "library" ? "active" : "")}
            onClick={() => { setView("library"); setMobileNav(false); }}
          >
            <Library size={19} /> Your library
          </button>
          <button className={"nav-item " + (view==="queue"?"active":"")} onClick={()=>{setView("queue");setMobileNav(false);}}><ListOrdered size={19}/> {t("Your queue")}</button>
          <a className="nav-item" href="/settings" onClick={() => setMobileNav(false)}>
            <Settings size={19} /> Settings
          </a>
        </nav>
        <div className="sidebar-note">
          <div className="note-icon"><Headphones size={21} /></div>
          <strong>{t("Your sound. Your roots.")}</strong>
          <p>{t("Discover full songs uploaded by AfroVibe artists.")}</p>
        </div>
        <div className="sidebar-foot">
          {t("Only approved artist uploads appear here.")}<br />
          {t("Full-track playback from AfroVibe Studio.")}
        </div>
      </aside>
      {mobileNav && <button className="mobile-nav-backdrop" aria-label={t("Close menu")} onClick={() => setMobileNav(false)} />}

      <section className="main-area">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setMobileNav(true)} aria-label={t("Open menu")} aria-expanded={mobileNav}><Menu /></button>
          <div className="mobile-brand">AFRO<span>VIBEZ</span></div>
          <form className="searchbar" onSubmit={submitSearch}>
            <Search size={18} />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("Search songs, artists, albums and genres…")}
              aria-label={t("Search")}
            />
            <button type="submit">{t("Search")}</button>
          </form>
          <div className="top-tag"><span className="live-dot" /> {t("LIVE CATALOGUE")}</div>
        </header>

        <div className="content af-view-transition" key={view}>
          {view === "discover" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <div className="eyebrow"><span /> {t("THE SOUND OF AFRICA")}</div>
                  <h1>{t("Feel the rhythm.")}<br /><em>{t("Find your vibe.")}</em></h1>
                  <p>{t("Discover full songs uploaded by AfroVibe artists.")}</p>
                  <a className="hero-button" href="#browse">{t("Explore music")} <span>↗</span></a>
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
                    <div className="eyebrow dark">{t("BROWSE ALL")}</div>
                    <h2>{t("Explore the catalogue")}</h2>
                    <p>{t("Only approved full-length releases from AfroVibe Studio appear here.")}</p>
                  </div>
                  <span className="results-label">{visibleTracks.length} {t("RESULTS")}</span>
                </div>
                <div className="chips">
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setCategory(c);
                        setQuery("");
                        setInput("");
                        window.setTimeout(() => document.getElementById("browse")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
                      }}
                      className={"chip " + (category === c ? "selected" : "")}
                    >
                      {t(c)}
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
                <div className="eyebrow dark">AFRICA</div>
                <h1>Top Charts</h1>
                <p>Charts are not active yet. AfroVibez does not currently collect the listener play-count data needed to rank releases.</p>
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
                          disabled={!track.audioUrl && !offlineDownloads.has(track.trackId)}
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
                        <button className="artist-inline-link" onClick={()=>openArtistProfile(track)}>{track.artistName}</button>
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
                  <strong>No chart data yet</strong>
                  <span>Real chart rankings need play-count analytics and listener activity tracking, which are not connected yet.</span>
                </div>
              )}
            </section>
          )}

          {view === "search" && (
            <section className="library-view search-view">
              <div className="search-title-row"><div className="section-heading"><div><div className="eyebrow dark">FIND YOUR NEXT FAVOURITE</div><h2>Search music</h2><p>Search approved songs, artists and genres across AfroVibez.</p></div></div><button className="country-trigger" type="button" onClick={()=>{setCountrySearch("");setCountryPickerOpen(true);}} onPointerDown={()=>{setCountrySearch("");setCountryPickerOpen(true);}} aria-label={`Explore by country: ${countryOptions.find(c=>c.code===selectedCountry)?.name || "United States"}`} aria-haspopup="dialog" aria-expanded={countryPickerOpen}><img className="country-flag-image" src={countryFlagUrl(selectedCountry)} alt="" width="24" height="18" /><ChevronDown size={15}/></button></div>
              <form className="search-page-form" onSubmit={submitSearch}><Search size={19}/><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Songs, artists, albums or genres…" aria-label="Search songs artists albums or genres"/><button type="submit">Search</button></form>
              {!query.trim() ? <><div className="search-section-title"><strong>Browse genres</strong><span>Explore by sound</span></div><div className="search-genre-grid">{categories.filter(c=>c!=="All").slice(0,20).map(c=><button key={c} onClick={()=>{setCategory(c);setQuery("");setInput("");setView("discover");}}>{c}<span>↗</span></button>)}</div>{recentSearches.length>0&&<div className="recent-searches"><div className="search-section-title"><strong>Recent searches</strong><button onClick={()=>setRecentSearches([])}>Clear</button></div>{recentSearches.map(term=><button key={term} onClick={()=>{setInput(term);setQuery(term);setCategory("All");}}><Search size={14}/>{term}</button>)}</div>}<div className="search-section-title"><strong>Recently added</strong><span>Fresh from AfroVibe Studio</span></div><div className="track-grid">{studioTracks.slice(0,8).map((track,index)=><TrackCard key={track.trackId} track={track} index={index}/>)}</div></> : <><div className="search-section-title"><strong>Results for “{query}”</strong><span>{visibleTracks.length} results</span></div>{visibleTracks.length?<div className="track-grid">{visibleTracks.map((track,index)=><TrackCard key={track.trackId} track={track} index={index}/>)}</div>:<div className="empty-state"><Search size={28}/><strong>No matching music yet</strong><span>Try another song title, artist name or genre.</span></div>}</>}
            </section>
          )}

          {view === "feed" && (
            <section className="library-view feed-view">
              <div className="section-heading"><div><div className="eyebrow dark">{t("Your music community")}</div><h2>{t("Following feed")}</h2><p>{t("New releases from artists you follow.")}</p></div></div>
              {followedArtists.length ? <><div className="feed-following-note">Following {followedArtists.length} {followedArtists.length===1?"artist":"artists"}: {followedArtists.join(", ")}</div>{studioTracks.filter(t=>followedArtists.includes(t.artistName)).length ? <div className="track-grid">{studioTracks.filter(t=>followedArtists.includes(t.artistName)).map((track,index)=><TrackCard key={track.trackId} track={track} index={index}/>)}</div> : <div className="empty-state"><Radio size={28}/><strong>No new releases from your artists yet</strong><span>When artists you follow publish music, it will appear here.</span></div>}</> : <div className="bottom-callout"><div className="callout-icon"><Radio size={23}/></div><div><strong>Your feed starts with artists you follow</strong><p>Open a song’s More menu or artist profile and choose Follow. Their new approved releases will appear here.</p></div><button className="feed-discover-button" onClick={()=>setView("discover")}>Discover artists</button></div>}
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
                  <p>Your downloads, liked releases and playlists in one place.</p>
                </div>
              </div>
              {offlineTracks.length > 0 && <section className="offline-library"><h3>Downloaded for offline listening</h3><p>These songs are stored on this device and can play without an internet connection.</p><div className="track-grid">{offlineTracks.map((track,index)=><TrackCard key={track.trackId} track={track} index={index}/>)}</div></section>}
              {likedTracks.length > 0 && <section className="offline-library"><h3>{t("Liked songs")}</h3><div className="track-grid">{likedTracks.map(track => <TrackCard key={track.trackId} track={track}/>)}</div></section>}
              {playlists.length > 0 && playlists.map(playlist => <section className="offline-library" key={playlist.id}><h3>{playlist.name}</h3><p>{playlist.tracks.length} {playlist.tracks.length === 1 ? "track" : "tracks"} · Saved on this device</p>{playlist.tracks.length ? <div className="track-grid">{playlist.tracks.map(track => <TrackCard key={track.trackId} track={track}/>)}</div> : <p>This playlist is empty.</p>}</section>)}
              {likedTracks.length === 0 && offlineTracks.length === 0 && playlists.length === 0 && <div className="bottom-callout"><div className="callout-icon"><ListMusic size={23}/></div><div><strong>Nothing saved yet</strong><p>Like a song, create a playlist or download a release to build your library.</p></div><span className="coming-label">ON THIS DEVICE</span></div>}
            </section>
          )}

          <footer>© {new Date().getFullYear()} AFROVIBEZ <span>Discover. Listen. Feel.</span></footer>
        </div>
        <nav className="mobile-tabbar" aria-label="Main sections">
          <button className={view==="discover"?"active":""} onClick={()=>setView("discover")}><Home/><span>{t("Discover")}</span></button>
          <button className={view==="charts"?"active":""} onClick={()=>setView("charts")}><TrendingUp/><span>{t("Charts")}</span></button>
          <button className={view==="search"?"active":""} onClick={()=>setView("search")}><Search/><span>{t("Search")}</span></button>
          <button className={view==="feed"?"active":""} onClick={()=>setView("feed")}><Radio/><span>{t("Feed")}</span></button>
          <button className={view==="library"?"active":""} onClick={()=>setView("library")}><Library/><span>{t("Library")}</span></button>
        </nav>
      </section>

      {current && (
        <div className="player" role="region" aria-label="Music player">
          <button className="player-open" onClick={() => setPlayerOpen(true)} aria-label="Open full player">
            <img src={current.artworkUrl100} alt="" />
            <span className="player-track">
              <strong>{current.trackName}</strong>
              <span>{current.artistName} · {"Full release"}</span>
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

      {downloadProgress && (
        <div role="status" aria-live="polite" style={{position:"fixed",left:16,right:16,bottom:"max(18px, env(safe-area-inset-bottom))",zIndex:9999,maxWidth:520,margin:"0 auto",padding:"13px 15px",borderRadius:16,background:"#101827",color:"#fff",boxShadow:"0 12px 36px rgba(0,0,0,.28)",border:"1px solid rgba(255,255,255,.16)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div aria-hidden="true" style={{width:34,height:34,borderRadius:"50%",border:"3px solid rgba(255,255,255,.22)",borderTopColor:"#65d6a6",animation:"afDownloadSpin .8s linear infinite",flexShrink:0}} />
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>Downloading {downloadProgress.trackName}</div>
              <div style={{fontSize:11,opacity:.78,marginTop:3}}>{downloadProgress.percent===null?"Receiving audio…":downloadProgress.percent+"% · "+(downloadProgress.loaded/1048576).toFixed(1)+" MB"+(downloadProgress.total?" of "+(downloadProgress.total/1048576).toFixed(1)+" MB":"")}</div>
              <div style={{height:5,background:"rgba(255,255,255,.18)",borderRadius:99,overflow:"hidden",marginTop:8}}>
                <div style={{height:"100%",width:downloadProgress.percent===null?"35%":downloadProgress.percent+"%",background:"#65d6a6",borderRadius:99,transition:"width .18s ease",animation:downloadProgress.percent===null?"afDownloadPulse 1.2s ease-in-out infinite":undefined}} />
              </div>
            </div>
            <span style={{fontSize:12,fontWeight:800,minWidth:34,textAlign:"right"}}>{downloadProgress.percent===null?"…":downloadProgress.percent+"%"}</span>
          </div>
          <style>{'@keyframes afDownloadSpin{to{transform:rotate(360deg)}}@keyframes afDownloadPulse{0%,100%{opacity:.45}50%{opacity:1}}'}</style>
        </div>
      )}
      {toast && <div className={`af-toast af-toast-${toast.tone}`} role={toast.tone==="error"?"alert":"status"} aria-live={toast.tone==="error"?"assertive":"polite"}>
        <span className="af-toast-icon" aria-hidden="true">{toast.tone==="success"?<CheckCircle2 size={21}/>:toast.tone==="error"?<XCircle size={21}/>:toast.tone==="warning"?<AlertTriangle size={21}/>:<Info size={21}/>}</span>
        <span className="af-toast-copy"><strong>{toast.title}</strong><span>{toast.message}</span></span>
        <button type="button" className="af-toast-close" onClick={()=>setToast(null)} aria-label="Dismiss notification"><X size={17}/></button>
      </div>}
      {appDialog && <div className="af-dialog-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setAppDialog(null);}}>
        <section className="af-dialog" role="dialog" aria-modal="true" aria-labelledby="af-dialog-title">
          <div className={`af-dialog-symbol ${appDialog.tone}`}>{appDialog.tone==="danger"?<AlertTriangle size={25}/>:appDialog.input?<Plus size={25}/>:<Info size={25}/>}</div>
          <div className="af-dialog-kicker">AFROVIBEZ</div><h2 id="af-dialog-title">{appDialog.title}</h2><p>{appDialog.message}</p>
          {appDialog.input && <input className="af-dialog-input" autoFocus maxLength={48} value={dialogInput} onChange={e=>setDialogInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();const action=appDialog.onConfirm;const value=dialogInput;setAppDialog(null);action(value);}}} placeholder="Playlist name" aria-label="Playlist name"/>}
          <div className="af-dialog-actions"><button type="button" className="af-dialog-cancel" onClick={()=>setAppDialog(null)}>Cancel</button><button type="button" className={`af-dialog-confirm ${appDialog.tone}`} onClick={()=>{const action=appDialog.onConfirm;const value=dialogInput;setAppDialog(null);action(value);}}>{appDialog.confirmLabel}</button></div>
        </section>
      </div>}
      {countryPickerOpen && <div className="country-picker-backdrop" role="presentation" onClick={()=>setCountryPickerOpen(false)}><section className="country-picker" role="dialog" aria-modal="true" aria-label="Select music country" onClick={e=>e.stopPropagation()}><header><div><small>{t("Explore music by region")}</small><h2>{t("Select a country")}</h2></div><button type="button" onClick={()=>setCountryPickerOpen(false)} aria-label="Close country selector"><X size={20}/></button></header><input className="country-picker-search" value={countrySearch} onChange={e=>setCountrySearch(e.target.value)} placeholder={t("Search countries…")} aria-label={t("Search countries…")}/><div className="country-picker-list">{countryOptions.filter(country=>country.name.toLowerCase().includes(countrySearch.trim().toLowerCase())).map(country=><button type="button" key={country.code} className={selectedCountry===country.code?"selected":""} onClick={()=>{setSelectedCountry(country.code);localStorage.setItem("afrovibez.explore-country.v1",country.code);setCountryPickerOpen(false);notify(`Music region set to ${country.name}.`);}}><img className="country-option-flag" src={country.flagUrl} alt="" width="25" height="19" loading="lazy" /><span>{country.name}</span>{selectedCountry===country.code&&<span className="country-option-check">✓</span>}</button>)}</div></section></div>}

      {menuTrack && <div className="track-menu-backdrop" onClick={()=>setMenuTrack(null)}><section className="track-menu-sheet" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}>
        <div className="sheet-grip"/><button className="sheet-close" onClick={()=>setMenuTrack(null)}><X/></button>
        <div className="sheet-track"><img src={menuTrack.artworkUrl100} alt=""/><div><span>{menuTrack.artistName}</span><strong>{menuTrack.trackName}</strong></div></div>
        <div className="share-shortcuts"><button onClick={()=>{void shareShortcut(menuTrack,"copy");setMenuTrack(null);}}><Link2/><span>Copy Link</span></button><button onClick={()=>void shareTrack(menuTrack)}><Send/><span>Share</span></button><button onClick={()=>void shareShortcut(menuTrack,"whatsapp")}><MessageCircle/><span>WhatsApp</span></button><button onClick={()=>void shareShortcut(menuTrack,"text")}><Copy/><span>Via Text</span></button><button onClick={()=>void shareShortcut(menuTrack,"facebook")}><span className="facebook-mark">f</span><span>Facebook</span></button></div>
        <div className="track-menu-actions">
          <button onClick={()=>{setFollowedArtists(a=>a.includes(menuTrack.artistName)?a.filter(x=>x!==menuTrack.artistName):[...a,menuTrack.artistName]);setMenuTrack(null);notify("Artist follow preference saved on this device.");}}><UserPlus/> More from Artist · {followedArtists.includes(menuTrack.artistName)?"Following":"Follow"}</button>
          <button onClick={()=>addToQueue(menuTrack,true)}><ListPlus/> Play Next</button><button onClick={()=>addToQueue(menuTrack)}><ListOrdered/> Add to Queue</button>
          <button onClick={()=>{toggleLike(menuTrack.trackId);setMenuTrack(null);}}><Heart/> {liked.has(menuTrack.trackId)?"Unlike":"Like"}</button>
          <button onClick={()=>{if(offlineDownloads.has(menuTrack.trackId)){void removeOfflineDownload(menuTrack);setMenuTrack(null);}else{void downloadTrack(menuTrack);}}} disabled={menuTrack.allowDownloads===false||offlineBusy===menuTrack.trackId}>{menuTrack.allowDownloads===false?"🔒 Downloads locked":offlineBusy===menuTrack.trackId?"Saving offline…":offlineDownloads.has(menuTrack.trackId)?"Remove offline download":"⇩ Download for offline listening"}</button>
          <button onClick={()=>addToPlaylist(menuTrack)}><Plus/> Add to Playlist</button>
          <button onClick={()=>{setQuery(menuTrack.artistName);setInput(menuTrack.artistName);setView("discover");setMenuTrack(null);}}><Radio/> See similar songs</button><button onClick={()=>{setQuery(menuTrack.artistName);setInput(menuTrack.artistName);setView("discover");setMenuTrack(null);}}><Album/> More from {menuTrack.artistName}</button>
          
        </div><p className="local-only-note">Offline downloads are stored privately on this device when the artist allows downloads. The first save uses data; later playback can work without a connection.</p>
      </section></div>}
      {current && playerOpen && (
        <div className="full-player-backdrop" role="dialog" aria-modal="true" aria-label="Now playing">
          <section className="full-player af-now-playing">
            <header className="af-player-topbar">
              <button onClick={() => setPlayerOpen(false)} aria-label="Close player"><X/></button>
              <div><small>NOW PLAYING</small><strong>AFROVIBEZ</strong></div>
              <button onClick={() => {setView("queue");setPlayerOpen(false);}} aria-label={`Open queue, ${queue.length} tracks`}><ListMusic/></button>
            </header>
            <div className="af-player-art" style={{backgroundImage:`linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.35) 95%),url(${current.artworkUrl100?.replace("100x100","600x600")})`}}>
              <img src={current.artworkUrl100?.replace("100x100","600x600")} alt={`Album artwork for ${current.trackName}`}/>
            </div>
            <div className="af-track-heading">
              <div><span>{current.artistName}</span><h1>{current.trackName}</h1><small>{current.collectionName || "Single"} · {current.primaryGenreName || "Music"}</small></div>
              <button className={liked.has(current.trackId)?"is-liked":""} onClick={()=>toggleLike(current.trackId)} aria-label={liked.has(current.trackId)?"Unlike track":"Like track"}><Heart fill={liked.has(current.trackId)?"currentColor":"none"}/></button>
            </div>
            <div className="af-primary-actions">
              <button onClick={()=>addToPlaylist(current)}><ListPlus/><span>Playlist</span></button>
              <button onClick={()=>void shareTrack(current)}><Share2/><span>Share</span></button>
              <button className={offlineDownloads.has(current.trackId)?"offline-saved":""} disabled={current.allowDownloads===false||offlineBusy===current.trackId} onClick={()=>{if(offlineDownloads.has(current.trackId))void removeOfflineDownload(current);else void downloadTrack(current);}}>{current.allowDownloads===false?<span>🔒</span>:<span>⇩</span>}<span>{current.allowDownloads===false?"Locked":offlineBusy===current.trackId?"Saving…":offlineDownloads.has(current.trackId)?"Remove download":"Download"}</span></button>
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
              <button className={repeatEnabled?"active":""} onClick={()=>{const v=!repeatEnabled;repeatRef.current=v;setRepeatEnabled(v);notify(v?"Repeat enabled":"Repeat disabled");}} aria-pressed={repeatEnabled}><Repeat/> Repeat {repeatEnabled?"On":"Off"}</button>
              <button onClick={()=>{setView("queue");setPlayerOpen(false);}}><ListMusic/> Queue ({queue.length})</button>
            </div>
            <section className="af-artist-card">
              <div className="af-section-title"><strong>Artist</strong><button onClick={()=>{setInput(current.artistName);setQuery(current.artistName);setView("discover");setPlayerOpen(false);}}>See catalogue <ExternalLink/></button></div>
              <div className="af-artist-row"><button className="af-artist-name-link" onClick={()=>openArtistProfile(current)}><div className="af-artist-avatar">{current.artistId && artistProfiles[current.artistId]?.avatarUrl ? <img src={artistProfiles[current.artistId].avatarUrl} alt="" /> : current.artistName.slice(0,1).toUpperCase()}</div><strong>{current.artistName}</strong></button><button onClick={()=>current.artistId&&void toggleArtistFollow(current.artistId,current.artistName)}>{current.artistId&&followedArtistIds.includes(current.artistId)?"FOLLOWING":"FOLLOW"}</button></div>
              <p>{current.primaryGenreName || "Music"} · {current.collectionName || "Single"}</p>
            </section>
            <div className="af-playback-note">{current.source === "studio" ? "You are listening to an approved full release delivered by AfroVibe Studio." : "You are listening to an approved full-length AfroVibe release."}</div>
          </section>
        </div>
      )}
    {artistProfileOpen && selectedArtistId && artistProfiles[selectedArtistId] && (()=>{const p=artistProfiles[selectedArtistId];const artistTracks=studioTracks.filter(track=>track.artistId===selectedArtistId);const isFollowing=followedArtistIds.includes(selectedArtistId);const links=[["Website",p.website],["Instagram",p.instagram],["TikTok",p.tiktok],["YouTube",p.youtube],["Facebook",p.facebook],["Music",p.music_link]].filter((x:any)=>x[1]);const href=(v:string)=>/^https?:\/\//i.test(v)?v:"https://"+v.replace(/^@/,"");return <div className="artist-profile-backdrop" role="dialog" aria-modal="true" aria-label={`${p.stage_name} artist profile`} onClick={()=>setArtistProfileOpen(false)}><section className="artist-profile-sheet" onClick={e=>e.stopPropagation()}><button className="artist-profile-close" onClick={()=>setArtistProfileOpen(false)} aria-label="Close artist profile"><X/></button><div className="artist-profile-hero">{p.avatarUrl?<img className="artist-profile-avatar" src={p.avatarUrl} alt={`${p.stage_name} profile photo`}/>:<div className="artist-profile-avatar artist-profile-no-photo" role="img" aria-label="Artist profile photo not uploaded"><UserPlus size={34}/><span>{t("Photo unavailable")}</span></div>}<div className="eyebrow">AFROVIBE ARTIST</div><h2>{p.stage_name}</h2><p className="artist-profile-location">{[p.city,p.country].filter(Boolean).join(", ")}</p>{p.artist_type&&<p>{p.artist_type}</p>}{p.primary_language&&<p>{t("Performs in:")} {p.primary_language}</p>}<button className="artist-profile-follow" onClick={()=>void toggleArtistFollow(selectedArtistId,p.stage_name)}>{isFollowing?"Following":"Follow artist"}</button></div><div className="artist-profile-stats"><div><strong>{artistTracks.length}</strong><span>{t("Approved releases")}</span></div><div><strong>{(followerCounts[selectedArtistId]||0).toLocaleString(language)}</strong><span>{t("Followers")}</span></div><div><strong>—</strong><span>Streams</span><small>Public totals unavailable</small></div></div>{p.bio&&<div className="artist-profile-bio">{p.bio}</div>}{links.length>0&&<div className="artist-profile-links">{links.map(([label,value]:any)=><a key={label} href={href(value)} target="_blank" rel="noreferrer">{label} ↗</a>)}</div>}<section className="artist-profile-discography"><div className="artist-profile-section-heading"><h3>{t("Music & releases")}</h3><span>{artistTracks.length} {t(artistTracks.length===1?"release":"releases")}</span></div>{artistTracks.length?artistTracks.map(track=><button className="artist-release-row" key={track.trackId} onClick={()=>{setArtistProfileOpen(false);void playTrack(track);}}><img src={track.artworkUrl100} alt=""/><span><strong>{track.trackName}</strong><small>{track.collectionName||"Single"} · {track.primaryGenreName||"Music"}</small></span><Play size={18}/></button>):<p className="artist-profile-empty">{t("No approved releases are currently listed for this artist.")}</p>}</section><p className="artist-profile-sync-note">Follows and follower totals are stored in AfroVibe Music. Anonymous listener accounts keep your follows on this device until account linking is added.</p></section></div>})()}
    </main>
  );
}
