import React, { useEffect } from "react";
import { useAuth } from "../../../../context/AuthContext";
import { makePerStyleSetters } from "../shared/perStyleConfig";
import { NAVBAR_STYLE_KEYS } from "../styleKeysRegistry";

export default function NavbarConfig({ config, onChange }) {
  const c = config || {};
  const { user } = useAuth();
  const currentStyle = c.displayStyle || "v1";
  const { set, setMulti } = makePerStyleSetters(
    onChange,
    c,
    currentStyle,
    NAVBAR_STYLE_KEYS,
  );

  // Twitch info
  const isTwitch = user?.app_metadata?.provider === "twitch";
  const twitchName =
    user?.user_metadata?.preferred_username ||
    user?.user_metadata?.full_name ||
    "";
  const twitchDisplayName = user?.user_metadata?.full_name || twitchName;
  const twitchAvatar = user?.user_metadata?.avatar_url || "";

  // Auto-fill on first load
  useEffect(() => {
    if (isTwitch && !c.streamerName && twitchDisplayName) {
      setMulti({
        streamerName: twitchDisplayName,
        twitchUsername: twitchName,
        avatarUrl: twitchAvatar,
      });
    }
  }, [isTwitch, twitchDisplayName]);

  const syncFromTwitch = () => {
    if (!isTwitch) return;
    setMulti({
      streamerName: twitchDisplayName,
      twitchUsername: twitchName,
      avatarUrl: twitchAvatar,
    });
  };

  return (
    <div className="nb-config">
      <div className="nb-section">
          {/* Twitch sync */}
          {isTwitch && (
            <div className="oc-twitch-info" style={{ marginBottom: 12 }}>
              {twitchAvatar && (
                <img src={twitchAvatar} alt="" className="oc-twitch-avatar" />
              )}
              <div className="oc-twitch-details">
                <span className="oc-twitch-name">{twitchDisplayName}</span>
                <span className="oc-twitch-badge">Twitch</span>
              </div>
              <button
                type="button"
                className="oc-btn oc-btn--sm oc-btn--primary"
                onClick={syncFromTwitch}
              >
                Sync
              </button>
            </div>
          )}
          {!isTwitch && (
            <p
              className="oc-config-hint"
              style={{ color: "#f59e0b", marginBottom: 12 }}
            >
              Log in with Twitch to auto-fill your name and avatar.
            </p>
          )}

          <h4 className="nb-subtitle">Streamer Info</h4>
          <label className="nb-field">
            <span>Name</span>
            <input
              value={c.streamerName || ""}
              onChange={(e) => set("streamerName", e.target.value)}
              placeholder="Your name"
            />
          </label>
          <label className="nb-field">
            <span>Motto</span>
            <input
              value={c.motto || ""}
              onChange={(e) => set("motto", e.target.value)}
              placeholder="Just Content"
            />
          </label>

          <h4 className="nb-subtitle">Badge Image</h4>
          <p className="oc-config-hint" style={{ marginBottom: 6 }}>
            Shows next to your name &amp; motto.
          </p>
          <div className="nb-badge-grid">
            {[
              { value: "", label: "None" },
              { value: "/badges/content.png", label: "Content" },
              { value: "/badges/raw.png", label: "Raw" },
              { value: "/badges/wager.png", label: "Wager" },
            ].map((b) => (
              <button
                key={b.value}
                className={`nb-badge-option ${(c.badgeImage || "") === b.value ? "nb-badge-option--active" : ""}`}
                onClick={() => set("badgeImage", b.value)}
              >
                {b.value ? (
                  <img
                    src={b.value}
                    alt={b.label}
                    className="nb-badge-preview"
                  />
                ) : (
                  <span className="nb-badge-none">✕</span>
                )}
                <span>{b.label}</span>
              </button>
            ))}
          </div>

          {c.showCTA && (
            <label className="nb-field" style={{ marginTop: 6 }}>
              <span>CTA Text</span>
              <input
                value={c.ctaText || ""}
                onChange={(e) => set("ctaText", e.target.value)}
                placeholder="Be Gamble Aware!"
              />
            </label>
          )}

          {/* ─── Start ─── */}
          <h4 className="nb-subtitle" style={{ marginTop: 14 }}>
            Start
          </h4>
          <label className="nb-field">
            <span>Value</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={c.startBalance ?? ""}
              onChange={(e) =>
                setMulti({
                  startBalance: e.target.value,
                  startValue: "",
                  showStartBalance: true,
                })
              }
              placeholder="1000"
            />
          </label>
          <label className="nb-field">
            <span>Currency</span>
            <select
              value={c.balanceCurrency || "€"}
              onChange={(e) =>
                setMulti({
                  balanceCurrency: e.target.value,
                  showStartBalance: true,
                })
              }
            >
              <option value="€">€ EUR</option>
              <option value="zł">zł PLN</option>
              <option value="$">$ USD</option>
            </select>
          </label>

          {/* ─── Casino ─── */}
          {c.showCasino && (
            <>
              <h4 className="nb-subtitle" style={{ marginTop: 14 }}>
                Casino
              </h4>
              <label className="nb-field">
                <span>Casino Name</span>
                <input
                  value={c.casinoName || ""}
                  onChange={(e) => set("casinoName", e.target.value)}
                  placeholder="Stake"
                />
              </label>
              <label className="nb-field">
                <span>Casino Logo URL</span>
                <input
                  value={c.casinoLogoUrl || ""}
                  onChange={(e) => set("casinoLogoUrl", e.target.value)}
                  placeholder="https://..."
                />
              </label>
              <label className="nb-slider-field">
                <span className="nb-slider-label">Logo size</span>
                <input
                  type="range"
                  min={20}
                  max={300}
                  step={5}
                  value={c.casinoImageSize ?? 100}
                  onChange={(e) =>
                    set("casinoImageSize", Number(e.target.value))
                  }
                />
                <span className="nb-slider-value">
                  {c.casinoImageSize ?? 100}%
                </span>
              </label>
            </>
          )}

          {c.showSocials && (
            <>
              <h4 className="nb-subtitle" style={{ marginTop: 14 }}>
                Socials
              </h4>
              <label className="nb-field">
                <span>Twitch</span>
                <input
                  value={c.twitchUsername || ""}
                  onChange={(e) => set("twitchUsername", e.target.value)}
                  placeholder="channel"
                />
              </label>
              <label className="nb-field">
                <span>Kick</span>
                <input
                  value={c.kickChannelId || c.kickChannel || ""}
                  onChange={(e) => set("kickChannelId", e.target.value)}
                  placeholder="channel"
                />
              </label>
              <label className="nb-field">
                <span>YouTube</span>
                <input
                  value={c.youtubeChannel || ""}
                  onChange={(e) => set("youtubeChannel", e.target.value)}
                  placeholder="@channel"
                />
              </label>
              <label className="nb-field">
                <span>X</span>
                <input
                  value={c.xUsername || ""}
                  onChange={(e) => set("xUsername", e.target.value)}
                  placeholder="handle"
                />
              </label>
              <label className="nb-field">
                <span>Instagram</span>
                <input
                  value={c.instagramUsername || ""}
                  onChange={(e) => set("instagramUsername", e.target.value)}
                  placeholder="handle"
                />
              </label>
              <label className="nb-field">
                <span>Discord invite</span>
                <input
                  value={c.discordUrl || ""}
                  onChange={(e) => set("discordUrl", e.target.value)}
                  placeholder="invite or URL"
                />
              </label>
              <label className="nb-field">
                <span>TikTok</span>
                <input
                  value={c.tiktokUsername || ""}
                  onChange={(e) => set("tiktokUsername", e.target.value)}
                  placeholder="handle"
                />
              </label>
            </>
          )}

          {/* ─── Spotify status (connect via Profile) ─── */}
          {c.showNowPlaying && (
            <>
              <h4 className="nb-subtitle" style={{ marginTop: 14 }}>
                🎵 Music Source
              </h4>
              <div className="nb-spotify-section">
                {c.spotify_access_token ? (
                  <div className="nb-spotify-connected">
                    <span className="nb-spotify-status">
                      ✅ Spotify Connected
                    </span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      Managed in Profile
                    </span>
                  </div>
                ) : (
                  <div className="nb-spotify-connect-card">
                    <div className="nb-spotify-connect-info">
                      <span className="nb-spotify-connect-icon">🎵</span>
                      <div>
                        <strong>Spotify</strong>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>
                          Connect via <b>Profile</b> section, then click{" "}
                          <b>Sync</b>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </>
          )}
      </div>
    </div>
  );
}
