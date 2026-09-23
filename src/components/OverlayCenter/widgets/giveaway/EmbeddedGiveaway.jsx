import React from "react";

export function giveawayParticipantName(value) {
  return typeof value === "string" ? value :
    value?.name || value?.username || value?.displayName || value?.login || "";
}

// The parent GiveawayWidget owns entry collection; this is only its chat layout.
export default function EmbeddedGiveaway({ config, palette, children }) {
  const c = config || {};
  const participants = Array.isArray(c.participants) ? c.participants : [];
  const winner = giveawayParticipantName(c.winner);
  const drawing = !winner && Boolean(c.spinningWinner);
  const keyword = String(c.keyword || "").trim().replace(/^!+/, "");
  return (
    <section className="ov-chat-giveaway" aria-label="Giveaway" style={{
      position: "relative", minWidth: 0, minHeight: 0, flex: "0 1 auto",
      maxHeight: "40%", overflow: "auto", margin: "4px 9px", padding: 8,
      border: `1px solid ${palette.border}`, borderRadius: palette.radius,
      background: palette.background, color: palette.text, fontFamily: "inherit",
      fontSize: "clamp(11px, .9em, 17px)", lineHeight: 1.3,
    }}>
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
        <strong style={{ overflowWrap: "anywhere", color: palette.accent }}>{c.title || "Giveaway"}</strong>
        <span>{winner ? "Winner" : drawing ? "Drawing" : c.isActive ? "Open" : "Paused"}</span>
      </div>
      {c.prize && <div style={{ marginTop: 5, overflowWrap: "anywhere" }}>{c.prize}</div>}
      {drawing ? children : winner ? (
        <div role="status" style={{ marginTop: 6, fontWeight: 900, fontSize: "1.25em", overflowWrap: "anywhere", color: palette.accent }}>
          🏆 {winner}
        </div>
      ) : keyword && c.isActive ? (
        <div style={{ marginTop: 6 }}>Type <strong>!{keyword}</strong> to enter</div>
      ) : null}
      <div style={{ marginTop: 6 }}>{participants.length} {participants.length === 1 ? "entry" : "entries"}</div>
    </section>
  );
}
