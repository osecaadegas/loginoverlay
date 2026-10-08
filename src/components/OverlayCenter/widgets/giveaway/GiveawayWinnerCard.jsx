import React, { useEffect, useMemo, useRef, useState } from "react";
import { emitIceEvent } from '../../../../effects/ThemeEffects/emitIceEvent.js';
import { Radio } from 'lucide-react';
import "./GiveawayWinnerCard.css";

function participantName(value) {
  return typeof value === "string"
    ? value
    : value?.name || value?.username || value?.displayName || value?.login || "";
}

function avatarUrl(value, fallbackName = "") {
  if (value && typeof value === "object") {
    const explicit =
      value.avatarUrl ||
      value.profileImageUrl ||
      value.profile_image_url ||
      value.userAvatar ||
      value.photoUrl ||
      "";
    if (explicit) return explicit;
    if (String(value.platform || "twitch").toLowerCase() !== "twitch") return "";
  }

  const login = String(
    (typeof value === "object" &&
      (value?.login || value?.username || value?.name)) ||
      fallbackName,
  )
    .trim()
    .toLowerCase();
  return login
    ? `https://unavatar.io/twitch/${encodeURIComponent(login)}`
    : "";
}

function initials(value) {
  return String(value || "Winner")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function resolveGiveawayWinner(config = {}) {
  const winnerValue = config.winner;
  const name = participantName(winnerValue);
  if (!name) return null;

  const matchingParticipant = (config.participants || []).find(
    (participant) =>
      participantName(participant).trim().toLowerCase() ===
      name.trim().toLowerCase(),
  );
  const source =
    winnerValue && typeof winnerValue === "object"
      ? { ...(matchingParticipant || {}), ...winnerValue }
      : matchingParticipant || winnerValue;

  return {
    name,
    avatarUrl: avatarUrl(source, name),
    initials: initials(name),
  };
}

export default function GiveawayWinnerCard({ config = {} }) {
  const winner = useMemo(() => resolveGiveawayWinner(config), [config]);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => setAvatarFailed(false), [winner?.avatarUrl]);
  useEffect(() => {
    if (!winner?.name || !cardRef.current?.closest('[data-colour-theme="orbital"]')) return;
    // Let the shared effect layer measure the result card after the reel exits.
    // This is a finite notification, not a widget animation loop.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => emitIceEvent(cardRef.current, 'giveaway'));
    });
    return () => cancelAnimationFrame(frame);
  }, [winner?.name]);
  if (!winner) return null;

  return (
    <div className="better-gw-result-stage">
      <header className="better-gw-transmission-header">
        <Radio size={17} aria-hidden="true" />
        <span>{config.title || 'Giveaway'}</span>
        <small>Winner</small>
      </header>
      <section
        ref={cardRef}
        className="better-gw-result-card"
        data-widget-element="winnerArea"
        role="status"
        aria-live="polite"
        aria-label={`${winner.name} won the giveaway`}
      >
        <span className="better-gw-result-frost" aria-hidden="true" />
        <span className="better-gw-result-crystal better-gw-result-crystal--left" aria-hidden="true" />
        <span className="better-gw-result-crystal better-gw-result-crystal--right" aria-hidden="true" />

        <div className="better-gw-result-avatar" data-widget-element="avatar">
          {winner.avatarUrl && !avatarFailed ? (
            <img
              src={winner.avatarUrl}
              alt={`${winner.name} avatar`}
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <span>{winner.initials}</span>
          )}
          <i aria-hidden="true">WIN</i>
        </div>

        <div className="better-gw-result-copy">
          <span className="better-gw-result-kicker">Giveaway complete</span>
          <strong className="better-gw-result-name">{winner.name}</strong>
          <span className="better-gw-result-message">won the giveaway</span>
          {config.prize ? (
            <span className="better-gw-result-prize">{config.prize}</span>
          ) : null}
        </div>
      </section>
    </div>
  );
}
