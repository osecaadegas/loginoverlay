import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Copy,
  Database,
  ExternalLink,
  Gift,
  MessageSquare,
  MonitorPlay,
  Radio,
  RefreshCw,
  Settings2,
  SlidersHorizontal,
  Twitch,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getOrCreateOpenSourceOverlay } from "./openSourceOverlayBuild";
import { getPublishedBetterOverlay, publishBetterOverlay } from "../../services/betterOverlayService";
import "./OpenSourceOverlay.css";

const CONTROL_SECTIONS = [
  {
    title: "Stream overlays",
    items: [
      { title: "Main Stream", detail: "Open the complete scene preview", to: "/opensource_preview", icon: MonitorPlay, tone: "blue", primary: true },
      { title: "Bonus Hunt / Opening", detail: "Manage hunts, bonuses and opening state", to: "/overlay-center/widgets/bonus-hunt", icon: Activity, tone: "green" },
      { title: "Stream Bar", detail: "Edit branding and stream status", to: "/overlay-center/widgets/navbar", icon: Radio, tone: "cyan" },
      { title: "Live Chat", detail: "Connect and style chat messages", to: "/overlay-center/widgets/chat", icon: MessageSquare, tone: "pink" },
      { title: "Scene Background", detail: "Set the scene image, video or texture", to: "/overlay-center/widgets/background", icon: MonitorPlay, tone: "purple" },
      { title: "Shoutout Alerts", detail: "Set up the live !so clip card", to: "/overlay-center/widgets/raid-shoutout", icon: Activity, tone: "gold" },
      { title: "Tournament", detail: "Configure tournament standings", to: "/overlay-center/widgets/tournament", icon: BarChart3, tone: "green" },
      { title: "Current Game", detail: "Choose game details and live statistics", to: "/overlay-center/widgets/current-slot", icon: SlidersHorizontal, tone: "blue" },
    ],
  },
  {
    title: "Data and integrations",
    items: [
      { title: "Giveaways", detail: "Manage giveaway settings and display", to: "/overlay-center/widgets/giveaway", icon: Gift, tone: "gold" },
      { title: "Slots Database", detail: "Review slot metadata and artwork", to: "/overlay-center/slots", icon: Database, tone: "cyan" },
      { title: "Integrations", detail: "Configure connected stream services", to: "/overlay-center/integrations", icon: Twitch, tone: "purple" },
      { title: "Statistics", detail: "View your stream and platform stats", to: "/analytics", icon: BarChart3, tone: "blue" },
    ],
  },
];

export default function OpenSourceOverlayPage() {
  const { user } = useAuth();
  const [overlay, setOverlay] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [copyBusy, setCopyBusy] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const obsUrl = overlay?.publicOverlayId
    ? `${window.location.origin}/obs/overlay/${overlay.publicOverlayId}`
    : "";

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const record = await getOrCreateOpenSourceOverlay(user);
      setOverlay(record);
    } catch (loadError) {
      setError(loadError?.message || "The source overlay could not be loaded.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); }, [user?.id]);

  const copyObsUrl = async () => {
    if (!user?.id || !overlay?.id || !obsUrl || copyBusy) return;
    setCopyBusy(true);
    setCopyMessage("");
    try {
      let record = overlay;
      const publication = await getPublishedBetterOverlay(record.publicOverlayId);
      if (!publication || publication.publishedVersion < record.draftVersion || record.hasUnpublishedChanges) {
        record = await publishBetterOverlay(user.id, record.draftLayout, record.draftVersion, record.id);
        setOverlay(record);
      }
      await navigator.clipboard.writeText(`${window.location.origin}/obs/overlay/${record.publicOverlayId}`);
      setCopyMessage("OBS URL copied. Add it as a 1920 × 1080 Browser Source in OBS.");
    } catch (copyError) {
      if (copyError?.committedEditorRecord) setOverlay(copyError.committedEditorRecord);
      setCopyMessage(copyError?.name === "NotAllowedError"
        ? "Clipboard access was blocked. Select and copy the URL below."
        : copyError?.message || "Could not publish or copy the OBS URL. Try again.");
    } finally {
      setCopyBusy(false);
    }
  };

  return (
    <main className="opensource-page">
      <div className="opensource-shell">
        <header className="opensource-header">
          <div>
            <p className="opensource-eyebrow">Admin testing · Streamers Center data</p>
            <h1>Open Source Overlay</h1>
            <p className="opensource-intro">The imported stream scene and its controls, running from this site with your live overlay data.</p>
          </div>
          <div className="opensource-header-actions">
            <button className="opensource-button opensource-button--primary" type="button" onClick={copyObsUrl} disabled={busy || copyBusy || !overlay}>
              <Copy size={16} /> {copyBusy ? "Preparing OBS URL…" : overlay?.hasUnpublishedChanges ? "Publish & copy OBS URL" : "Copy OBS URL"}
            </button>
            <button className="opensource-button opensource-button--quiet" type="button" onClick={load} disabled={busy}>
              <RefreshCw size={16} className={busy ? "opensource-spin" : ""} /> Refresh
            </button>
            <Link className="opensource-button opensource-button--primary" to="/opensource_preview" target="_blank" rel="noreferrer">
              <MonitorPlay size={17} /> Open preview <ExternalLink size={14} />
            </Link>
          </div>
        </header>

        {overlay && <div className="opensource-obs-url">
          <label htmlFor="opensource-obs-url">OBS Browser Source URL</label>
          <input id="opensource-obs-url" type="text" value={obsUrl} readOnly onFocus={(event) => event.target.select()} aria-describedby="opensource-obs-url-status" />
          <p id="opensource-obs-url-status" role="status">{copyMessage || "Use Copy OBS URL above. The scene is published before copying when needed."}</p>
        </div>}

        <section className="opensource-scene-card" aria-label="Main stream overlay">
          <div className="opensource-scene-card__copy">
            <span className="opensource-live-dot" />
            <div>
              <h2>{busy ? "Preparing your overlay…" : overlay?.draftLayout?.name || "Main Stream"}</h2>
              <p>{error || (overlay ? "The scene is saved to your Streamers Center account and uses its existing live widget and chat data." : "Loading your saved source scene.")}</p>
            </div>
          </div>
          <div className="opensource-scene-card__meta">
            <span>1920 × 1080</span>
            <span>Live data</span>
            <span>Admin only</span>
          </div>
          {error && <button type="button" className="opensource-retry" onClick={load}>Try again</button>}
          {overlay && <Link className="opensource-text-link" to="/opensource_preview">Preview source scene <ArrowUpRight size={15} /></Link>}
        </section>

        {CONTROL_SECTIONS.map((section) => (
          <section className="opensource-section" key={section.title}>
            <div className="opensource-section__heading">
              <h2>{section.title}</h2>
              {section.title === "Stream overlays" && <Link to="/opensource_preview">Preview scene <ArrowUpRight size={14} /></Link>}
            </div>
            <div className="opensource-control-grid">
              {section.items.map(({ title, detail, to, icon: Icon, tone, primary }) => (
                <Link className={`opensource-control${primary ? " opensource-control--primary" : ""}`} to={to} key={title}>
                  <span className={`opensource-control__icon opensource-control__icon--${tone}`}><Icon size={19} /></span>
                  <span className="opensource-control__text"><strong>{title}</strong><small>{detail}</small></span>
                  <ArrowUpRight size={16} className="opensource-control__arrow" />
                </Link>
              ))}
            </div>
          </section>
        ))}

        <footer className="opensource-footer">
          <Settings2 size={16} /> These control pages use Streamers Center’s existing saved settings and live connections. The original project’s private legacy database is not used.
        </footer>
      </div>
    </main>
  );
}
