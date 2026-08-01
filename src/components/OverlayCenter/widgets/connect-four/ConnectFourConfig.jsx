import { Clock3, Gamepad2, MessageSquareText, Palette } from "lucide-react";
import { useAuth } from "../../../../context/AuthContext";
import "./ConnectFourConfig.css";

const DEFAULTS = {
  displayStyle: "chat_connect_four",
  title: "CHAT CONNECT 4",
  playerOneColor: "#ffd23f",
  playerTwoColor: "#f04444",
  boardColor: "#08191f",
  showWager: true,
  showPlayers: true,
  animateDrops: true,
  chatCommand: "!connect4",
  twitchChannel: "",
};

export default function ConnectFourConfig({ config = {}, onChange }) {
  const { user, signInWithTwitch, twitchListener } = useAuth();
  const value = { ...DEFAULTS, ...config };
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="connect-four-config">
      <section className="connect-four-config__section">
        <header>
          <Gamepad2 size={20} />
          <div>
            <span>Widget</span>
            <h2>Display</h2>
          </div>
        </header>

        <label className="connect-four-config__field">
          <span>Header title</span>
          <input
            type="text"
            value={value.title}
            maxLength={32}
            onChange={(event) => set({ title: event.target.value })}
          />
        </label>

        <div className="connect-four-config__toggles">
          <label>
            <input
              type="checkbox"
              checked={value.showWager !== false}
              onChange={(event) => set({ showWager: event.target.checked })}
            />
            <span>Show wager</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={value.showPlayers !== false}
              onChange={(event) => set({ showPlayers: event.target.checked })}
            />
            <span>Show players</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={value.animateDrops !== false}
              onChange={(event) => set({ animateDrops: event.target.checked })}
            />
            <span>Animate moves</span>
          </label>
        </div>
      </section>

      <section className="connect-four-config__section">
        <header>
          <Palette size={20} />
          <div>
            <span>Appearance</span>
            <h2>Game colors</h2>
          </div>
        </header>
        <div className="connect-four-config__colors">
          {[
            ["playerOneColor", "Player one"],
            ["playerTwoColor", "Player two"],
            ["boardColor", "Board"],
          ].map(([key, label]) => (
            <label key={key}>
              <span>{label}</span>
              <input
                type="color"
                value={value[key]}
                onChange={(event) => set({ [key]: event.target.value })}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="connect-four-config__section connect-four-config__reference">
        <header>
          <MessageSquareText size={20} />
          <div>
            <span>Twitch chat</span>
            <h2>Commands</h2>
          </div>
        </header>
        <label className="connect-four-config__field">
          <span>Chat command trigger</span>
          <input
            type="text"
            value={value.chatCommand}
            placeholder="!connect4"
            onChange={(event) => set({ chatCommand: event.target.value })}
          />
        </label>
        <label className="connect-four-config__field">
          <span>Twitch channel (leave empty for auto-detect)</span>
          <input
            type="text"
            value={value.twitchChannel}
            placeholder="auto-detect from profile"
            onChange={(event) => set({ twitchChannel: event.target.value })}
          />
        </label>
        <dl>
          <div><dt>Start</dt><dd>{value.chatCommand} start 100</dd></div>
          <div><dt>Join</dt><dd>{value.chatCommand} join</dd></div>
          <div><dt>Move</dt><dd>{value.chatCommand} 1 through {value.chatCommand} 7</dd></div>
          <div><dt>Cancel</dt><dd>{value.chatCommand} reset</dd></div>
        </dl>
        <p><Clock3 size={16} /> Each turn lasts 60 seconds with a warning at 10 seconds.</p>
        <div className="connect-four-config__command-url">
          <strong>StreamElements command URL</strong>
          <small>Create a custom command named {value.chatCommand} with this URL response.</small>
          <code>{`${window.location.origin}/api/chat-commands?cmd=connect-four&user_id=${user?.id || "<your-user-id>"}&w1=\${1}&w2=\${2}&requester=\${user.username}`}</code>
        </div>
        <div
          className={`connect-four-config__listener ${twitchListener?.connected ? "is-connected" : ""}`}
        >
          <span>
            <strong>
              {twitchListener?.connected
                ? "Twitch listener connected"
                : "Twitch listener needs authorization"}
            </strong>
            <small>
              {twitchListener?.connected
                ? "Chat commands are being received by Streamers Center."
                : twitchListener?.error ||
                  "Reconnect Twitch once to grant chat listener permissions."}
            </small>
          </span>
          {!twitchListener?.connected && (
            <button
              type="button"
              onClick={() =>
                signInWithTwitch("/overlay-center/widgets/connect-four")
              }
            >
              Connect Twitch listener
            </button>
          )}
        </div>
      </section>
    </div>
  );
}