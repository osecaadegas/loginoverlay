import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Gift,
  LayoutDashboard,
  MessageSquare,
  MonitorPlay,
  ShieldCheck,
  Swords,
  Trophy,
} from "lucide-react";
import "./LandingPage.css";

const TOOL_PAGES = {
  "streamer-overlays": {
    eyebrow: "Streamer overlays",
    title: "Interactive iGaming overlays for OBS scenes.",
    summary:
      "Build stream overlays for bonus hunts, slot requests, tournaments, giveaways and chat moments without coding a custom scene from scratch.",
    audience: "Twitch, Kick and YouTube iGaming creators",
    image: "/streamer.png",
    cta: "Explore Streamer Tools",
    ctaTo: "/premium?type=streamer",
    icon: MonitorPlay,
    features: [
      "Browser-source scenes for OBS",
      "Customizable stream widgets",
      "Bonus hunt and request overlays",
      "Built for live iGaming workflows",
    ],
    faq: [
      [
        "Can these overlays be used in OBS?",
        "Yes. Streamers Center overlays are designed for browser-source live production workflows.",
      ],
      [
        "Are these casino games?",
        "No. These are visual and interaction tools for streams, not gambling services.",
      ],
    ],
  },
  "bonus-hunt-tracker": {
    eyebrow: "Bonus hunt tracker",
    title: "Track bonus hunts for streams and private sessions.",
    summary:
      "Follow opened bonuses, slot images, payouts, multipliers, break-even progress and best results in a clear dashboard.",
    audience: "Streamers and gamblers who need organized hunt records",
    image: "/player.png",
    cta: "Open Pricing",
    ctaTo: "/premium",
    icon: Trophy,
    features: [
      "Opened and remaining bonus tracking",
      "Break-even and payout summaries",
      "Slot images and provider context",
      "Streamer and gambler workflows",
    ],
    faq: [
      [
        "Does it predict results?",
        "No. It records results and progress. It does not predict winnings or guarantee outcomes.",
      ],
      [
        "Can streamers show it on stream?",
        "Yes. Streamers can use widget and overlay workflows where available.",
      ],
    ],
  },
  "casino-profit-loss-tracker": {
    eyebrow: "Profit and loss tracker",
    title: "Track casino deposits, withdrawals and session results.",
    summary:
      "Keep a private record of starting deposits, extra deposits, withdrawals, slot results and profit or loss by period.",
    audience: "Gamblers who want private session accounting",
    image: "/player.png",
    cta: "Open Gambler Tracker",
    ctaTo: "/premium?type=player",
    icon: LayoutDashboard,
    features: [
      "Deposit and withdrawal records",
      "Daily, weekly and monthly views",
      "Profit or loss summaries",
      "Private player dashboard",
    ],
    faq: [
      [
        "Is this a casino?",
        "No. Streamers Center is tracking software and does not accept deposits or process wagers.",
      ],
      [
        "Does it require OBS?",
        "No. The gambler tracker is a private web dashboard.",
      ],
    ],
  },
  "slot-request-widget": {
    eyebrow: "Slot request widget",
    title: "Let viewers request slots without losing the queue.",
    summary:
      "Collect and manage slot requests so chat suggestions become an organized stream workflow instead of scattered messages.",
    audience: "Casino and slot streamers",
    image: "/streamer.png",
    cta: "Explore Streamer Tools",
    ctaTo: "/premium?type=streamer",
    icon: MessageSquare,
    features: [
      "Viewer request queue",
      "Streamer moderation controls",
      "Readable overlay display",
      "Works alongside bonus hunt tools",
    ],
    faq: [
      [
        "Can viewers request slots from chat?",
        "The widget is built around chat-friendly request workflows where integrations are configured.",
      ],
      [
        "Can the streamer control the queue?",
        "Yes. Streamers keep control over what appears and what gets played.",
      ],
    ],
  },
  "tournament-overlay": {
    eyebrow: "Tournament overlay",
    title: "Run competitive stream moments with tournament overlays.",
    summary:
      "Create tournament-style moments for viewers with visual brackets, rounds and stream-ready displays.",
    audience: "Streamers who want competitive chat moments",
    image: "/streamer.png",
    cta: "See Streamer Pricing",
    ctaTo: "/premium?type=streamer",
    icon: Swords,
    features: [
      "Round and bracket displays",
      "Stream-friendly visual hierarchy",
      "Works with community events",
      "Designed for live production",
    ],
    faq: [
      [
        "Is this for real-money betting?",
        "No. Streamers Center provides stream presentation tools and does not process wagers.",
      ],
      [
        "Can it be used for community events?",
        "Yes. The goal is to create organized stream moments viewers can follow.",
      ],
    ],
  },
  "giveaway-widget": {
    eyebrow: "Giveaway widget",
    title: "Make giveaways easy for viewers to understand.",
    summary:
      "Show giveaway instructions, entries and winner-ready layouts in a stream-friendly widget.",
    audience: "Creators running community giveaways",
    image: "/streamer.png",
    cta: "Explore Giveaway Tools",
    ctaTo: "/premium?type=streamer",
    icon: Gift,
    features: [
      "Keyword-friendly display",
      "Entry and status panels",
      "Readable on-stream layout",
      "Works with other stream widgets",
    ],
    faq: [
      [
        "Does Streamers Center ship prizes?",
        "No. It provides the software display and workflow. Creators remain responsible for giveaway rules and fulfillment.",
      ],
      [
        "Can it match my stream style?",
        "Widgets are designed to fit branded stream visuals.",
      ],
    ],
  },
  "chat-games": {
    eyebrow: "Chat games",
    title: "Give chat something to do between spins.",
    summary:
      "Add viewer games, predictions and chat interactions that keep your community active during the whole stream.",
    audience: "iGaming streamers building viewer interaction",
    image: "/streamer.png",
    cta: "Try Streamer Tools",
    ctaTo: "/premium?type=streamer",
    icon: MessageSquare,
    features: [
      "Viewer games and commands",
      "Prediction-style interactions",
      "Community engagement moments",
      "Built for live chat pacing",
    ],
    faq: [
      [
        "Are chat games gambling?",
        "No. They are stream interaction tools. Streamers Center does not accept wagers or deposits.",
      ],
      [
        "Do viewers need accounts?",
        "Viewer requirements depend on the configured integration and widget workflow.",
      ],
    ],
  },
};

export const TOOL_PAGE_SLUGS = Object.keys(TOOL_PAGES);

export default function ToolLandingPage() {
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\/+/, "");
  const page = TOOL_PAGES[slug] || TOOL_PAGES["streamer-overlays"];
  const Icon = page.icon;

  return (
    <main className="lp-page lp-tool-page">
      <header className="lp-tool-nav lp-tool-nav--secondary">
        <nav aria-label="Tool landing navigation">
          <Link to="/premium">Pricing</Link>
        </nav>
      </header>

      <section className="lp-tool-hero">
        <div className="lp-tool-hero__copy">
          <span className="lp-eyebrow">{page.eyebrow}</span>
          <h1>{page.title}</h1>
          <p>{page.summary}</p>
          <div className="lp-tool-hero__meta">
            <span>
              <Icon size={18} /> {page.audience}
            </span>
            <span>
              <ShieldCheck size={18} /> Software only, no wagers or deposits
            </span>
          </div>
          <div className="lp-selected-hero__ctas">
            <Link className="lp-btn lp-btn--streamer" to={page.ctaTo}>
              {page.cta} <ArrowRight size={18} />
            </Link>
            <Link className="lp-btn lp-btn--ghost" to="/streamer">
              View Streamer Overview
            </Link>
          </div>
        </div>
        <div className="lp-tool-hero__media">
          <img
            src={page.image}
            alt={`${page.title} preview`}
            loading="eager"
            decoding="async"
          />
        </div>
      </section>

      <section className="lp-section lp-tool-section">
        <div className="lp-section-heading">
          <span className="lp-eyebrow">What it includes</span>
          <h2>Focused on one job, connected to the full platform.</h2>
        </div>
        <div className="lp-tool-feature-grid">
          {page.features.map((feature) => (
            <article key={feature} className="lp-feature-card">
              <span className="lp-feature-card__icon">
                <CheckCircle2 size={22} />
              </span>
              <h3>{feature}</h3>
              <p>
                Use this capability inside Streamers Center without leaving the
                existing streamer or gambler workflow.
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section lp-tool-faq">
        <div className="lp-section-heading">
          <span className="lp-eyebrow">FAQ</span>
          <h2>Quick answers before you start.</h2>
        </div>
        <div className="lp-tool-faq__grid">
          {page.faq.map(([question, answer]) => (
            <article key={question} className="lp-showcase-card">
              <h3>{question}</h3>
              <p>{answer}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="lp-footer">
        <div>
          <span>Streamers Center</span>
          <p>
            Streaming and tracking software only. We do not operate gambling
            services, accept deposits or process wagers.
          </p>
        </div>
        <nav aria-label="Footer">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </nav>
      </footer>
    </main>
  );
}
