import React, { useState } from "react";
import { SiKick, SiTwitch, SiYoutube } from "react-icons/si";
import { appearanceAttrs, subElementStyle } from "../shared/appearanceStyles";

const platforms = [
  { key: "kick", Icon: SiKick, color: "#53fc18", label: "Kick" },
  { key: "twitch", Icon: SiTwitch, color: "#c4b5fd", label: "Twitch" },
  { key: "youtube", Icon: SiYoutube, color: "#ff0033", label: "YouTube" },
];
const attrs = (config, elementId) => ({
  "data-appearance-part": elementId,
  ...appearanceAttrs({ config, widgetType: "chat", widgetId: config.__betterInstanceId, elementId }),
});

export function CommunityChatHeader({ config: c, chatHeaderName, recentBits }) {
  const pill = { display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 10px", border: `2px solid ${c.borderColor}`, borderRadius: 16, fontWeight: 800, minWidth: 0, flexWrap: "wrap" };
  return <div {...attrs(c, "header")} style={subElementStyle(c, "header", {
    display: "flex", flex: "0 0 auto", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between",
    gap: 6, padding: 7, color: c.text, fontSize: "0.9em", minWidth: 0,
  })}>
    <span {...attrs(c, "bitsCounter")} title="Bits in recent chat messages" style={subElementStyle(c, "bitsCounter", pill)}>💎 {recentBits.toLocaleString()}</span>
    <span {...attrs(c, "viewerCounter")} style={subElementStyle(c, "viewerCounter", pill)}>
      {platforms.filter(p => c[`${p.key}Enabled`]).map(({ key, Icon, color, label }) => <Icon key={key} aria-label={label} style={{ color, flexShrink: 0 }} />)}
      {c.showViewerCount ? <span title="Configured viewer count">{Math.max(0, Number(c.viewerCount) || 0).toLocaleString()}</span> : null}
      {c.showLiveLabel !== false ? <span style={{ fontSize: "0.7em" }}>{c.live ? "LIVE" : "CHAT"}</span> : null}
    </span>
    {c.showHeaderName !== false ? <strong {...attrs(c, "headerName")} style={subElementStyle(c, "headerName", { width: "100%", fontSize: "0.65em", opacity: 0.6, overflowWrap: "anywhere" })}>{chatHeaderName}</strong> : null}
  </div>;
}

export function CommunityChatMessage({ msg, nameColor, context, rootRef, visible, msgIdx }) {
  const c = context.config;
  const [avatarFailed, setAvatarFailed] = useState(false);
  const raid = Boolean(msg.isRaid || msg.type === "raid");
  const event = raid || ["sub", "gift"].includes(msg.type);
  const highlighted = event && c.celebrations?.[raid ? "raid" : msg.type] !== false;
  const part = highlighted ? "highlightedMessage" : "message";
  const avatar = msg.raidAvatar || msg.avatarUrl || msg.avatar || msg.profileImageUrl;
  const badge = msg.isBroadcaster ? "👑" : msg.isMod ? "⚔️" : msg.isVip ? "💎" : msg.isSub ? "⭐" : "";
  const content = raid ? `raided with ${Math.max(0, Number(msg.raidViewers) || 0)} viewers!` : context.renderMessageContent(msg);
  return <div ref={rootRef} className="community-chat-row" aria-hidden={!visible} {...attrs(c, part)} style={subElementStyle(c, part, {
    position: "relative", flex: "0 0 auto", minWidth: 0, overflowWrap: "anywhere",
    margin: `${Number(context.msgSpacing) || 0}px 0`, padding: highlighted ? "10px" : "0 8px",
    background: highlighted ? `linear-gradient(110deg, ${c.bubble}, ${c.glow})` : "transparent",
    border: highlighted ? `2px solid ${c.raidBorderColor}` : "0 solid transparent",
    borderRadius: highlighted ? 8 : 0, boxShadow: highlighted ? `0 0 ${Math.min(10, Math.max(1, Number(c.celebrations?.intensity) || 5)) * 2}px ${c.raidBorderColor}44` : "none",
    display: highlighted ? "flex" : "block", alignItems: "center", gap: 10,
    maxHeight: `calc(var(--chat-available-height, 100%) - ${(Number(context.msgSpacing) || 0) * 2}px)`, overflowY: "auto",
    lineHeight: context.msgLineHeight,
    animation: c.animation === "none" ? "none" : `${({ "slide-up": "better-chat-slide-up", "slide-down": "better-chat-slide-down", "slide-left": "better-chat-slide-left", "slide-right": "better-chat-slide-right" })[c.animation] || "better-chat-fade-in"} 220ms ease-out ${Math.min(msgIdx * (Number(c.stagger) || 0), 1200)}ms both`,
    visibility: visible ? "visible" : "hidden",
  })}>
    {highlighted ? <span {...attrs(c, "avatar")} style={context.avatarStyle({ width: 30, height: 30, flexShrink: 0, borderRadius: "50%", overflow: "hidden", display: "grid", placeItems: "center", background: c.panel, fontSize: 12 })}>
      {avatar && !avatarFailed ? <img src={avatar} alt="" referrerPolicy="no-referrer" onError={() => setAvatarFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (msg.username || "?").slice(0, 1).toUpperCase()}
    </span> : null}
    <span style={{ minWidth: 0 }}>
      {badge && c.showRoleBadges !== false ? <span {...attrs(c, "badge")} style={context.badgeStyle({ marginRight: 5, fontSize: "0.85em" })}>{badge}</span> : null}
      <strong {...attrs(c, "username")} style={context.usernameStyle({ color: highlighted ? c.text : nameColor, fontSize: context.usernameSize, fontWeight: context.nameBold ? 800 : 400 })}>{msg.username || msg.user || "viewer"}</strong>
      <span {...attrs(c, "messageText")} style={context.messageTextStyle({ display: highlighted ? "block" : "inline", color: context.textColor, whiteSpace: "pre-wrap", lineHeight: context.msgLineHeight })}>{highlighted ? "" : ": "}{content}</span>
    </span>
  </div>;
}
