import { Clock3, Gamepad2, MessageSquareText, Palette } from "lucide-react";
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
};

export default function ConnectFourConfig({ config = {}, onChange }) {
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
        <dl>
          <div><dt>Start</dt><dd>!connect4 start 100</dd></div>
          <div><dt>Join</dt><dd>!connect4 join</dd></div>
          <div><dt>Move</dt><dd>!connect4 1 through !connect4 7</dd></div>
          <div><dt>Cancel</dt><dd>!connect4 reset</dd></div>
        </dl>
        <p><Clock3 size={16} /> Each turn lasts 60 seconds with a warning at 10 seconds.</p>
      </section>
    </div>
  );
}