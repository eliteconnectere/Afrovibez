"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, ChevronRight, CircleHelp, Disc3, Globe2, Headphones, Moon, Music2, ShieldCheck, SlidersHorizontal, Trash2, UserRound, Volume2 } from "lucide-react";

type Preferences = {
  theme: "light" | "dark";
  autoplay: boolean;
  highQuality: boolean;
  explicitContent: boolean;
  newReleases: boolean;
  playlistUpdates: boolean;
  productNews: boolean;
  language: string;
};

const defaults: Preferences = {
  theme: "light", autoplay: false, highQuality: true, explicitContent: true,
  newReleases: true, playlistUpdates: true, productNews: false, language: "English",
};

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={"setting-switch " + (checked ? "is-on" : "")} onClick={() => onChange(!checked)}><span /></button>;
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Preferences>(defaults);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("afrovibez.preferences.v1");
      if (saved) setPrefs({ ...defaults, ...JSON.parse(saved) });
    } catch { /* Ignore invalid or unavailable browser storage. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = prefs.theme;
    try { localStorage.setItem("afrovibez.preferences.v1", JSON.stringify(prefs)); } catch { setNotice("Your browser could not save this preference."); }
  }, [prefs, ready]);

  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs(current => ({ ...current, [key]: value }));
    setNotice("Preference saved on this device.");
  };

  const reset = () => {
    setPrefs(defaults);
    setNotice("AfroVibez preferences have been reset on this device.");
  };

  return <main className="settings-page">
    <header className="settings-topbar">
      <Link href="/" className="settings-back"><ArrowLeft size={18}/> Back to Discover</Link>
      <div className="settings-brand"><span><Disc3 size={21}/></span> AFRO<span>VIBEZ</span></div>
    </header>
    <div className="settings-content">
      <div className="settings-intro">
        <div className="settings-kicker">MAKE IT YOURS</div>
        <h1>Settings</h1>
        <p>Manage your listening experience, app appearance and preferences.</p>
      </div>

      <section className="account-panel">
        <div className="account-avatar"><UserRound size={25}/></div>
        <div className="account-copy"><span className="panel-eyebrow">YOUR ACCOUNT</span><h2>Make AfroVibez yours</h2><p>Account registration and secure sign-in are being prepared. You can explore music without an account for now.</p><span className="account-status"><i/> REGISTRATION NOT YET ACTIVE</span></div>
        <button className="account-disabled" type="button" disabled>Create account <ChevronRight size={16}/></button>
      </section>

      {notice && <div className="settings-notice" role="status">{notice}</div>}

      <div className="settings-grid">
        <section className="settings-card">
          <div className="settings-card-heading"><span className="settings-icon"><SlidersHorizontal size={19}/></span><div><h2>Listening experience</h2><p>Choose how music behaves when you use the app.</p></div></div>
          <div className="setting-row"><div><strong>Autoplay previews</strong><p>Automatically play the next queued preview when the current preview ends.</p></div><Toggle checked={prefs.autoplay} onChange={v => update("autoplay", v)} label="Autoplay previews"/></div>
          <div className="setting-row"><div><strong>Higher quality artwork</strong><p>Prefer larger artwork when the catalogue provides it.</p></div><Toggle checked={prefs.highQuality} onChange={v => update("highQuality", v)} label="Higher quality artwork"/></div>
          <div className="setting-row"><div><strong>Show explicit-content tracks</strong><p>Allow explicit tracks to appear in discovery results.</p></div><Toggle checked={prefs.explicitContent} onChange={v => update("explicitContent", v)} label="Show explicit-content tracks"/></div>
        </section>

        <section className="settings-card">
          <div className="settings-card-heading"><span className="settings-icon"><Moon size={19}/></span><div><h2>Appearance</h2><p>Set the look and feel of AfroVibez.</p></div></div>
          <div className="setting-row"><div><strong>Dark mode</strong><p>Switch between the current light look and a darker interface.</p></div><Toggle checked={prefs.theme === "dark"} onChange={v => update("theme", v ? "dark" : "light")} label="Dark mode"/></div>
          <div className="setting-row"><div><strong>Language</strong><p>Choose your preferred app language.</p></div><select className="setting-select" value={prefs.language} onChange={e => update("language", e.target.value)} aria-label="App language"><option>English</option><option disabled>More languages coming soon</option></select></div>
        </section>

        <section className="settings-card">
          <div className="settings-card-heading"><span className="settings-icon"><Bell size={19}/></span><div><h2>Notifications</h2><p>Choose the updates you want to receive after registration launches.</p></div></div>
          <div className="setting-row"><div><strong>New music and releases</strong><p>Updates when artists release new music.</p></div><Toggle checked={prefs.newReleases} onChange={v => update("newReleases", v)} label="New music and releases"/></div>
          <div className="setting-row"><div><strong>Playlist activity</strong><p>Updates about playlists you follow.</p></div><Toggle checked={prefs.playlistUpdates} onChange={v => update("playlistUpdates", v)} label="Playlist activity"/></div>
          <div className="setting-row"><div><strong>AfroVibez news</strong><p>Occasional app news and feature announcements.</p></div><Toggle checked={prefs.productNews} onChange={v => update("productNews", v)} label="AfroVibez news"/></div>
          <div className="settings-footnote">These are saved preferences only. Push and email notifications are not connected yet.</div>
        </section>

        <section className="settings-card">
          <div className="settings-card-heading"><span className="settings-icon"><ShieldCheck size={19}/></span><div><h2>Privacy & data</h2><p>Understand what is currently stored by this version.</p></div></div>
          <div className="privacy-item"><strong>Device preferences</strong><span>Stored locally in this browser.</span></div>
          <div className="privacy-item"><strong>Account details</strong><span>No account details are collected by this version.</span></div>
          <div className="privacy-item"><strong>Listening history</strong><span>Not collected or synced.</span></div>
          <button className="reset-button" onClick={reset}><Trash2 size={15}/> Reset app preferences</button>
        </section>

        <section className="settings-card settings-help">
          <div className="settings-card-heading"><span className="settings-icon"><CircleHelp size={19}/></span><div><h2>Help & information</h2><p>Useful information about this version of AfroVibez.</p></div></div>
          <div className="help-line"><Headphones size={17}/><div><strong>Music previews</strong><span>Short previews are supplied by Apple’s music catalogue. Availability varies by track.</span></div></div>
          <div className="help-line"><Music2 size={17}/><div><strong>Full music streaming</strong><span>Full-track streaming, downloads and licensed catalogue access are not connected yet.</span></div></div>
          <div className="help-line"><Globe2 size={17}/><div><strong>Account sync</strong><span>Playlists and preferences do not sync between devices yet.</span></div></div>
          <div className="help-line"><Volume2 size={17}/><div><strong>Support</strong><span>Support contact details will be added before public registration opens.</span></div></div>
        </section>
      </div>
      <footer className="settings-footer">AFROVIBEZ <span>Discover. Listen. Feel.</span><Link href="/">Return to music <ChevronRight size={13}/></Link></footer>
    </div>
  </main>;
}
