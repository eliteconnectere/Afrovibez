"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { translateText } from "../lib/i18n";
import { ensureListenerAccessToken } from "../lib/listener-auth";
import {
  Disc3, Headphones, Home, Search, Library, Heart, Play, Pause, SkipBack, SkipForward,
  Music2, Menu, X, ListMusic, ExternalLink, LoaderCircle, Settings, TrendingUp,
  Share2, Plus, BarChart3, MoreVertical, ListPlus, Radio, Info, UserPlus, ListOrdered,
  Link2, MessageCircle, Send, Copy, Volume2, Repeat, Shuffle, Album, ChevronDown,
  CheckCircle2, AlertTriangle, XCircle, ChevronLeft
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
  storagePath?: string;
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


const sectionsConfig: { id: string; title: string; subtitle: string; term: string }[] = [
  { id: "latest", title: "Recently added", subtitle: "The latest approved releases from AfroVibe Studio.", term: "latest" },
  { id: "afrobeats", title: "Afrobeats & Afropop", subtitle: "Fresh sounds from across Africa.", term: "afrobeats" },
  { id: "amapiano", title: "Amapiano", subtitle: "Log drums, soulful keys and dance-floor energy.", term: "amapiano" },
  { id: "hiphop", title: "Hip-Hop & Rap", subtitle: "Rap, drill and street sounds.", term: "hip-hop" },
  { id: "rnb", title: "R&B & Soul", subtitle: "Smooth vocals and soulful records.", term: "r&b" },
  { id: "gospel", title: "Gospel & Inspiration", subtitle: "Music to lift the spirit.", term: "gospel" }
];
const countryCodes = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const countryFlagUrl = (code:string) => `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
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
  const [queueDragIndex, setQueueDragIndex] = useState<number | null>(null);
  const [trackComments, setTrackComments] = useState<any[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [replyToComment, setReplyToComment] = useState<string | null>(null);
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentReactions, setCommentReactions] = useState<Record<string,{likes:number;dislikes:number}>>({});
  const [expandedCommentThreads, setExpandedCommentThreads] = useState<Set<string>>(new Set());
  const [playerToolsOpen, setPlayerToolsOpen] = useState(false);
  const [bassBoostEnabled, setBassBoostEnabled] = useState(false);
  const [audioModOpen, setAudioModOpen] = useState(false);
  const [bassLevel, setBassLevel] = useState(0);
  const [bassStudioOpen, setBassStudioOpen] = useState(false);
  const [bassFrequency, setBassFrequency] = useState(90);
  const [bassQ, setBassQ] = useState(0.7);
  const [subBassLevel, setSubBassLevel] = useState(0);
  const [bassPunch, setBassPunch] = useState(0);
  const [distortionEnabled, setDistortionEnabled] = useState(false);
  const [reverbEnabled, setReverbEnabled] = useState(false);
  const [delayEnabled, setDelayEnabled] = useState(false);
  const [pitch, setPitch] = useState(0);
  const [lowPass, setLowPass] = useState(0);
  const [highPass, setHighPass] = useState(0);
  const [stayOnAudioMod, setStayOnAudioMod] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioGraphInitRef = useRef<Promise<AudioContext> | null>(null);
  const tempoRampRef = useRef<number | null>(null);
  const playRequestRef = useRef(0);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(0);
  const [sleepTimerOpen, setSleepTimerOpen] = useState(false);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const loadArtistSocial = async (artists:any[]) => {
    const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const ids=artists.map((artist:any)=>artist.id).filter(Boolean);
    if(!base||!key||!ids.length)return;
    try{
      const countResponse=await fetch(`${base}/rest/v1/studio_artist_follow_counts?select=artist_id,follower_count&artist_id=in.(${ids.join(",")})`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
      if(!countResponse.ok)throw new Error(await countResponse.text());
      const countRows=await countResponse.json();
      const counts:Record<string,number>={};
      for(const row of countRows||[])counts[row.artist_id]=Number(row.follower_count||0);
      setFollowerCounts(current=>({...current,...counts}));
    }catch(error){console.warn("AfroVibez public follower totals could not be loaded:",error);}
    let token="";
    try{
      const saved=JSON.parse(localStorage.getItem("afrovibez.listener-auth.v1")||"null");
      if(!saved?.refresh_token){setFollowedArtistIds([]);setFollowedArtists([]);return;}
      token=await ensureListenerAccessToken();
      const userResponse=await fetch(`${base}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});
      if(!userResponse.ok)throw new Error("Listener session expired.");
      const user=await userResponse.json();
      const oldNames=JSON.parse(localStorage.getItem("afrovibez.follows.v1")||"[]");
      const legacyIds=artists.filter((artist:any)=>Array.isArray(oldNames)&&oldNames.includes(artist.stage_name)).map((artist:any)=>artist.id);
      if(user.id&&legacyIds.length)await fetch(`${base}/rest/v1/studio_artist_follows`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify(legacyIds.map((artist_id:string)=>({artist_id,follower_id:user.id})))});
      const followsResponse=await fetch(`${base}/rest/v1/studio_artist_follows?select=artist_id&follower_id=eq.${user.id}&artist_id=in.(${ids.join(",")})`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});
      if(!followsResponse.ok)throw new Error(await followsResponse.text());
      const follows=await followsResponse.json();
      const following=follows.map((row:any)=>row.artist_id);
      setFollowedArtistIds(following);
      const names=artists.filter((artist:any)=>following.includes(artist.id)).map((artist:any)=>artist.stage_name);
      setFollowedArtists(names);
      localStorage.setItem("afrovibez.follows.v1",JSON.stringify(names));
    }catch(error){console.warn("AfroVibez listener follows could not be loaded:",error);setFollowedArtistIds([]);setFollowedArtists([]);}
  };

  const toggleArtistFollow = async (artistId:string,stageName:string) => {
    const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if(!base||!key){notify("Artist follows are not configured yet.","error");return;}
    try{
      const token=await ensureListenerAccessToken();
      const userResponse=await fetch(`${base}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});
      if(!userResponse.ok)throw new Error("Could not verify your listener account. Please try again.");
      const user=await userResponse.json();
      const legacyNames=JSON.parse(localStorage.getItem("afrovibez.follows.v1")||"[]");
      const legacyArtists=Object.values(artistProfiles).filter((artist:any)=>Array.isArray(legacyNames)&&legacyNames.includes(artist.stage_name));
      if(user.id&&legacyArtists.length)await fetch(`${base}/rest/v1/studio_artist_follows`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify(legacyArtists.map((artist:any)=>({artist_id:artist.id,follower_id:user.id})))});
      const already=followedArtistIds.includes(artistId);
      const response=already
        ? await fetch(`${base}/rest/v1/studio_artist_follows?artist_id=eq.${artistId}&follower_id=eq.${user.id}`,{method:"DELETE",headers:{apikey:key,Authorization:`Bearer ${token}`}})
        : await fetch(`${base}/rest/v1/studio_artist_follows`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify({artist_id:artistId,follower_id:user.id})});
      if(!response.ok)throw new Error(await response.text()||"The follow could not be saved.");
      setFollowedArtistIds(previous=>already?previous.filter(id=>id!==artistId):previous.includes(artistId)?previous:[...previous,artistId]);
      setFollowedArtists(previous=>already?previous.filter(name=>name!==stageName):previous.includes(stageName)?previous:[...previous,stageName]);
      localStorage.setItem("afrovibez.follows.v1",JSON.stringify(already?legacyNames.filter((name:string)=>name!==stageName):Array.from(new Set([...legacyNames,stageName]))));
      await loadArtistSocial(Object.values(artistProfiles));
      notify(already?"Artist unfollowed":"Artist followed","success");
    }catch(error:any){notify(error?.message||"Could not update your follow. Enable Anonymous Sign-Ins in Supabase Auth settings and try again.","error");}
  };

  const OFFLINE_DB = "afrovibez-offline-v1";
  const openOfflineDb = () => new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(OFFLINE_DB,2);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains("tracks"))request.result.createObjectStore("tracks",{keyPath:"trackId"});if(!request.result.objectStoreNames.contains("assets"))request.result.createObjectStore("assets",{keyPath:"key"});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  const cacheOfflineAsset = async(key:string,blob:Blob,data?:any)=>{if(!blob.size||!blob.type.startsWith("image/"))return;const db=await openOfflineDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction("assets","readwrite");tx.objectStore("assets").put({key,blob,data,savedAt:Date.now()});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();};
  const getOfflineAssets = async()=>{const db=await openOfflineDb();const rows=await new Promise<any[]>((resolve,reject)=>{const tx=db.transaction("assets","readonly");const req=tx.objectStore("assets").getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);});db.close();return rows;};
  const getOfflineBlob = async (id:number):Promise<Blob|null>=>{let db:IDBDatabase|null=null;try{db=await openOfflineDb();return await new Promise((resolve,reject)=>{const req=db!.transaction("tracks","readonly").objectStore("tracks").get(id);req.onsuccess=()=>resolve(req.result?.blob||null);req.onerror=()=>reject(req.error);});}catch{return null;}finally{db?.close();}};
  const saveOfflineBlob = async (track:Track,blob:Blob,artworkBlob:Blob,artistProfile:any,artistAvatarBlob:Blob|null)=>{const db=await openOfflineDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction("tracks","readwrite");tx.objectStore("tracks").put({trackId:track.trackId,studioTrackId:track.studioTrackId,blob,artworkBlob,artistAvatarBlob,artistProfile,trackName:track.trackName,artistName:track.artistName,artworkUrl100:track.artworkUrl100,artistId:track.artistId,primaryGenreName:track.primaryGenreName,collectionName:track.collectionName,allowDownloads:track.allowDownloads,trackViewUrl:track.trackViewUrl,source:track.source,trackExplicitness:track.trackExplicitness,savedAt:Date.now()});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();};
  const deleteOfflineBlob = async (id:number):Promise<boolean>=>{
     let db:IDBDatabase|null=null;
     try{
       db=await openOfflineDb();
       const removedArtistId=await new Promise<string|null>((resolve,reject)=>{
         const tx=db!.transaction(["tracks","assets"],"readwrite");
         const tracks=tx.objectStore("tracks");
         const assets=tx.objectStore("assets");
         const get=tracks.get(id);
         get.onsuccess=()=>{
           const removed=get.result;
           const all=tracks.getAll();
           all.onsuccess=()=>{
             tracks.delete(id);
             const artistId=removed?.artistId?String(removed.artistId):null;
             if(artistId&&!all.result.some((row:any)=>row.trackId!==id&&String(row.artistId||"")===artistId))assets.delete(`artist-profile:${artistId}`);
             (tx as any).__removedArtistId=artistId;
           };
           all.onerror=()=>{try{tx.abort();}catch{}};
         };
         get.onerror=()=>{try{tx.abort();}catch{}};
         tx.oncomplete=()=>resolve((tx as any).__removedArtistId||null);
         tx.onerror=()=>reject(tx.error);
         tx.onabort=()=>reject(tx.error||new Error("Offline download removal was cancelled."));
       });
       const remains=await new Promise<boolean>((resolve,reject)=>{
         const tx=db!.transaction("tracks","readonly");
         const req=tx.objectStore("tracks").get(id);
         req.onsuccess=()=>resolve(Boolean(req.result));
         req.onerror=()=>reject(req.error);
       });
       if(remains)throw new Error("The offline file is still present in local storage.");
       if(current?.trackId===id&&activeObjectUrlRef.current){
         if(tempoRampRef.current!==null){cancelAnimationFrame(tempoRampRef.current);tempoRampRef.current=null;}
         const audio=audioRef.current;
         audio?.pause();
         if(audio){audio.removeAttribute("src");audio.load();}
         setPlaying(false);setCurrent(null);setPlayerOpen(false);setCurrentTime(0);setDuration(0);
         currentTrackIdRef.current=null;currentTrackUuidRef.current=null;
         URL.revokeObjectURL(activeObjectUrlRef.current);
         activeObjectUrlRef.current=null;
       }
       const removedTrack=offlineTracks.find(track=>track.trackId===id);
       if(removedTrack?.artworkUrl100?.startsWith("blob:"))URL.revokeObjectURL(removedTrack.artworkUrl100);
       setOfflineDownloads(prev=>{const next=new Set(prev);next.delete(id);return next;});
       setOfflineTracks(prev=>prev.filter(track=>track.trackId!==id));
       if(removedArtistId)setArtistProfiles(prev=>{const profile=prev[removedArtistId];if(profile?.avatarUrl?.startsWith("blob:"))URL.revokeObjectURL(profile.avatarUrl);return {...prev,[removedArtistId]:{...profile,avatarUrl:""}};});
       return true;
     }catch(error){console.error("Offline download removal failed:",error);return false;}
     finally{db?.close();}
   };
  const updateOfflineTrackVisuals = async(id:number,artworkBlob?:Blob|null,artistAvatarBlob?:Blob|null)=>{const db=await openOfflineDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction("tracks","readwrite");const store=tx.objectStore("tracks");const req=store.get(id);req.onsuccess=()=>{if(req.result){if(artworkBlob)req.result.artworkBlob=artworkBlob;if(artistAvatarBlob)req.result.artistAvatarBlob=artistAvatarBlob;store.put(req.result);}};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();};

  // Every discovery surface is built from real, approved AfroVibe Studio releases.
  // No third-party catalogue, fabricated tracks, or subscription-gated catalogue.
  const fetchTracks = useCallback(async (term: string, limit = 24) => {
    const all = [...studioTracks, ...offlineTracks]
      .filter((track, index, list) => list.findIndex(item => item.trackId === track.trackId) === index);
    const normalized = term.trim().toLowerCase();
    const matches = !normalized || normalized === "latest"
      ? all
      : all.filter(track => {
          const haystack = `${track.trackName} ${track.artistName} ${track.collectionName || ""} ${track.primaryGenreName || ""}`.toLowerCase();
          if (normalized === "afrobeats") return genreMatchesCategory(track.primaryGenreName || "", "African") || genreMatchesCategory(track.primaryGenreName || "", "Afrobeats") || genreMatchesCategory(track.primaryGenreName || "", "Afropop");
          if (normalized === "hip-hop") return genreMatchesCategory(track.primaryGenreName || "", "Hip-Hop / Rap");
          if (normalized === "r&b") return genreMatchesCategory(track.primaryGenreName || "", "R&B / Soul");
          if (normalized === "gospel") return genreMatchesCategory(track.primaryGenreName || "", "Gospel / Christian");
          return haystack.includes(normalized);
        });
    return matches.slice(0, limit);
  }, [studioTracks, offlineTracks]);
  const loadTracks = useCallback(async (term: string) => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchTracks(term, 100);
      setTracks(list);
    } catch (cause) {
      setError("We couldn't load approved AfroVibez releases. Check your connection and retry.");
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, [fetchTracks]);

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
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!base || !key) throw new Error("Charts are not configured.");
      const response = await fetch(`${base}/rest/v1/rpc/get_public_track_charts`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_limit: 50 })
      });
      if (!response.ok) throw new Error("Verified chart data is temporarily unavailable.");
      const ranked = await response.json() as {track_id:string;stream_count:number;unique_listeners:number}[];
      const byId = new Map(studioTracks.map(track => [track.studioTrackId, track]));
      setCharts(ranked.map(row => byId.get(row.track_id)).filter((track): track is Track => Boolean(track)));
    } catch (cause) {
      console.warn("Verified AfroVibez charts could not be loaded:", cause);
      setCharts([]);
    } finally {
      setChartsLoading(false);
    }
  }, [studioTracks]);

  useEffect(() => { document.documentElement.lang = language; }, [language]);
  useEffect(() => { if(playerOpen&&current) void loadTrackComments(current); }, [playerOpen,current?.studioTrackId]);

  useEffect(() => {
    if("serviceWorker" in navigator){void navigator.serviceWorker.register("/sw.js").catch(error=>console.warn("AfroVibez offline app shell registration failed:",error));}
  }, []);
  useEffect(() => {
    if(!storageReady||!navigator.onLine||!offlineTracks.length||!studioTracks.length)return;
    let cancelled=false;
    void (async()=>{
      for(const savedTrack of offlineTracks){
        if(cancelled)break;
        const sourceTrack=studioTracks.find(track=>track.trackId===savedTrack.trackId);
        if(!sourceTrack)continue;
        const rowDb=await openOfflineDb();
        const row=await new Promise<any>((resolve,reject)=>{const req=rowDb.transaction("tracks","readonly").objectStore("tracks").get(savedTrack.trackId);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
        rowDb.close();
        if(!row)continue;
        let artworkBlob:Blob|null=row.artworkBlob instanceof Blob?row.artworkBlob:null;
        if(!artworkBlob&&sourceTrack.artworkUrl100){
          try{const response=await fetch(sourceTrack.artworkUrl100,{mode:"cors",cache:"no-store"});if(response.ok){const candidate=await response.blob();if(candidate.type.startsWith("image/")&&candidate.size)artworkBlob=candidate;}}catch(error){console.warn("Existing download artwork repair failed:",savedTrack.trackId,error);}
        }
        let avatarBlob:Blob|null=row.artistAvatarBlob instanceof Blob?row.artistAvatarBlob:null;
        const profile=sourceTrack.artistId?artistProfiles[sourceTrack.artistId]:null;
        if(!avatarBlob&&profile?.avatarUrl){
          try{const response=await fetch(profile.avatarUrl,{mode:"cors",cache:"no-store"});if(response.ok){const candidate=await response.blob();if(candidate.type.startsWith("image/")&&candidate.size)avatarBlob=candidate;}}catch(error){console.warn("Existing download artist image repair failed:",sourceTrack.artistId,error);}
        }
        if(artworkBlob||avatarBlob)await updateOfflineTrackVisuals(savedTrack.trackId,artworkBlob,avatarBlob);
        if(artworkBlob&&!savedTrack.artworkUrl100){setOfflineTracks(current=>current.map(track=>track.trackId===savedTrack.trackId?{...track,artworkUrl100:URL.createObjectURL(artworkBlob!)}:track));}
        if(sourceTrack.artistId&&profile&&avatarBlob){void cacheOfflineAsset(`artist-profile:${sourceTrack.artistId}`,avatarBlob,{...profile,avatarUrl:""});setArtistProfiles(current=>({...current,[sourceTrack.artistId!]:{...profile,avatarUrl:URL.createObjectURL(avatarBlob!)}}));}
      }
    })().catch(error=>console.warn("Offline visual repair could not finish:",error));
    return()=>{cancelled=true;};
  },[storageReady,offlineTracks,studioTracks,artistProfiles]);

  useEffect(() => {
    try {
      if(typeof indexedDB!=="undefined"){void Promise.all([openOfflineDb().then(db=>new Promise<any[]>((resolve,reject)=>{const req=db.transaction("tracks","readonly").objectStore("tracks").getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);})),getOfflineAssets()]).then(([rows,assets])=>{setOfflineDownloads(new Set(rows.map(row=>row.trackId)));setOfflineTracks(rows.map(row=>({trackId:row.trackId,trackName:row.trackName,artistName:row.artistName,artworkUrl100:row.artworkBlob instanceof Blob?URL.createObjectURL(row.artworkBlob):"",artistId:row.artistId,studioTrackId:row.studioTrackId,primaryGenreName:row.primaryGenreName,collectionName:row.collectionName,allowDownloads:row.allowDownloads!==false,trackViewUrl:row.trackViewUrl||window.location.href,source:"studio",trackExplicitness:row.trackExplicitness} as Track)));const cachedProfiles:Record<string,any>={};for(const row of rows){if(row.artistId&&row.artistProfile){cachedProfiles[row.artistId]={...row.artistProfile,avatarUrl:row.artistAvatarBlob instanceof Blob?URL.createObjectURL(row.artistAvatarBlob):""};}}for(const asset of assets){if(String(asset.key).startsWith("artist-profile:")&&asset.data){const id=String(asset.key).slice("artist-profile:".length);cachedProfiles[id]={...asset.data,avatarUrl:asset.blob instanceof Blob?URL.createObjectURL(asset.blob):""};}}if(Object.keys(cachedProfiles).length)setArtistProfiles(current=>({...cachedProfiles,...current}));}).catch(error=>console.warn("Offline visual assets could not be restored:",error));}
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
        await Promise.all((artistRows||[]).map(async(artist:any)=>{let avatarUrl="";let avatarBlob:Blob|null=null;if(artist.avatar_path){const path=artist.avatar_path.split("/").map(encodeURIComponent).join("/");const response=await fetch(`${base}/storage/v1/object/sign/studio-artwork/${path}`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({expiresIn:3600})});if(response.ok){const data=await response.json();avatarUrl=data.signedURL?.startsWith("http")?data.signedURL:`${base}/storage/v1${data.signedURL||""}`;if(avatarUrl){try{const imageResponse=await fetch(avatarUrl,{mode:"cors",cache:"no-store"});if(imageResponse.ok){const candidate=await imageResponse.blob();if(candidate.type.startsWith("image/")&&candidate.size)avatarBlob=candidate;}}catch(error){console.warn("Artist image could not be cached:",artist.id,error);}}}}profileMap[artist.id]={...artist,avatarUrl};if(avatarBlob)void cacheOfflineAsset(`artist-profile:${artist.id}`,avatarBlob,{...artist,avatarUrl:""}).catch(error=>console.warn("Artist profile offline cache failed:",error));}));
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
          return { trackId: parseInt(numericId, 16), artistId:row.artist_id, studioTrackId:row.id, allowDownloads:row.allow_downloads!==false, storagePath:row.audio_path, trackName: row.title, artistName: artistNames.get(row.artist_id) || "AfroVibe Artist", collectionName: row.release_type || "Single", artworkUrl100: artwork, audioUrl: audio, trackViewUrl: window.location.href, primaryGenreName: row.genre, source: "studio", trackExplicitness: row.explicit_content?.toLowerCase().includes("explicit") ? "explicit" : "clean" } as Track;
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
    const requestId = ++playRequestRef.current;
    if (current?.trackId === track.trackId && !audio.paused) {
      audio.pause();
      return;
    }
    if (current?.trackId === track.trackId && audio.paused) {
      await audio.play();
      return;
    }
    audio.pause();
    if(tempoRampRef.current!==null){cancelAnimationFrame(tempoRampRef.current);tempoRampRef.current=null;}
    if(activeObjectUrlRef.current){URL.revokeObjectURL(activeObjectUrlRef.current);activeObjectUrlRef.current=null;}
    const offlineBlob=await getOfflineBlob(track.trackId);
    if(requestId!==playRequestRef.current)return;
    if(!offlineBlob&&!track.audioUrl){notify("This song is not saved offline. Connect to the internet to play it.");return;}
    if(!offlineBlob&&!navigator.onLine){notify("This song is not saved offline. Connect to the internet to play or download it.");return;}
    audio.crossOrigin = "anonymous";
    if(offlineBlob){activeObjectUrlRef.current=URL.createObjectURL(offlineBlob);audio.src=activeObjectUrlRef.current;}else{audio.src=track.audioUrl;}
    let savedPreferences: Record<string, unknown> = {};
    try { savedPreferences = JSON.parse(localStorage.getItem("afrovibez.preferences.v1") || "{}"); } catch {}
    audio.volume = Math.max(0, Math.min(100, Number(savedPreferences.volume ?? 85))) / 100;
    const selectedMode = keepAudioMode ? audioMode : ((savedPreferences.defaultMode as typeof audioMode) || "normal");
    setAudioMode(selectedMode);
    const modeRate=selectedMode==="sped"?1.25:selectedMode==="slowed"?.8:selectedMode==="nightcore"?1.35:selectedMode==="daycore"?.85:1;
    // Mode rate and slider rate are two representations of one setting, not multipliers.
    const effectiveRate=Math.max(.5,Math.min(2,keepAudioMode?playSpeed:modeRate));
    setPlaySpeed(effectiveRate);
    audio.preservesPitch=true;audio.playbackRate=1;
    const activeEffects=bassLevel>0||subBassLevel>0||bassPunch>0||distortionEnabled||reverbEnabled||delayEnabled||lowPass>0||highPass>0||pitch!==0||effectiveRate!==1;
    if(activeEffects||effectNodesRef.current){try{const context=await ensureAudioGraph();const nodes=effectNodesRef.current!;audio.preservesPitch=false;audio.playbackRate=effectiveRate;nodes.soundTouch.parameters.get("playbackRate")?.setValueAtTime(effectiveRate,context.currentTime);nodes.soundTouch.parameters.get("pitchSemitones")?.setValueAtTime(pitch,context.currentTime);await updateAudioEffects({bass:bassLevel,bassFrequency,bassQ,subBass:subBassLevel,punch:bassPunch,distortion:distortionEnabled,reverb:reverbEnabled,delay:delayEnabled,lowPass,highPass});}catch(error){notify(error instanceof Error?error.message:"Audio processing could not start. Playing the original audio instead.","warning");audio.preservesPitch=true;audio.playbackRate=effectiveRate;}}
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
      const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if(!base||!key||!track.studioTrackId)throw new Error("This release is missing its download information. Refresh AfroVibez and try again.");
      // Re-check the artist's current permission immediately before saving. The catalogue
      // can stay open for hours, so a cached permission must never override a new lock.
      const check=await fetch(`${base}/rest/v1/studio_tracks?select=status,allow_downloads,audio_path&id=eq.${track.studioTrackId}`,{headers:{apikey:key,Authorization:`Bearer ${key}`},cache:"no-store"});
      if(!check.ok)throw new Error("We couldn't verify this artist's download setting. Please try again.");
      const rows=await check.json();
      const latest=rows?.[0];
      if(!latest||latest.status!=="approved")throw new Error("This release is no longer available for download.");
      if(latest.allow_downloads===false)throw new Error("🔒 The artist has locked downloads for this release. You can still stream it.");
      const path=String(latest.audio_path||track.storagePath||"");
      if(!path)throw new Error("The original audio file could not be located.");
      // Mint a fresh signed URL at download time. A URL created when the catalogue
      // first loaded may have expired while the listener kept the app open.
      const encoded=path.split("/").map(encodeURIComponent).join("/");
      const sign=await fetch(`${base}/storage/v1/object/sign/studio-audio/${encoded}`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({expiresIn:600})});
      if(!sign.ok)throw new Error(`The audio download link could not be prepared (HTTP ${sign.status}). Please try again.`);
      const signed=await sign.json();
      const downloadUrl=signed.signedURL?.startsWith("http")?signed.signedURL:`${base}/storage/v1${signed.signedURL||""}`;
      if(!downloadUrl)throw new Error("The audio download link was empty. Please try again.");
      const response=await fetch(downloadUrl,{mode:"cors",cache:"no-store"});
      if(!response.ok)throw new Error(`Audio download failed (HTTP ${response.status}). Please try again.`);
      const headerLength=Number(response.headers.get("content-length"));
      const total=Number.isFinite(headerLength)&&headerLength>0?headerLength:null;
      let blob:Blob;
      if(response.body&&typeof response.body.getReader==="function"){
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
      if(!track.artworkUrl100)throw new Error("This release has no cover artwork available to save.");
      const artworkResponse=await fetch(track.artworkUrl100,{mode:"cors",cache:"no-store"});
      if(!artworkResponse.ok)throw new Error("We could not save this song’s cover artwork. Please retry while connected so the offline download includes its artwork.");
      const artworkBlob=await artworkResponse.blob();
      if(!artworkBlob.type.startsWith("image/")||!artworkBlob.size)throw new Error("The cover artwork could not be saved as an image. Please retry the download.");
      const profile=track.artistId?artistProfiles[track.artistId]:null;
      let artistAvatarBlob:Blob|null=null;
      if(profile?.avatar_path){try{const avatarPath=String(profile.avatar_path).split("/").map(encodeURIComponent).join("/");const avatarSign=await fetch(`${base}/storage/v1/object/sign/studio-artwork/${avatarPath}`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({expiresIn:600})});if(avatarSign.ok){const avatarData=await avatarSign.json();const avatarUrl=avatarData.signedURL?.startsWith("http")?avatarData.signedURL:`${base}/storage/v1${avatarData.signedURL||""}`;if(avatarUrl){const avatarResponse=await fetch(avatarUrl,{mode:"cors",cache:"no-store"});if(avatarResponse.ok){const candidate=await avatarResponse.blob();if(candidate.type.startsWith("image/")&&candidate.size)artistAvatarBlob=candidate;}}}}catch(avatarError){console.warn("Artist avatar could not be cached for offline use:",avatarError);}}
      const profileSnapshot=profile?{...profile,avatarUrl:""}:null;
      if(track.artistId&&artistAvatarBlob&&profileSnapshot)await cacheOfflineAsset(`artist-profile:${track.artistId}`,artistAvatarBlob,profileSnapshot);
      await saveOfflineBlob({...track,storagePath:path},blob,artworkBlob,profileSnapshot,artistAvatarBlob);
      setOfflineDownloads(prev=>new Set(Array.from(prev).concat(track.trackId)));
      setOfflineTracks(prev=>{const previous=prev.find(item=>item.trackId===track.trackId);if(previous?.artworkUrl100?.startsWith("blob:"))URL.revokeObjectURL(previous.artworkUrl100);return prev.filter(item=>item.trackId!==track.trackId).concat({...track,artworkUrl100:URL.createObjectURL(artworkBlob),storagePath:path,audioUrl:undefined});});
      if(track.artistId&&profile){setArtistProfiles(prev=>({...prev,[track.artistId!]:{...profile,avatarUrl:artistAvatarBlob?URL.createObjectURL(artistAvatarBlob):""}}));}
      notify("Ready whenever you are. Find it in your Downloads.", "success", "Saved for offline listening");
    }catch(error:any){
      const message=error?.message||"Your download couldn't be completed. Please try again.";
      notify(message.includes("Failed to fetch")?"Your device couldn't reach the audio file. Check your connection and try again. If it keeps happening, the storage download connection needs fixing.":message,"error","Download failed");
    }finally{setOfflineBusy(null);setDownloadProgress(null);}
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

  const openAudioMod = () => {
    setPlayerToolsOpen(false);
    setAudioModOpen(true);
  };

  const effectNodesRef = useRef<{source:MediaElementAudioSourceNode; soundTouch:AudioWorkletNode; bass:BiquadFilterNode; subBass:BiquadFilterNode; punch:BiquadFilterNode; low:BiquadFilterNode; high:BiquadFilterNode; distortion:WaveShaperNode; delay:DelayNode; delayWet:GainNode; delayFeedback:GainNode; dry:GainNode; convolver:ConvolverNode; reverbWet:GainNode; compressor:DynamicsCompressorNode} | null>(null);
  const ensureAudioGraph = async () => {
    if (effectNodesRef.current && audioContextRef.current) { await audioContextRef.current.resume(); return audioContextRef.current; }
    if (audioGraphInitRef.current) return audioGraphInitRef.current;
    const init = (async () => {
      const audio = audioRef.current;
      if (!audio) throw new Error("Start a track before changing sound effects.");
      let context = audioContextRef.current;
      if (!context) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) throw new Error("Audio effects are not supported in this browser.");
      context = new AudioContextClass();
      const { SoundTouchNode } = await import("@soundtouchjs/audio-worklet");
      const processorUrl = new URL("@soundtouchjs/audio-worklet/processor", import.meta.url);
      await SoundTouchNode.register(context, processorUrl);
      const source = context.createMediaElementSource(audio);
      const soundTouch = new SoundTouchNode({ context });
      const subBass = context.createBiquadFilter(); subBass.type="lowshelf"; subBass.frequency.value=55; subBass.Q.value=0.8;
      const bass = context.createBiquadFilter(); bass.type="lowshelf"; bass.frequency.value=bassFrequency; bass.Q.value=bassQ;
      const punch = context.createBiquadFilter(); punch.type="peaking"; punch.frequency.value=115; punch.Q.value=1.05; punch.gain.value=0;
      const distortion = context.createWaveShaper(); distortion.oversample="4x";
      const high = context.createBiquadFilter(); high.type="highpass"; high.frequency.value=20;
      const low = context.createBiquadFilter(); low.type="lowpass"; low.frequency.value=20000;
      const delay = context.createDelay(1.5); delay.delayTime.value=.28;
      const delayWet = context.createGain(); delayWet.gain.value=0;
      const delayFeedback = context.createGain(); delayFeedback.gain.value=.18;
      const dry = context.createGain(); dry.gain.value=1;
      const convolver = context.createConvolver();
      const impulseLength=Math.floor(context.sampleRate*2.2);
      const impulse=context.createBuffer(2,impulseLength,context.sampleRate);
      for(let channel=0;channel<2;channel++){
        const data=impulse.getChannelData(channel);
        for(let i=0;i<impulseLength;i++) data[i]=(Math.random()*2-1)*Math.pow(1-i/impulseLength,2.8);
      }
      convolver.buffer=impulse;
      const reverbWet=context.createGain(); reverbWet.gain.value=0;
      const compressor=context.createDynamicsCompressor();
      compressor.threshold.value=-12; compressor.knee.value=18; compressor.ratio.value=3.5; compressor.attack.value=.004; compressor.release.value=.18;
      source.connect(soundTouch);
      soundTouch.connect(subBass);
      subBass.connect(bass);
      bass.connect(punch);
      punch.connect(distortion);
      distortion.connect(high);
      high.connect(low);
      low.connect(dry); dry.connect(compressor);
      low.connect(delay); delay.connect(delayWet); delayWet.connect(compressor);
      delay.connect(delayFeedback); delayFeedback.connect(delay);
      low.connect(convolver); convolver.connect(reverbWet); reverbWet.connect(compressor);
      compressor.connect(context.destination);
      audioContextRef.current=context;
      bassFilterRef.current=bass;
      effectNodesRef.current={source,soundTouch,bass,subBass,punch,low,high,distortion,delay,delayWet,delayFeedback,dry,convolver,reverbWet,compressor};
      }
      await context.resume();
      return context;
    })();
    audioGraphInitRef.current=init;
    try { return await init; }
    catch(error) { audioGraphInitRef.current=null; audioContextRef.current=null; effectNodesRef.current=null; throw error; }
  };
  const setTempo = async (value:number) => {
    const rate=Math.max(.5,Math.min(2,Number(value)||1));
    setPlaySpeed(rate);
    const audio=audioRef.current;
    if(!audio) throw new Error("Start a track before changing playback speed.");
    try {
      const context=await ensureAudioGraph();
      const nodes=effectNodesRef.current;
      if(!nodes) throw new Error("The audio processor could not be connected.");
      // The SoundTouch worklet expects the media-element rate and its matching
      // playbackRate parameter to be equal; it compensates pitch internally.
      audio.preservesPitch=false;
      if(tempoRampRef.current!==null)cancelAnimationFrame(tempoRampRef.current);
      const startRate=Math.max(.5,Math.min(2,audio.playbackRate||1));
      const started=performance.now();
      const duration=220;
      const param=nodes.soundTouch.parameters.get("playbackRate");
      const step=(now:number)=>{
        const progress=Math.min(1,(now-started)/duration);
        const eased=progress*progress*(3-2*progress);
        const next=startRate+(rate-startRate)*eased;
        audio.playbackRate=next;
        param?.setValueAtTime(next,context.currentTime);
        if(progress<1)tempoRampRef.current=requestAnimationFrame(step);
        else {tempoRampRef.current=null;audio.playbackRate=rate;param?.setValueAtTime(rate,context.currentTime);}
      };
      tempoRampRef.current=requestAnimationFrame(step);
    } catch(error) {
      // Keep basic pitch-preserving speed available if AudioWorklet cannot start.
      audio.preservesPitch=true;
      audio.playbackRate=rate;
      throw error;
    }
  };
  const setPitchSemitones = async (value:number) => {
    const semitones=Math.max(-12,Math.min(12,Math.round(value)));
    setPitch(semitones);
    const context=await ensureAudioGraph();
    const param=effectNodesRef.current?.soundTouch.parameters.get("pitchSemitones");
    if(!param) throw new Error("Pitch processing is unavailable.");
    param.setValueAtTime(semitones,context.currentTime);
  };
  const updateAudioEffects = async (next:{bass?:number;bassFrequency?:number;bassQ?:number;subBass?:number;punch?:number;distortion?:boolean;reverb?:boolean;delay?:boolean;lowPass?:number;highPass?:number}) => {
    const context=await ensureAudioGraph();
    const nodes=effectNodesRef.current!;
    const now=context.currentTime;
    if(next.bass!==undefined) nodes.bass.gain.setTargetAtTime(Math.max(0,Math.min(100,next.bass))*.12,now,.06);
    if(next.bassFrequency!==undefined) nodes.bass.frequency.setTargetAtTime(Math.max(40,Math.min(250,next.bassFrequency)),now,.06);
    if(next.bassQ!==undefined) nodes.bass.Q.setTargetAtTime(Math.max(.4,Math.min(2.5,next.bassQ)),now,.06);
    if(next.subBass!==undefined) nodes.subBass.gain.setTargetAtTime(Math.max(0,Math.min(100,next.subBass))*.1,now,.08);
    if(next.punch!==undefined) nodes.punch.gain.setTargetAtTime(Math.max(0,Math.min(100,next.punch))*.09,now,.08);
    if(next.distortion!==undefined){
      const amount=next.distortion?28:0;
      const curve=new Float32Array(44100);
      for(let i=0;i<curve.length;i++){
        const x=i*2/(curve.length-1)-1;
        curve[i]=next.distortion?((1+amount)*x)/(1+amount*Math.abs(x)):x;
      }
      nodes.distortion.curve=next.distortion?curve:null;
    }
    if(next.reverb!==undefined) nodes.reverbWet.gain.setTargetAtTime(next.reverb?.18:0,now,.12);
    if(next.delay!==undefined) nodes.delayWet.gain.setTargetAtTime(next.delay?.16:0,now,.12);
    if(next.lowPass!==undefined) nodes.low.frequency.setTargetAtTime(next.lowPass?Math.max(350,20000-next.lowPass*190):20000,now,.08);
    if(next.highPass!==undefined) nodes.high.frequency.setTargetAtTime(next.highPass?Math.min(6000,20+next.highPass*59.8):20,now,.08);
  };
  const setBass = async (value:number) => {
    setBassLevel(value);
    setBassBoostEnabled(value>0);
    try{await updateAudioEffects({bass:value,bassFrequency,bassQ,subBass:subBassLevel,punch:bassPunch});}
    catch(error){notify(error instanceof Error?error.message:"Bass control is unavailable for this playback.","warning","Audio effect unavailable");}
  };
  const toggleBassBoost = () => {
    setPlayerToolsOpen(false);
    setBassStudioOpen(true);
  };
  const resetAudioMod = () => {
    if(tempoRampRef.current!==null){cancelAnimationFrame(tempoRampRef.current);tempoRampRef.current=null;}
    setAudioMode("normal");
    setBassFrequency(90);setBassQ(.7);
    setBassLevel(0); setBassBoostEnabled(false); setSubBassLevel(0); setBassPunch(0); setDistortionEnabled(false);
    setReverbEnabled(false); setDelayEnabled(false); setPitch(0); setLowPass(0); setHighPass(0); setPlaySpeed(1);
    const context=audioContextRef.current;
    const nodes=effectNodesRef.current;
    if(audioRef.current){audioRef.current.playbackRate=1;audioRef.current.preservesPitch=Boolean(nodes);}
    if(context&&nodes){
      const now=context.currentTime;
      nodes.soundTouch.parameters.get("playbackRate")?.setValueAtTime(1,now);
      nodes.soundTouch.parameters.get("pitchSemitones")?.setValueAtTime(0,now);
      void updateAudioEffects({bass:0,bassFrequency:90,bassQ:.7,subBass:0,punch:0,distortion:false,reverb:false,delay:false,lowPass:0,highPass:0});
    }
  };
  const chooseAudioPreset = (preset:string) => {
    const presets:Record<string,{speed:number;bass:number;pitch:number;distort:boolean;reverb:boolean;delay:boolean;low:number;high:number}> = {
      "Sped Up":{speed:1.25,bass:0,pitch:0,distort:false,reverb:false,delay:false,low:0,high:0},
      "Nightcore":{speed:1.35,bass:0,pitch:2,distort:false,reverb:false,delay:false,low:0,high:0},
      "Slowed & Reverb":{speed:.8,bass:10,pitch:-2,distort:false,reverb:true,delay:true,low:0,high:0},
      "Slowed":{speed:.8,bass:0,pitch:-2,distort:false,reverb:false,delay:false,low:0,high:0},
      "Daycore":{speed:.85,bass:0,pitch:-3,distort:false,reverb:true,delay:false,low:0,high:0},
      "Muffled":{speed:1,bass:0,pitch:0,distort:false,reverb:false,delay:false,low:65,high:0}
    };
    const p=presets[preset]; if(!p)return;
    if(tempoRampRef.current!==null){cancelAnimationFrame(tempoRampRef.current);tempoRampRef.current=null;}
    setBassLevel(p.bass); setBassBoostEnabled(p.bass>0); setSubBassLevel(0); setBassPunch(0); setPitch(p.pitch);
    setDistortionEnabled(p.distort); setReverbEnabled(p.reverb); setDelayEnabled(p.delay); setLowPass(p.low); setHighPass(p.high);
    void (async()=>{
      try{
        await setTempo(p.speed);
        const context=audioContextRef.current!;
        const nodes=effectNodesRef.current!;
        nodes.soundTouch.parameters.get("pitchSemitones")?.setValueAtTime(p.pitch,context.currentTime);
        await updateAudioEffects({bass:p.bass,subBass:0,punch:0,distortion:p.distort,reverb:p.reverb,delay:p.delay,lowPass:p.low,highPass:p.high});
        notify(preset+" preset applied.");
      }catch(error){notify(error instanceof Error?error.message:"Could not apply this preset.","error");}
    })();
  };
  const applyAudioMode = (mode: typeof audioMode) => {
    setAudioMode(mode);
    const rate=mode==="sped"?1.25:mode==="slowed"?.8:mode==="nightcore"?1.35:mode==="daycore"?.85:1;
    void setTempo(rate).catch(error=>notify(error instanceof Error?error.message:"Tempo processing is unavailable.","error"));
    notify(mode === "normal" ? "Original speed" : `${mode === "sped" ? "Sped Up" : mode === "slowed" ? "Slowed" : mode === "nightcore" ? "Nightcore" : "Daycore"} mode enabled`);
  };

  const moveQueuedTrack = (from:number,to:number) => {
    if(from===to||from<0||to<0||from>=queue.length||to>=queue.length)return;
    setQueue(previous=>{const next=[...previous];const [item]=next.splice(from,1);next.splice(to,0,item);localStorage.setItem("afrovibez.queue.v1",JSON.stringify(next));return next;});setQueueDragIndex(null);
  };
  const loadTrackComments = async (track:Track) => {
    if(!track.studioTrackId){setTrackComments([]);return;}
    const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!base||!key)return;
    try{const response=await fetch(`${base}/rest/v1/listener_track_comments?track_id=eq.${track.studioTrackId}&select=id,user_id,parent_id,display_name,body,created_at&order=created_at.asc`,{headers:{apikey:key}});if(!response.ok)throw new Error("Comments could not be loaded.");const rows=await response.json();setTrackComments(rows);const ids=rows.map((r:any)=>r.id);if(ids.length){const token=await ensureListenerAccessToken();const rr=await fetch(`${base}/rest/v1/listener_comment_reactions?comment_id=in.(${ids.join(",")})&select=comment_id,reaction`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});if(rr.ok){const counts:Record<string,{likes:number;dislikes:number}>={};for(const r of await rr.json()){counts[r.comment_id]??={likes:0,dislikes:0};if(r.reaction==="like")counts[r.comment_id].likes++;else counts[r.comment_id].dislikes++;}setCommentReactions(counts);}}}catch(e){console.warn("Comments unavailable",e);}
  };
  const submitTrackComment = async () => {
    if(!current||!commentDraft.trim()||commentBusy)return;if(!current.studioTrackId){notify("Comments are available on AfroVibe Studio releases.","warning");return;}
    const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!base||!key)return;setCommentBusy(true);
    try{const token=await ensureListenerAccessToken();const ur=await fetch(`${base}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});if(!ur.ok)throw new Error("Sign in to comment.");const user=await ur.json();const name=String(user.user_metadata?.display_name||user.user_metadata?.full_name||user.email?.split("@")[0]||"Listener").slice(0,60);const r=await fetch(`${base}/rest/v1/listener_track_comments`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({track_id:current.studioTrackId,user_id:user.id,parent_id:replyToComment,display_name:name,body:commentDraft.trim()})});if(!r.ok)throw new Error(await r.text());setCommentDraft("");setReplyToComment(null);await loadTrackComments(current);notify("Comment posted.");}catch(e:any){notify(e?.message||"Could not post comment.","error");}finally{setCommentBusy(false);}
  };
  const reactToComment = async (id:string,reaction:"like"|"dislike") => {
    const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!base||!key)return;try{const token=await ensureListenerAccessToken();const ur=await fetch(`${base}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});if(!ur.ok)throw new Error("Sign in to react.");const user=await ur.json();const r=await fetch(`${base}/rest/v1/listener_comment_reactions`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({comment_id:id,user_id:user.id,reaction})});if(!r.ok)throw new Error(await r.text());if(current)await loadTrackComments(current);}catch(e:any){notify(e?.message||"Could not save reaction.","error");}
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
        <button className="track-artist-link" onClick={(e)=>{e.stopPropagation();openArtistProfile(track);}}>{track.artistName}</button>
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
            <Home size={19} /> {t("Discover")}
          </button>
          <button
            className={"nav-item " + (view === "charts" ? "active" : "")}
            onClick={() => { setView("charts"); setMobileNav(false); }}
          >
            <BarChart3 size={19} /> {t("Charts")}
          </button>
          <button className={"nav-item " + (view === "search" ? "active" : "")} onClick={() => { setView("search"); setMobileNav(false); }}><Search size={19}/> {t("Search")}</button>
          <button className={"nav-item " + (view === "feed" ? "active" : "")} onClick={() => { setView("feed"); setMobileNav(false); }}><Radio size={19}/> {t("Feed")}</button>
          <button
            className={"nav-item " + (view === "library" ? "active" : "")}
            onClick={() => { setView("library"); setMobileNav(false); }}
          >
            <Library size={19} /> {t("Your library")}
          </button>
          <button className={"nav-item " + (view==="queue"?"active":"")} onClick={()=>{setView("queue");setMobileNav(false);}}><ListOrdered size={19}/> {t("Your queue")}</button>
          <a className="nav-item" href="/settings" onClick={() => setMobileNav(false)}>
            <Settings size={19} /> {t("Settings")}
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
              <section className="discovery-picks" aria-labelledby="discovery-picks-title">
                <div className="discovery-picks-heading">
                  <div>
                    <span className="eyebrow dark">{t("DISCOVER")}</span>
                    <h2 id="discovery-picks-title">{t("Find something new")}</h2>
                  </div>
                  <button className="discovery-see-all" onClick={() => { setView("search"); setMobileNav(false); }}>
                    {t("See all")} <span aria-hidden="true">→</span>
                  </button>
                </div>
                {loading ? (
                  <div className="discovery-picks-loading"><LoaderCircle className="spin" size={20} /> {t("Loading music…")}</div>
                ) : visibleTracks.length ? (
                  <div className="discovery-picks-list">
                    {visibleTracks.slice(0, 4).map((track, index) => (
                      <article className="discovery-pick" key={track.trackId}>
                        <button className="discovery-pick-main" onClick={() => void playTrack(track)} disabled={!track.audioUrl && !offlineDownloads.has(track.trackId)}>
                          <img src={artworkUrl(track, "100x100", "100x100")} alt="" loading={index < 2 ? "eager" : "lazy"} />
                          <span className="discovery-pick-copy">
                            <strong title={track.trackName}>{track.trackName}</strong>
                            <span>{track.artistName}</span>
                          </span>
                        </button>
                        <button className="icon-btn discovery-pick-more" onClick={() => setMenuTrack(track)} aria-label={t("More track options")}><MoreVertical size={20} /></button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="row-empty">{t("No approved tracks are available yet. New releases will appear here.")}</div>
                )}
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
                <p>Ranked using verified plays of at least 30 seconds. No paid plan or artificial chart positions.</p>
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
                  <span>Charts appear as soon as approved releases receive verified 30-second listens. No artificial rankings.</span>
                </div>
              )}
            </section>
          )}

          {view === "search" && (
            <section className="library-view search-view">
              <div className="search-title-row"><div className="section-heading"><div><div className="eyebrow dark">FIND YOUR NEXT FAVOURITE</div><h2>Search music</h2><p>Search approved songs, artists and genres across AfroVibez.</p></div></div><button className="country-trigger" type="button" onClick={()=>{setCountrySearch("");setCountryPickerOpen(true);}} onPointerDown={()=>{setCountrySearch("");setCountryPickerOpen(true);}} aria-label={`Explore by country: ${countryOptions.find(c=>c.code===selectedCountry)?.name || "United States"}`} aria-haspopup="dialog" aria-expanded={countryPickerOpen}><img className="country-flag-image" src={countryOptions.find(c=>c.code===selectedCountry)?.flagUrl||countryFlagUrl("US")} alt="" aria-hidden="true"/><ChevronDown size={15}/></button></div>
              <form className="search-page-form" onSubmit={submitSearch}><Search size={19}/><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Songs, artists, albums or genres…" aria-label="Search songs artists albums or genres"/><button type="submit">Search</button></form>
              {!query.trim() ? <><div className="search-section-title"><strong>Browse genres</strong><span>Explore by sound</span></div><div className="search-genre-grid">{categories.filter(c=>c!=="All").slice(0,20).map(c=><button key={c} onClick={()=>{setCategory(c);setQuery("");setInput("");setView("discover");}}>{c}<span>↗</span></button>)}</div>{recentSearches.length>0&&<div className="recent-searches"><div className="search-section-title"><strong>Recent searches</strong><button onClick={()=>setRecentSearches([])}>Clear</button></div>{recentSearches.map(term=><button key={term} onClick={()=>{setInput(term);setQuery(term);setCategory("All");}}><Search size={14}/>{term}</button>)}</div>}<div className="search-section-title"><strong>Recently added</strong><span>Fresh from AfroVibe Studio</span></div><div className="track-grid">{studioTracks.slice(0,8).map((track,index)=><TrackCard key={track.trackId} track={track} index={index}/>)}</div></> : <><div className="search-section-title"><strong>Results for “{query}”</strong><span>{visibleTracks.length} results</span></div>{visibleTracks.length?<div className="track-grid">{visibleTracks.map((track,index)=><TrackCard key={track.trackId} track={track} index={index}/>)}</div>:<div className="empty-state"><Search size={28}/><strong>No matching music yet</strong><span>Try another song title, artist name or genre.</span></div>}</>}
            </section>
          )}

          {view === "feed" && (
            <section className="library-view feed-view">
              <div className="section-heading"><div><div className="eyebrow dark">{t("Your music community")}</div><h2>{t("Following feed")}</h2><p>{t("New releases from artists you follow.")}</p></div></div>
              {followedArtists.length ? <><div className="feed-following-note">Following {followedArtists.length} {followedArtists.length===1?"artist":"artists"}: {followedArtists.join(", ")}</div>{studioTracks.filter(t=>(t.artistId&&followedArtistIds.includes(t.artistId))||followedArtists.includes(t.artistName)).length ? <div className="track-grid">{studioTracks.filter(t=>(t.artistId&&followedArtistIds.includes(t.artistId))||followedArtists.includes(t.artistName)).map((track,index)=><TrackCard key={track.trackId} track={track} index={index}/>)}</div> : <div className="empty-state"><Radio size={28}/><strong>No new releases from your artists yet</strong><span>When artists you follow publish music, it will appear here.</span></div>}</> : <div className="bottom-callout"><div className="callout-icon"><Radio size={23}/></div><div><strong>Your feed starts with artists you follow</strong><p>Open a song’s More menu or artist profile and choose Follow. Their new approved releases will appear here.</p></div><button className="feed-discover-button" onClick={()=>setView("discover")}>Discover artists</button></div>}
            </section>
          )}

          {view === "queue" && (
            <section className="library-view"><div className="section-heading"><div><div className="eyebrow dark">UP NEXT</div><h2>Your queue</h2><p>{queue.length} tracks waiting.</p></div></div>
              {queue.length ? <div className="charts-list af-queue-list">{queue.map((t,i)=><article className={`chart-row af-queue-row ${queueDragIndex===i?"is-dragging":""}`} key={t.trackId} data-queue-index={i} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(queueDragIndex!==null)moveQueuedTrack(queueDragIndex,i);}}><div className="chart-cover"><img src={t.artworkUrl100} alt=""/></div><div className="chart-info" onClick={()=>void playTrack(t)}><strong>{t.trackName}</strong><span>{t.artistName}</span></div><button className="icon-btn" aria-label="More song options" onClick={()=>setMenuTrack(t)}><MoreVertical size={20}/></button><button className="af-queue-drag" draggable onDragStart={()=>setQueueDragIndex(i)} onDragEnd={()=>setQueueDragIndex(null)} onTouchStart={()=>setQueueDragIndex(i)} onTouchEnd={e=>{const touch=e.changedTouches[0];const target=document.elementFromPoint(touch.clientX,touch.clientY)?.closest("[data-queue-index]") as HTMLElement|null;const to=target?Number(target.dataset.queueIndex):-1;if(queueDragIndex!==null&&to>=0)moveQueuedTrack(queueDragIndex,to);else setQueueDragIndex(null);}} aria-label={`Reorder ${t.trackName}`}><span/><span/><span/></button></article>)}</div>:<div className="bottom-callout"><strong>Your queue is empty</strong><p>Use a song’s options menu to add tracks.</p></div>}
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
      {countryPickerOpen && <div className="country-picker-backdrop" role="presentation" onClick={()=>setCountryPickerOpen(false)}><section className="country-picker" role="dialog" aria-modal="true" aria-label="Select music country" onClick={e=>e.stopPropagation()}><header><div><small>{t("Explore music by region")}</small><h2>{t("Select a country")}</h2></div><button type="button" onClick={()=>setCountryPickerOpen(false)} aria-label="Close country selector"><X size={20}/></button></header><input className="country-picker-search" value={countrySearch} onChange={e=>setCountrySearch(e.target.value)} placeholder={t("Search countries…")} aria-label={t("Search countries…")}/><div className="country-picker-list">{countryOptions.filter(country=>country.name.toLowerCase().includes(countrySearch.trim().toLowerCase())).map(country=><button type="button" key={country.code} className={selectedCountry===country.code?"selected":""} onClick={()=>{setSelectedCountry(country.code);localStorage.setItem("afrovibez.explore-country.v1",country.code);setCountryPickerOpen(false);notify(`Music region set to ${country.name}.`);}}><img className="country-option-flag" src={country.flagUrl} alt="" aria-hidden="true"/><span>{country.name}</span>{selectedCountry===country.code&&<span className="country-option-check">✓</span>}</button>)}</div></section></div>}

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
      {playerToolsOpen && current && (
        <div className="af-tools-backdrop" role="presentation" onClick={()=>setPlayerToolsOpen(false)}>
          <section className="af-tools-sheet" role="dialog" aria-modal="true" aria-label="Playback tools" onClick={e=>e.stopPropagation()}>
            <div className="af-tools-grid">
              <button className={bassBoostEnabled?"active":""} aria-pressed={bassBoostEnabled} onClick={toggleBassBoost}><Volume2/><span>Bass Boost</span></button>
              <button onClick={openAudioMod}><Music2/><span>Audiomod</span></button>
              <button className={sleepTimerMinutes?"active":""} onClick={()=>setSleepTimerOpen(true)}><Settings/><span>{sleepTimerMinutes ? "Sleep "+sleepTimerMinutes+"m" : "Sleep Timer"}</span></button>
            </div>
            <button className="af-tools-close" onClick={()=>setPlayerToolsOpen(false)}>Close</button>
          </section>
        </div>
      )}
      {bassStudioOpen && current && (
        <div className="af-tools-backdrop af-audiomod-backdrop" role="presentation" onClick={()=>setBassStudioOpen(false)}>
          <section className="af-bass-studio" role="dialog" aria-modal="true" aria-label="Bass Boost studio" onClick={e=>e.stopPropagation()}>
            <header><button onClick={()=>setBassStudioOpen(false)} aria-label="Close bass studio"><ChevronLeft/></button><strong>Bass Studio</strong><button onClick={()=>{setBassLevel(0);setBassBoostEnabled(false);setSubBassLevel(0);setBassPunch(0);setBassQ(.7);setBassFrequency(90);void updateAudioEffects({bass:0,subBass:0,punch:0,bassQ:.7,bassFrequency:90}).catch(error=>notify(error instanceof Error?error.message:"Bass reset failed.","error"));}}>Reset</button></header>
            <p>Shape the low end with separate sub-bass, body and punch controls. Changes apply live while it plays.</p>
            <div className="af-bass-enable"><div><strong>Bass Boost</strong><small>Enable the low-frequency enhancement chain</small></div><input type="checkbox" checked={bassBoostEnabled||subBassLevel>0||bassPunch>0} onChange={e=>{if(!e.target.checked){setBassLevel(0);setSubBassLevel(0);setBassPunch(0);setBassBoostEnabled(false);void updateAudioEffects({bass:0,subBass:0,punch:0});}else{void setBass(55);}}}/></div>
            <div className="af-audiomod-control"><strong>Main bass intensity</strong><div className="af-range-row"><input type="range" min="0" max="100" value={bassLevel} onChange={e=>void setBass(Number(e.target.value))}/><b>{bassLevel}%</b></div></div>
            <div className="af-audiomod-control"><strong>Sub-bass depth · 55 Hz</strong><div className="af-range-row"><input type="range" min="0" max="100" value={subBassLevel} onChange={e=>{const value=Number(e.target.value);setSubBassLevel(value);void updateAudioEffects({subBass:value}).catch(error=>notify(error instanceof Error?error.message:"Sub-bass control unavailable.","error"));}}/><b>{subBassLevel}%</b></div></div>
            <div className="af-audiomod-control"><strong>Kick punch · 115 Hz</strong><div className="af-range-row"><input type="range" min="0" max="100" value={bassPunch} onChange={e=>{const value=Number(e.target.value);setBassPunch(value);void updateAudioEffects({punch:value}).catch(error=>notify(error instanceof Error?error.message:"Punch control unavailable.","error"));}}/><b>{bassPunch}%</b></div></div>
            <div className="af-audiomod-control"><strong>Bass centre frequency</strong><div className="af-range-row"><input type="range" min="40" max="250" step="5" value={bassFrequency} onChange={e=>{const value=Number(e.target.value);setBassFrequency(value);void updateAudioEffects({bass:bassLevel,bassFrequency:value}).catch(error=>notify(error instanceof Error?error.message:"Frequency control unavailable.","error"));}}/><b>{bassFrequency} Hz</b></div></div>
            <div className="af-audiomod-control"><strong>Bass resonance (Q)</strong><div className="af-range-row"><input type="range" min=".4" max="2.5" step=".1" value={bassQ} onChange={e=>{const value=Number(e.target.value);setBassQ(value);void updateAudioEffects({bassQ:value}).catch(error=>notify(error instanceof Error?error.message:"Resonance control unavailable.","error"));}}/><b>{bassQ.toFixed(1)}</b></div></div>
            <button className="af-audiomod-share" onClick={()=>setBassStudioOpen(false)}>Done</button>
          </section>
        </div>
      )}
      {audioModOpen && current && (
        <div className="af-tools-backdrop af-audiomod-backdrop" role="presentation" onClick={()=>setAudioModOpen(false)}>
          <section className="af-audiomod-studio" role="dialog" aria-modal="true" aria-label="Audiomod sound studio" onClick={e=>e.stopPropagation()}>
            <header className="af-audiomod-header">
              <button onClick={()=>setAudioModOpen(false)} aria-label="Back to player"><ChevronLeft size={27}/></button>
              <strong>Audiomod</strong>
              <button className="af-audiomod-reset" onClick={resetAudioMod}>Reset</button>
            </header>
            <div className="af-audiomod-presets">
              <div className="af-audiomod-label"><strong>Select a preset</strong><label>Stay on <input type="checkbox" checked={stayOnAudioMod} onChange={e=>setStayOnAudioMod(e.target.checked)}/><span/></label></div>
              <div className="af-preset-grid">
                {["Sped Up","Nightcore","Slowed & Reverb","Slowed","Daycore","Muffled"].map((name,i)=><button key={name} className={"af-preset af-preset-"+i} onClick={()=>chooseAudioPreset(name)}>{name}</button>)}
              </div>
            </div>
            <div className="af-audiomod-control"><strong>Play Speed</strong><div className="af-range-row"><input type="range" min=".5" max="2" step=".01" value={playSpeed} onChange={e=>{void setTempo(Number(e.target.value)).catch(error=>notify(error instanceof Error?error.message:"Tempo processing is unavailable.","error"));}}/><b>{Math.round(playSpeed*100)}%</b></div></div>
            <div className="af-audiomod-toggle"><strong>Bass Boost</strong><input aria-label="Bass Boost" type="checkbox" checked={bassLevel>0} onChange={e=>void setBass(e.target.checked?65:0)}/></div>
            <div className="af-audiomod-control"><strong>Bass level</strong><div className="af-range-row"><input type="range" min="0" max="100" value={bassLevel} onChange={e=>void setBass(Number(e.target.value))}/><b>{bassLevel}%</b></div></div>
            {([{name:"Distort",value:distortionEnabled,set:setDistortionEnabled},{name:"Reverb",value:reverbEnabled,set:setReverbEnabled},{name:"Delay",value:delayEnabled,set:setDelayEnabled}] as const).map(effect=><div className="af-audiomod-toggle" key={effect.name}><strong>{effect.name}</strong><input type="checkbox" aria-label={effect.name} checked={effect.value} onChange={e=>{const enabled=e.target.checked;effect.set(enabled);void updateAudioEffects(effect.name==="Distort"?{distortion:enabled}:effect.name==="Reverb"?{reverb:enabled}:{delay:enabled}).catch(error=>notify(error instanceof Error?error.message:"Effect unavailable.","warning"));}}/></div>)}
            <div className="af-audiomod-control"><strong>Pitch</strong><div className="af-range-row"><input type="range" min="-12" max="12" step="1" value={pitch} onChange={e=>{void setPitchSemitones(Number(e.target.value)).catch(error=>notify(error instanceof Error?error.message:"Pitch processing is unavailable.","error"));}}/><b>{pitch>0?"+":""}{pitch} st</b></div></div>
            <div className="af-audiomod-control"><strong>Low Pass Filter</strong><div className="af-range-row"><input type="range" min="0" max="100" value={lowPass} onChange={e=>{const value=Number(e.target.value);setLowPass(value);void updateAudioEffects({lowPass:value}).catch(error=>notify(error instanceof Error?error.message:"Filter unavailable.","warning"));}}/><b>{lowPass}</b></div></div>
            <div className="af-audiomod-control"><strong>High Pass Filter</strong><div className="af-range-row"><input type="range" min="0" max="100" value={highPass} onChange={e=>{const value=Number(e.target.value);setHighPass(value);void updateAudioEffects({highPass:value}).catch(error=>notify(error instanceof Error?error.message:"Filter unavailable.","warning"));}}/><b>{highPass}</b></div></div>
            <button className="af-audiomod-share" onClick={()=>{setAudioModOpen(false);notify("Your sound settings are applied to the current track.");}}>Done</button>
          </section>
        </div>
      )}
      {sleepTimerOpen && current && (
        <div className="af-tools-backdrop" role="presentation" onClick={()=>setSleepTimerOpen(false)}>
          <section className="af-sleep-sheet" role="dialog" aria-modal="true" aria-label="Free sleep timer" onClick={e=>e.stopPropagation()}>
            <div className="af-sleep-heading"><strong>Sleep Timer</strong><span>Free for every listener. No subscription.</span></div>
            <div className="af-sleep-options">
              {[5,10,15,20,30,45,60,90,120].map(minutes=><button key={minutes} className={sleepTimerMinutes===minutes?"selected":""} onClick={()=>{if(sleepTimerRef.current)clearTimeout(sleepTimerRef.current);sleepTimerRef.current=setTimeout(()=>{audioRef.current?.pause();setPlaying(false);setSleepTimerMinutes(0);notify("Sleep timer finished. Playback paused.","success");},minutes*60*1000);setSleepTimerMinutes(minutes);setSleepTimerOpen(false);notify("Sleep timer set for "+minutes+" minutes.");}}>{minutes} min</button>)}
            </div>
            <div className="af-sleep-actions">
              {sleepTimerMinutes>0&&<button onClick={()=>{if(sleepTimerRef.current)clearTimeout(sleepTimerRef.current);sleepTimerRef.current=null;setSleepTimerMinutes(0);setSleepTimerOpen(false);notify("Sleep timer cancelled.");}}>Cancel timer</button>}
              <button onClick={()=>setSleepTimerOpen(false)}>Close</button>
            </div>
          </section>
        </div>
      )}
      {current && playerOpen && (
        <div className="full-player-backdrop" role="dialog" aria-modal="true" aria-label="Now playing">
          <section className="full-player af-now-playing">
            <header className="af-player-topbar">
              <button onClick={() => setPlayerOpen(false)} aria-label="Collapse player"><ChevronDown/></button>
              <div><small>NOW PLAYING</small><strong>AFROVIBEZ</strong></div>
              <button onClick={() => {setView("queue");setPlayerOpen(false);}} aria-label={`Open queue, ${queue.length} tracks`}><ListMusic/></button>
            </header>
            <div className="af-player-art" style={{backgroundImage:`linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.35) 95%),url(${current.artworkUrl100?.replace("100x100","600x600")})`}}>
              <img className={playing?"af-artwork-rotating":""} src={current.artworkUrl100?.replace("100x100","600x600")} alt={`Album artwork for ${current.trackName}`}/>
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
              <button onClick={()=>setPlayerToolsOpen(true)} aria-label="Open playback tools"><MoreVertical/></button>
              <button onClick={()=>playAdjacent(-1)} aria-label="Previous track"><SkipBack fill="currentColor"/></button>
              <button className="af-play-toggle" onClick={()=>void playTrack(current)} aria-label={playing?"Pause":"Play"}>{playing?<Pause fill="currentColor"/>:<Play fill="currentColor"/>}</button>
              <button onClick={()=>playAdjacent(1)} aria-label="Next track"><SkipForward fill="currentColor"/></button>
              <button className={shuffleEnabled?"active":""} onClick={()=>{const v=!shuffleEnabled;shuffleRef.current=v;setShuffleEnabled(v);notify(v?"Shuffle enabled":"Shuffle disabled");}} aria-label="Toggle shuffle" aria-pressed={shuffleEnabled}><Shuffle/></button>
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
            <section className="af-comments-section"><div className="af-section-title"><strong>Comments</strong><span>{trackComments.length} {trackComments.length===1?"comment":"comments"}</span></div><div className="af-comment-compose"><div className="af-comment-avatar">Y</div><input value={commentDraft} maxLength={2000} onChange={e=>setCommentDraft(e.target.value)} placeholder={replyToComment?"Write a reply…":"Tell the artist what you think!"} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void submitTrackComment();}}}/><button disabled={!commentDraft.trim()||commentBusy} onClick={()=>void submitTrackComment()}>{commentBusy?"…":replyToComment?"Reply":"Post"}</button></div>{replyToComment&&<button className="af-comment-cancel-reply" onClick={()=>setReplyToComment(null)}>Cancel reply</button>}<div className="af-comments-list">{trackComments.filter((c:any)=>!c.parent_id).map((c:any)=><article className="af-comment" key={c.id}><div className="af-comment-avatar">{String(c.display_name||"L").slice(0,1).toUpperCase()}</div><div className="af-comment-body"><strong>{c.display_name}</strong><p>{c.body}</p><div className="af-comment-actions"><button onClick={()=>void reactToComment(c.id,"like")}>♥ {commentReactions[c.id]?.likes||0}</button><button onClick={()=>void reactToComment(c.id,"dislike")}>▾ {commentReactions[c.id]?.dislikes||0}</button><button onClick={()=>{setReplyToComment(c.id);setCommentDraft("");}}>REPLY</button></div>{trackComments.filter((r:any)=>r.parent_id===c.id).length>0&&<div className="af-comment-thread">{(expandedCommentThreads.has(c.id)?trackComments.filter((r:any)=>r.parent_id===c.id):trackComments.filter((r:any)=>r.parent_id===c.id).slice(0,1)).map((r:any)=><div className="af-comment-reply" key={r.id}><strong>{r.display_name}</strong><p>{r.body}</p><small>{new Date(r.created_at).toLocaleDateString()}</small></div>)}{trackComments.filter((r:any)=>r.parent_id===c.id).length>1&&<button className="af-view-replies" onClick={()=>setExpandedCommentThreads(previous=>{const next=new Set(previous);if(next.has(c.id))next.delete(c.id);else next.add(c.id);return next;})}>{expandedCommentThreads.has(c.id)?"Hide replies":`View ${trackComments.filter((r:any)=>r.parent_id===c.id).length} replies`}</button>}</div>}</div><button className="af-comment-more" onClick={()=>notify("Comment options are available for your own comments.","info")}>⋮</button></article>)}</div>{!trackComments.length&&<p className="af-comments-empty">Be the first to share what you think about this song.</p>}</section>
            <div className="af-playback-note">{current.source === "studio" ? "You are listening to an approved full release delivered by AfroVibe Studio." : "You are listening to an approved full-length AfroVibe release."}</div>
          </section>
        </div>
      )}
    {artistProfileOpen && selectedArtistId && artistProfiles[selectedArtistId] && (()=>{const p=artistProfiles[selectedArtistId];const artistTracks=studioTracks.filter(track=>track.artistId===selectedArtistId);const isFollowing=followedArtistIds.includes(selectedArtistId);const links=[["Website",p.website],["Instagram",p.instagram],["TikTok",p.tiktok],["YouTube",p.youtube],["Facebook",p.facebook],["Music",p.music_link]].filter((x:any)=>x[1]);const href=(v:string)=>/^https?:\/\//i.test(v)?v:"https://"+v.replace(/^@/,"");return <div className="artist-profile-backdrop" role="dialog" aria-modal="true" aria-label={`${p.stage_name} artist profile`} onClick={()=>setArtistProfileOpen(false)}><section className="artist-profile-sheet" onClick={e=>e.stopPropagation()}><button className="artist-profile-close" onClick={()=>setArtistProfileOpen(false)} aria-label="Close artist profile"><X/></button><div className="artist-profile-hero">{p.avatarUrl?<img className="artist-profile-avatar" src={p.avatarUrl} alt={`${p.stage_name} profile photo`}/>:<div className="artist-profile-avatar artist-profile-no-photo" role="img" aria-label="Artist profile photo not uploaded"><UserPlus size={34}/><span>{t("Photo unavailable")}</span></div>}<div className="eyebrow">AFROVIBE ARTIST</div><h2>{p.stage_name}</h2><p className="artist-profile-location">{[p.city,p.country].filter(Boolean).join(", ")}</p>{p.artist_type&&<p>{p.artist_type}</p>}{p.primary_language&&<p>{t("Performs in:")} {p.primary_language}</p>}<button className="artist-profile-follow" onClick={()=>void toggleArtistFollow(selectedArtistId,p.stage_name)}>{isFollowing?"Following":"Follow artist"}</button></div><div className="artist-profile-stats"><div><strong>{artistTracks.length}</strong><span>{t("Approved releases")}</span></div><div><strong>{(followerCounts[selectedArtistId]||0).toLocaleString(language)}</strong><span>{t("Followers")}</span></div><div><strong>—</strong><span>Streams</span><small>Public totals unavailable</small></div></div>{p.bio&&<div className="artist-profile-bio">{p.bio}</div>}{links.length>0&&<div className="artist-profile-links">{links.map(([label,value]:any)=><a key={label} href={href(value)} target="_blank" rel="noreferrer">{label} ↗</a>)}</div>}<section className="artist-profile-discography"><div className="artist-profile-section-heading"><h3>{t("Music & releases")}</h3><span>{artistTracks.length} {t(artistTracks.length===1?"release":"releases")}</span></div>{artistTracks.length?artistTracks.map(track=><button className="artist-release-row" key={track.trackId} onClick={()=>{setArtistProfileOpen(false);void playTrack(track);}}><img src={track.artworkUrl100} alt=""/><span><strong>{track.trackName}</strong><small>{track.collectionName||"Single"} · {track.primaryGenreName||"Music"}</small></span><Play size={18}/></button>):<p className="artist-profile-empty">{t("No approved releases are currently listed for this artist.")}</p>}</section><p className="artist-profile-sync-note">Follows and follower totals are stored in AfroVibe Music. Anonymous listener accounts keep your follows on this device until account linking is added.</p></section></div>})()}
    </main>
  );
}
