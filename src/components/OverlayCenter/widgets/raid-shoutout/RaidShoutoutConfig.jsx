import React, { useEffect } from "react";
import { MessageSquare, ShieldCheck, Twitch } from "lucide-react";
import useTwitchChannel from "../../../../hooks/useTwitchChannel";
import "./RaidShoutoutConfig.css";

export default function RaidShoutoutConfig({ config = {}, onChange }) {
  const detectedChannel = useTwitchChannel();
  const channel = String(config.twitchChannel || detectedChannel || "")
    .trim()
    .replace(/^#/, "")
    .toLowerCase();

  useEffect(() => {
    if (!config.twitchChannel && detectedChannel) {
      onChange({ ...config, twitchChannel: detectedChannel });
    }
  }, [config, detectedChannel, onChange]);

  const set = (patch) => onChange({ ...config, ...patch });

  return (
    <div className="shoutout-config">
      <section className="shoutout-config__card">
        <header>
          <Twitch size={20} />
          <div>
            <span>Chat source</span>
            <h2>Twitch channel</h2>
          </div>
        </header>
        <label className="shoutout-config__field">
          <span>Channel username</span>
          <input
            value={channel}
            onChange={(event) =>
              set({
                twitchChannel: event.target.value
                  .replace(/^#/, "")
                  .trim()
                  .toLowerCase(),
              })
            }
            placeholder="yourchannel"
          />
        </label>
        <label className="shoutout-config__toggle">
          <span>
            <strong>Enable !so command</strong>
            <small>Listen while the published OBS overlay is open.</small>
          </span>
          <input
            type="checkbox"
            checked={config.chatCommandEnabled !== false}
            onChange={(event) =>
              set({ chatCommandEnabled: event.target.checked })
            }
          />
        </label>
      </section>

      <section className="shoutout-config__card shoutout-config__command">
        <header>
          <MessageSquare size={20} />
          <div>
            <span>Chat command</span>
            <h2>Trigger a clip shoutout</h2>
          </div>
        </header>
        <code>!so username</code>
        <div className="shoutout-config__notice">
          <ShieldCheck size={18} />
          <p>
            Only the channel owner and Twitch moderators can trigger the widget.
            The target username is resolved by Twitch and a random clip is
            queued for the published Better overlay.
          </p>
        </div>
      </section>
    </div>
  );
}
