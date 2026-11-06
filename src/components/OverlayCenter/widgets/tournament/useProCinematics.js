import React from "react";
import { ProCinematicController } from "./proCinematicController";
import { createProProcessedRegistry, diffProVisualEvents, snapshotProMatches } from "./proVisualEvents";

export default function useProCinematics({ allMatches, match, tournamentId, settings, enabled, startSignal }) {
  const rootRef = React.useRef(null);
  const baselineRef = React.useRef(null);
  const startSignalRef = React.useRef(startSignal);
  const controllerRef = React.useRef(null);
  const queueRef = React.useRef([]);
  const playingRef = React.useRef(null);
  const shatterResolveRef = React.useRef(null);
  const latestRef = React.useRef({ allMatches, match, settings });
  latestRef.current = { allMatches, match, settings };
  const registryRef = React.useRef(null);
  if (!registryRef.current) {
    let storage = null;
    try { storage = typeof window === "undefined" ? null : window.sessionStorage; } catch { /* Browser source storage can be disabled. */ }
    registryRef.current = createProProcessedRegistry(storage);
  }
  const [heldId, setHeldId] = React.useState(null);
  const [shatterInfo, setShatterInfo] = React.useState(null);

  const cancel = React.useCallback(() => {
    controllerRef.current?.dispose();
    controllerRef.current = null;
    queueRef.current = [];
    playingRef.current = null;
    shatterResolveRef.current?.();
    shatterResolveRef.current = null;
    setShatterInfo(null);
    setHeldId(null);
  }, []);

  const shatter = React.useCallback((event) => {
    const latestMatch = latestRef.current.allMatches.find((item) => String(item.id) === event.matchId);
    const loser = event.winner === "player1" ? "right" : "left";
    const slot = latestMatch?.rounds?.[event.roundIndex]?.[loser === "left" ? "slot1" : "slot2"]
      || latestMatch?.[loser === "left" ? "slot1" : "slot2"];
    return new Promise((resolve) => {
      shatterResolveRef.current = resolve;
      setShatterInfo({ side: loser, imageUrl: slot?.image || null, roundIndex: event.roundIndex });
    });
  }, []);

  const onShatterComplete = React.useCallback(() => {
    const resolve = shatterResolveRef.current;
    shatterResolveRef.current = null;
    setShatterInfo(null);
    resolve?.();
  }, []);

  const drain = React.useCallback(async () => {
    if (playingRef.current) return;
    while (queueRef.current.length) {
      const event = queueRef.current.shift();
      if (registryRef.current.has(event.key)) continue;
      const live = latestRef.current;
      const visualMatch = live.allMatches.find((item) => String(item.id) === event.matchId);
      if (!visualMatch || !rootRef.current) continue;
      setHeldId(event.matchId);
      playingRef.current = event;
      // Let React commit the held match before querying its cards.
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (playingRef.current !== event) continue;
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const hidden = document.visibilityState === "hidden";
      if (!reduced && !hidden) {
        const controller = new ProCinematicController(rootRef.current, live.settings);
        controllerRef.current = controller;
        try {
          const completed = await controller.play(event, shatter);
          if (completed && playingRef.current === event) registryRef.current.add(event.key);
        } catch (error) {
          console.error("PRO tournament animation failed", error);
        } finally {
          controller.dispose();
          if (controllerRef.current === controller) controllerRef.current = null;
        }
      } else registryRef.current.add(event.key);
      if (playingRef.current === event) playingRef.current = null;
    }
    setHeldId(null);
  }, [shatter]);

  // Fingerprints change only when tournament data changes; ordinary React renders do not restart playback.
  const fingerprint = JSON.stringify(snapshotProMatches(allMatches, tournamentId));
  React.useLayoutEffect(() => {
    const next = snapshotProMatches(latestRef.current.allMatches, tournamentId);
    const started = startSignalRef.current !== "active" && startSignal === "active";
    startSignalRef.current = startSignal;
    if (!enabled) { baselineRef.current = next; cancel(); return; }
    if (baselineRef.current === null) { baselineRef.current = next; return; }
    const diff = diffProVisualEvents(baselineRef.current, next);
    baselineRef.current = next;
    if (diff.reset) {
      cancel();
      registryRef.current.clear();
      return;
    }
    if (playingRef.current && diff.events.some((event) => event.matchId === playingRef.current.matchId
      && event.roundId === playingRef.current.roundId && event.key !== playingRef.current.key)) cancel();
    const events = diff.events;
    if (started && next.length && !events.some((event) => event.type === "intro")) {
      const first = next.find((item) => item.id === String(latestRef.current.match?.id)) || next[0];
      events.unshift({ type: "intro", matchId: first.id, key: JSON.stringify([first.tournamentId, first.id, "match", "intro", "start"]) });
    }
    for (const event of events) {
      if (!registryRef.current.has(event.key) && playingRef.current?.key !== event.key
        && !queueRef.current.some((pending) => pending.key === event.key)) queueRef.current.push(event);
    }
    void drain();
  }, [fingerprint, tournamentId, enabled, startSignal, cancel, drain]);

  React.useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => { if (query?.matches) cancel(); };
    const onVisibility = () => { if (document.visibilityState === "hidden") cancel(); };
    query?.addEventListener?.("change", onMotionChange);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      query?.removeEventListener?.("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibility);
      cancel();
    };
  }, [cancel]);

  const renderMatch = heldId ? allMatches.find((item) => String(item.id) === heldId) || match : match;
  return { rootRef, renderMatch, shatterInfo, onShatterComplete };
}
