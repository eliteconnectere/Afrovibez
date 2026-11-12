"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Bell, ChevronRight, CircleHelp, Disc3, Globe2, Headphones,
  Moon, Music2, ShieldCheck, SlidersHorizontal, Trash2, UserRound,
  Volume2, UserCog, LockKeyhole, Database, Download, RotateCcw, Sun,
  PlayCircle, Radio, Mail, Smartphone, Palette, Info, FileText, Check
} from "lucide-react";

type Section = "overview" | "profile" | "account" | "notifications" | "playback" | "appearance" | "language" | "privacy" | "storage" | "help";
type Preferences = {
  theme: "light" | "dark";
  autoplay: boolean;
  highQuality: boolean;
  explicitContent: boolean;
  newReleases: boolean;
  playlistUpdates: boolean;
  productNews: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  language: string;
  volume: number;
  defaultMode: "normal" | "sped" | "slowed" | "nightcore" | "daycore";
  gaplessPlayback: boolean;
};
type Profile = { displayName: string; username: string; bio: string };

const defaults: Preferences = {
  theme: "light", autoplay: false, highQuality: true, explicitContent: true,
  newReleases: true, playlistUpdates: true, productNews: false,
  pushNotifications: true, emailNotifications: false, language: "English",
  volume: 85, defaultMode: "normal", gaplessPlayback: false
};
const profileDefaults: Profile = { displayName: "", username: "", bio: "" };
const prefKey = "afrovibez.preferences.v1";
const profileKey = "afrovibez.profile.v1";
const localKeys = ["afrovibez.preferences.v1", "afrovibez.profile.v1", "afrovibez.likes.v1", "afrovibez.queue.v1", "afrovibez.playlists.v1", "afrovibez.follows.v1", "afrovibez.keepAudioMode"];

const sections: { id: Section; title: string; description: string; icon: typeof UserRound; status?: string }[] = [
  { id: "profile", title: "Your profile", description: "Edit the name and profile details saved on this device.", icon: UserRound, status: "Local profile" },
  { id: "account", title: "Account & security", description: "Registration, sign-in and account protection.", icon: LockKeyhole, status: "Coming later" },
  { id: "notifications", title: "Notifications", description: "Choose the updates you would like AfroVibez to send.", icon: Bell, status: "Preferences only" },
  { id: "playback", title: "Playback & audio", description: "Control autoplay, volume and how previews play.", icon: Headphones },
  { id: "appearance", title: "Appearance", description: "Choose the original light design or dark mode.", icon: Palette },
  { id: "language", title: "Language", description: "Set the language used throughout the app.", icon: Globe2 },
  { id: "privacy", title: "Privacy & social", description: "Understand what is private and what is shared.", icon: ShieldCheck },
  { id: "storage", title: "Data & storage", description: "Export or clear information saved in this browser.", icon: Database },
  { id: "help", title: "Help & about", description: "Music catalogue, feature availability and support.", icon: CircleHelp }
];

function Toggle({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className={"setting-switch " + (checked ? "is-on" : "")} onClick={() => onChange(!checked)}><span /></button>;
}
function Row({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div className="setting-row"><div><strong>{title}</strong><p>{description}</p></div>{children}</div>;
}
function ToggleRow({ title, description, checked, onChange, label }: { title: string; description: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <Row title={title} description={description}><Toggle checked={checked} onChange={onChange} label={label}/></Row>;
}

export default function SettingsPage() {
  const [section, setSection] = useState<Section>("overview");
  const [prefs, setPrefs] = useState<Preferences>(defaults);
  const [profile, setProfile] = useState<Profile>(profileDefaults);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(prefKey) || "{}");
      setPrefs({ ...defaults, ...saved });
      setProfile({ ...profileDefaults, ...JSON.parse(localStorage.getItem(profileKey) || "{}") });
    } catch { /* Recover with safe defaults if local data is malformed. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = prefs.theme;
    try {
      localStorage.setItem(prefKey, JSON.stringify(prefs));
      localStorage.setItem(profileKey, JSON.stringify(profile));
    } catch { setNotice("This browser could not save your changes. Check available device storage."); }
  }, [prefs, profile, ready]);

  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs(current => ({ ...current, [key]: value }));
    setNotice("Saved on this device.");
  };
  const updateProfile = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setProfile(current => ({ ...current, [key]: value }));
    setNotice("Profile details saved on this device only.");
  };
  const exportData = () => {
    const data: Record<string, unknown> = {};
    localKeys.forEach(key => {
      try { const value = localStorage.getItem(key); if (value !== null) data[key] = JSON.parse(value); } catch { data[key] = localStorage.getItem(key); }
    });
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), app: "AfroVibez", data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "afrovibez-my-data.json"; a.click();
    URL.revokeObjectURL(url); setNotice("Your device data export has been created.");
  };
  const resetPreferences = () => {
    setPrefs(defaults); setConfirmReset(false);
    setNotice("Appearance, playback, notification and local profile preferences have been reset.");
  };
  const clearAllData = () => {
    localKeys.forEach(key => localStorage.removeItem(key));
    setPrefs(defaults); setProfile(profileDefaults); setConfirmReset(false);
    setNotice("AfroVibez data stored by this browser has been cleared. Reload Discover to refresh the library.");
  };
  const current = sections.find(item => item.id === section);
  const heading = current?.title || "Settings";

  return <main className="settings-page">
    <header className="settings-topbar">
      <Link href="/" className="settings-back"><ArrowLeft size={18}/> Back to Discover</Link>
      <div className="settings-brand"><span><Disc3 size={21}/></span> AFRO<span>VIBEZ</span></div>
    </header>
    <div className="settings-content settings-v2">
      <div className="settings-intro">
        <div className="settings-kicker">MAKE IT YOURS</div>
        <h1>{heading}</h1>
        <p>{section === "overview" ? "Your music app, your choices. Open a category to see and manage every option." : current?.description}</p>
      </div>
      {notice && <div className="settings-notice" role="status"><Check size={15}/>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss message">×</button></div>}

      {section === "overview" ? <>
        <section className="account-panel">
          <div className="account-avatar"><UserRound size={25}/></div>
          <div className="account-copy"><span className="panel-eyebrow">YOUR ACCOUNT</span><h2>{profile.displayName.trim() || "Make AfroVibez yours"}</h2><p>{profile.displayName.trim() ? "Your local profile is ready to personalise. It is currently saved only in this browser." : "You can personalise a local profile now. Secure registration and account sync will be enabled when the account service is connected."}</p><span className="account-status"><i/> {profile.displayName.trim() ? "LOCAL PROFILE" : "ACCOUNT REGISTRATION NOT YET ACTIVE"}</span></div>
          <button className="account-disabled" type="button" disabled>Create account <ChevronRight size={16}/></button>
        </section>
        <div className="settings-section-label">ACCOUNT & PERSONALISATION</div>
        <div className="settings-menu-list">
          {sections.slice(0, 2).map(item => { const Icon = item.icon; return <button key={item.id} className="settings-menu-item" onClick={() => { setSection(item.id); setNotice(""); }}><span className="settings-menu-icon"><Icon size={20}/></span><span className="settings-menu-copy"><strong>{item.title}</strong><small>{item.description}</small></span>{item.status && <em>{item.status}</em>}<ChevronRight size={19}/></button>; })}
        </div>
        <div className="settings-section-label">APP PREFERENCES</div>
        <div className="settings-menu-list">
          {sections.slice(2, 6).map(item => { const Icon = item.icon; return <button key={item.id} className="settings-menu-item" onClick={() => { setSection(item.id); setNotice(""); }}><span className="settings-menu-icon"><Icon size={20}/></span><span className="settings-menu-copy"><strong>{item.title}</strong><small>{item.description}</small></span>{item.status && <em>{item.status}</em>}<ChevronRight size={19}/></button>; })}
        </div>
        <div className="settings-section-label">PRIVACY, STORAGE & SUPPORT</div>
        <div className="settings-menu-list">
          {sections.slice(6).map(item => { const Icon = item.icon; return <button key={item.id} className="settings-menu-item" onClick={() => { setSection(item.id); setNotice(""); }}><span className="settings-menu-icon"><Icon size={20}/></span><span className="settings-menu-copy"><strong>{item.title}</strong><small>{item.description}</small></span><ChevronRight size={19}/></button>; })}
        </div>
      </> : <>
        <button className="settings-detail-back" onClick={() => { setSection("overview"); setNotice(""); }}><ArrowLeft size={16}/> All settings</button>
        <section className="settings-detail-card">
          {section === "profile" && <>
            <div className="settings-detail-heading"><span className="settings-icon"><UserRound size={19}/></span><div><h2>Profile information</h2><p>These details are stored in this browser and are not a public or synced account profile.</p></div></div>
            <label className="settings-field">Display name<input maxLength={50} value={profile.displayName} onChange={e => updateProfile("displayName", e.target.value)} placeholder="How should AfroVibez address you?"/></label>
            <label className="settings-field">Username<input maxLength={30} value={profile.username} onChange={e => updateProfile("username", e.target.value.replace(/[^a-zA-Z0-9_.]/g, ""))} placeholder="Choose a local username"/></label>
            <label className="settings-field">Bio<textarea maxLength={160} rows={3} value={profile.bio} onChange={e => updateProfile("bio", e.target.value)} placeholder="A little about your music taste…"/></label>
            <div className="settings-footnote">Profile photo upload, public profiles, email changes and password management require secure account services. They are not active yet.</div>
          </>}
          {section === "account" && <>
            <div className="settings-detail-heading"><span className="settings-icon"><LockKeyhole size={19}/></span><div><h2>Account & security</h2><p>Account creation and secure authentication have not been connected in this version.</p></div></div>
            <div className="settings-status-panel"><strong>Registration is not open yet</strong><p>There is no sign-up, sign-in, password reset, email verification, two-step verification or account deletion endpoint connected. No password or account email is collected here.</p></div>
            <div className="privacy-item"><strong>What you can do now</strong><span>Use AfroVibez without an account. Your likes, queue and playlists stay in this browser.</span></div>
            <div className="privacy-item"><strong>What will become available with accounts</strong><span>Profile photo, email and password management, account recovery, sessions and syncing across devices.</span></div>
          </>}
          {section === "notifications" && <>
            <div className="settings-detail-heading"><span className="settings-icon"><Bell size={19}/></span><div><h2>Notification preferences</h2><p>Choose your preferred notification types. These choices are saved locally until delivery services are connected.</p></div></div>
            <ToggleRow title="Push notifications" description="Allow AfroVibez to send alerts to this device when browser or app notifications are implemented." checked={prefs.pushNotifications} onChange={v => update("pushNotifications",v)} label="Push notifications"/>
            <ToggleRow title="Email notifications" description="Use email for account and product updates after an email address and delivery service are connected." checked={prefs.emailNotifications} onChange={v => update("emailNotifications",v)} label="Email notifications"/>
            <div className="settings-subheading">MUSIC & COMMUNITY UPDATES</div>
            <ToggleRow title="New music and releases" description="Alerts when artists you follow release new music." checked={prefs.newReleases} onChange={v => update("newReleases",v)} label="New music and releases"/>
            <ToggleRow title="Playlist activity" description="Updates about playlists you follow or changes to shared playlists." checked={prefs.playlistUpdates} onChange={v => update("playlistUpdates",v)} label="Playlist activity"/>
            <ToggleRow title="AfroVibez news and features" description="Product announcements, new features and occasional service news." checked={prefs.productNews} onChange={v => update("productNews",v)} label="AfroVibez news and features"/>
            <div className="settings-footnote">Status: preference storage works on this device. Push delivery, email delivery, artist-follow triggers and notification history are not connected yet.</div>
          </>}
          {section === "playback" && <>
            <div className="settings-detail-heading"><span className="settings-icon"><Headphones size={19}/></span><div><h2>Playback & audio</h2><p>Control the preview player. Apple catalogue previews are short clips, not full tracks.</p></div></div>
            <ToggleRow title="Autoplay next preview" description="When a preview ends, continue with the next track in the queue or catalogue." checked={prefs.autoplay} onChange={v => update("autoplay",v)} label="Autoplay next preview"/>
            <ToggleRow title="Higher quality artwork" description="Load larger album artwork where the catalogue provides it. This uses more mobile data." checked={prefs.highQuality} onChange={v => update("highQuality",v)} label="Higher quality artwork"/>
            <div className="settings-footnote">Gapless playback is not available for separate Apple catalogue preview clips, so it is not presented as an active control.</div>
            <Row title="Default audio mode" description="Choose the playback speed used when a new preview starts."><select className="setting-select" value={prefs.defaultMode} onChange={e => update("defaultMode",e.target.value as Preferences["defaultMode"])}><option value="normal">Original (1×)</option><option value="sped">Sped Up (1.25×)</option><option value="slowed">Slowed (0.8×)</option><option value="nightcore">Nightcore (1.35×)</option><option value="daycore">Daycore (0.85×)</option></select></Row>
            <div className="setting-row setting-volume-row"><div><strong>Default player volume</strong><p>{prefs.volume}% · Applied the next time a preview starts.</p><input aria-label="Default player volume" type="range" min="0" max="100" value={prefs.volume} onChange={e => update("volume",Number(e.target.value))}/></div><Volume2 size={20}/></div>
            <ToggleRow title="Show explicit-content tracks" description="When off, hide catalogue tracks identified as explicit where the catalogue supplies that information." checked={prefs.explicitContent} onChange={v => update("explicitContent",v)} label="Show explicit-content tracks"/>
            <div className="settings-footnote">Playback settings are saved locally. The app currently plays Apple catalogue preview clips only. Full streaming and offline downloads are not available.</div>
          </>}
          {section === "appearance" && <>
            <div className="settings-detail-heading"><span className="settings-icon"><Palette size={19}/></span><div><h2>Appearance</h2><p>Choose a complete app-wide appearance. AfroVibez brand accents remain blue, white and red.</p></div></div>
            <div className="theme-choice-grid">
              <button className={"theme-choice light-choice " + (prefs.theme === "light" ? "selected" : "")} onClick={() => update("theme","light")}><span className="theme-preview light-preview"><i/><i/><i/></span><strong><Sun size={17}/> Light mode</strong><small>Original white AfroVibez design</small>{prefs.theme === "light" && <Check size={17}/>}</button>
              <button className={"theme-choice dark-choice " + (prefs.theme === "dark" ? "selected" : "")} onClick={() => update("theme","dark")}><span className="theme-preview dark-preview"><i/><i/><i/></span><strong><Moon size={17}/> Dark mode</strong><small>Dark surfaces across the app</small>{prefs.theme === "dark" && <Check size={17}/>}</button>
            </div>
            <div className="settings-footnote">Light mode is the default. Theme changes apply to Discover, the player and Settings. No extra brand colour themes are offered.</div>
          </>}
          {section === "language" && <>
            <div className="settings-detail-heading"><span className="settings-icon"><Globe2 size={19}/></span><div><h2>App language</h2><p>Choose the language used for menus and controls.</p></div></div>
            <Row title="Language" description="Only English translations are currently included in this version."><select className="setting-select" value={prefs.language} onChange={e => update("language",e.target.value)}><option>English</option></select></Row>
            <div className="settings-status-panel"><strong>More languages are not ready yet</strong><p>Additional language options will appear here once the full interface translations are available. The setting will not pretend to change the app language before then.</p></div>
          </>}
          {section === "privacy" && <>
            <div className="settings-detail-heading"><span className="settings-icon"><ShieldCheck size={19}/></span><div><h2>Privacy & social</h2><p>Here is what this version stores and what it does not share.</p></div></div>
            <div className="privacy-item"><strong>Device preferences</strong><span>Theme, playback and notification preferences are stored in this browser's local storage.</span></div>
            <div className="privacy-item"><strong>Library activity</strong><span>Likes, playlists, follows and queue are stored locally on this device. They are not sent to an AfroVibez account or synced.</span></div>
            <div className="privacy-item"><strong>Account details</strong><span>No email address, password or registered account details are collected by this version.</span></div>
            <div className="privacy-item"><strong>Listening history</strong><span>A listening history is not collected or synced by the app.</span></div>
            <div className="privacy-item"><strong>Music catalogue requests</strong><span>Search requests are sent to Apple's public music catalogue service to retrieve matching music and preview availability.</span></div>
            <div className="privacy-item"><strong>Public activity and social feeds</strong><span>Public profiles, comments, messaging, followers and social listening feeds are not connected.</span></div>
            <div className="settings-footnote">Clearing site data in your browser also removes local AfroVibez preferences and library items.</div>
          </>}
          {section === "storage" && <>
            <div className="settings-detail-heading"><span className="settings-icon"><Database size={19}/></span><div><h2>Data & storage</h2><p>Review, export or remove the information saved by this browser.</p></div></div>
            <div className="privacy-item"><strong>Saved on this device</strong><span>App preferences, local profile fields, liked track IDs, queue, playlists, artist follows and the keep-audio-mode preference.</span></div>
            <button className="settings-action-button" onClick={exportData}><Download size={17}/> Export my AfroVibez data</button>
            <button className="settings-action-button danger" onClick={() => setConfirmReset(true)}><RotateCcw size={17}/> Reset app preferences</button>
            <button className="settings-action-button danger" onClick={() => setConfirmReset(true)}><Trash2 size={17}/> Clear all AfroVibez data on this device</button>
            {confirmReset && <div className="settings-confirm"><strong>What would you like to clear?</strong><p>Reset preferences keeps your local likes and playlists. Clear all data also removes local profile details, likes, queue, playlists and follows.</p><div><button onClick={resetPreferences}>Reset preferences</button><button onClick={clearAllData}>Clear all local data</button><button onClick={() => setConfirmReset(false)}>Cancel</button></div></div>}
          </>}
          {section === "help" && <>
            <div className="settings-detail-heading"><span className="settings-icon"><CircleHelp size={19}/></span><div><h2>Help & information</h2><p>What works in this version and what is still being connected.</p></div></div>
            <div className="help-line"><Headphones size={18}/><div><strong>Music previews</strong><span>Short previews are supplied by Apple's music catalogue. Availability and clip length vary by track.</span></div></div>
            <div className="help-line"><Music2 size={18}/><div><strong>Full music streaming & downloads</strong><span>Full-track streaming, offline downloads and licensed catalogue access are not connected yet.</span></div></div>
            <div className="help-line"><Globe2 size={18}/><div><strong>Account sync</strong><span>Playlists, follows, likes and preferences do not sync between devices yet.</span></div></div>
            <div className="help-line"><Bell size={18}/><div><strong>Notifications</strong><span>Notification preferences save locally, but push and email delivery are not connected yet.</span></div></div>
            <div className="help-line"><Mail size={18}/><div><strong>Support</strong><span>A verified AfroVibez support email has not yet been supplied. Support contact will be published before public registration opens.</span></div></div>
            <div className="settings-status-panel"><strong>About AfroVibez</strong><p>Discover. Listen. Feel. This version is a music catalogue preview experience and does not claim to provide licensed full-track streaming.</p></div>
          </>}
        </section>
      </>}
      <footer className="settings-footer">AFROVIBEZ <span>Discover. Listen. Feel.</span><Link href="/">Return to music <ChevronRight size={13}/></Link></footer>
    </div>
  </main>;
}
