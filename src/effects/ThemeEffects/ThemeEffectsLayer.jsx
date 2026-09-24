import React, { useEffect, useMemo, useRef, useState } from "react";
import { resolveInstanceThemeEffects } from "./themeEffectsConfig";
import "./ThemeEffects.css";

function buildEffectTargets(instances, singleInstanceId) {
  return (instances || []).flatMap((instance) => {
    if (
      instance?.visible === false ||
      (singleInstanceId && instance.instanceId !== singleInstanceId)
    ) {
      return [];
    }
    const resolved = resolveInstanceThemeEffects(instance);
    if (!resolved) return [];
    return [{
      id: instance.instanceId,
      widgetType: instance.widgetType,
      x: singleInstanceId ? 0 : Number(instance.x || 0),
      y: singleInstanceId ? 0 : Number(instance.y || 0),
      width: Math.max(1, Number(instance.width || 1)),
      height: Math.max(1, Number(instance.height || 1)),
      ...resolved,
    }];
  });
}

function readDebugFlag() {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("fxDebug") === "1";
}

function countTargetEvents(element) {
  return element.querySelectorAll(
    '[data-widget-state="opened"], .slot-bingo-widget__square.is-complete, .slot-bingo-widget__square.is-free',
  ).length;
}

export default function ThemeEffectsLayer({
  instances,
  width,
  height,
  singleInstanceId = "",
  runtime = "editor",
}) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const targetsRef = useRef([]);
  const dimensionsRef = useRef({ width, height });
  const eventCountsRef = useRef(new Map());
  const [failed, setFailed] = useState(false);
  const [debugStats, setDebugStats] = useState(null);
  const debug = useMemo(readDebugFlag, []);
  const targets = useMemo(
    () => buildEffectTargets(instances, singleInstanceId),
    [instances, singleInstanceId],
  );
  targetsRef.current = targets;
  dimensionsRef.current = { width, height };

  useEffect(() => {
    if (!targets.length || !canvasRef.current) return undefined;
    let alive = true;
    let engine = null;

    import("./PixiEngine/createPixiThemeEngine")
      .then(({ createPixiThemeEngine }) => createPixiThemeEngine({
        canvas: canvasRef.current,
        width: dimensionsRef.current.width,
        height: dimensionsRef.current.height,
        targets: targetsRef.current,
      }))
      .then((createdEngine) => {
        if (!alive) {
          createdEngine.destroy();
          return;
        }
        engine = createdEngine;
        engineRef.current = createdEngine;
        createdEngine.resize(dimensionsRef.current.width, dimensionsRef.current.height);
        createdEngine.updateTargets(targetsRef.current, { transition: false }).catch((error) => {
          console.error("[ThemeEffects] Failed to synchronize initial targets:", error);
        });
        setFailed(false);
      })
      .catch((error) => {
        if (!alive) return;
        setFailed(true);
        console.error("[ThemeEffects] PixiJS initialization failed; CSS theme remains active.", error);
      });

    return () => {
      alive = false;
      if (engineRef.current === engine) engineRef.current = null;
      engine?.destroy();
    };
    // The engine lifecycle is tied to this canvas. Geometry and theme changes
    // are handled by the update effect below without creating a new renderer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(targets.length)]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.resize(width, height);
    engine.updateTargets(targets).catch((error) => {
      console.error("[ThemeEffects] Failed to update targets:", error);
    });
  }, [height, targets, width]);

  useEffect(() => {
    if (!targets.length) return undefined;
    const onVisibility = () => {
      engineRef.current?.setVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [targets.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement?.parentElement;
    if (!host || !targets.length) return undefined;
    let frame = 0;
    const inspect = () => {
      frame = 0;
      targetsRef.current.forEach((target) => {
        const element = host.querySelector(`[data-effect-target-id="${CSS.escape(target.id)}"]`);
        if (!element) return;
        const count = countTargetEvents(element);
        const previous = eventCountsRef.current.get(target.id);
        eventCountsRef.current.set(target.id, count);
        if (previous != null && count > previous) engineRef.current?.burst(target.id);
      });
    };
    const scheduleInspect = () => {
      if (!frame) frame = window.requestAnimationFrame(inspect);
    };
    inspect();
    const observer = new MutationObserver(scheduleInspect);
    observer.observe(host, { attributes: true, childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [targets.length]);

  useEffect(() => {
    if (!debug || !targets.length) return undefined;
    const timer = window.setInterval(() => {
      setDebugStats(engineRef.current?.getStats() || null);
    }, 500);
    return () => window.clearInterval(timer);
  }, [debug, targets.length]);

  if (!targets.length) return null;
  return (
    <div
      className="theme-effects-layer"
      data-effects-runtime={runtime}
      data-effects-fallback={failed ? "css" : undefined}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="theme-effects-layer__canvas" />
      {debug && debugStats && (
        <output className="theme-effects-layer__debug">
          FX {debugStats.quality.toUpperCase()} · {debugStats.fps} FPS · {debugStats.particles} particles · {debugStats.targets} targets · DPR {debugStats.resolution}
        </output>
      )}
    </div>
  );
}
