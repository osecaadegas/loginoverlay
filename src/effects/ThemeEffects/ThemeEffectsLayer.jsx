import React, { useEffect, useMemo, useRef, useState } from "react";
import { resolveInstanceThemeEffects } from "./themeEffectsConfig";
import { findEffectSurface, measureEffectTargets } from "./targetBounds";
import OrbitalStructure from "./orbital/OrbitalStructure.jsx";
import "./ThemeEffects.css";
import "./GreekPremium.css";
import "./ThemeTypography.css";

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
      opacity: Math.min(1, Math.max(0, Number(instance.opacity ?? 1))),
      zIndex: Number(instance.zIndex || 0),
      ...resolved,
    }];
  });
}

function readDebugOptions() {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return { enabled: false, effect: "" };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    enabled: params.get("fxDebug") === "1",
    effect: String(params.get("fxDebugEffect") || "").toLowerCase(),
  };
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
  const visibleRef = useRef(true);
  const targetsRef = useRef([]);
  const dimensionsRef = useRef({ width, height });
  const eventCountsRef = useRef(new Map());
  const [failed, setFailed] = useState(false);
  const [debugStats, setDebugStats] = useState(null);
  const [measuredTargets, setMeasuredTargets] = useState([]);
  const debug = useMemo(readDebugOptions, []);
  const targets = useMemo(
    () => buildEffectTargets(instances, singleInstanceId),
    [instances, singleInstanceId],
  );
  dimensionsRef.current = { width, height, runtime };

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement?.parentElement;
    if (!host) return undefined;
    let frame = 0;
    let previous = "";
    const observed = new Set();
    const geometryElements = new Set();
    const unpaintedWrappers = new Set();
    const measure = () => {
      frame = 0;
      geometryElements.clear();
      unpaintedWrappers.clear();
      const surfaces = new Set();
      targets.forEach((target) => {
        const surface = findEffectSurface(host, target);
        if (!surface && target.theme.family === 'orbital') {
          const wrapper = host.querySelector(`[data-effect-target-id="${CSS.escape(target.id)}"]`);
          if (wrapper) unpaintedWrappers.add(wrapper);
        }
        if (surface) surfaces.add(surface);
        // Only transforms on the surface or its ancestors affect its bounds.
        // Animating confetti/messages below it must not remeasure every widget.
        for (let element = surface; element; element = element.parentElement) {
          geometryElements.add(element);
          if (element === host) break;
        }
        if (surface && !observed.has(surface)) {
          observed.add(surface);
          resizeObserver.observe(surface);
        }
      });
      observed.forEach((surface) => {
        if (!surfaces.has(surface)) {
          resizeObserver.unobserve(surface);
          observed.delete(surface);
        }
      });
      const next = measureEffectTargets(host, canvas, targets, width, height);
      const signature = JSON.stringify(next);
      if (signature === previous) return;
      previous = signature;
      targetsRef.current = next;
      setMeasuredTargets(previous => debug.enabled || next.some(target => target.theme.family === 'orbital') ? next : previous.length ? [] : previous);
      engineRef.current?.updateTargets(next).catch((error) => {
        console.error("[ThemeEffects] Failed to update surface bounds:", error);
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(host);
    resizeObserver.observe(canvas);
    const mutationObserver = new MutationObserver((records) => {
      if (records.some((record) => {
        if (record.target.closest?.(".theme-effects-layer")) return false;
        if (record.type === 'childList' && [...unpaintedWrappers].some(wrapper => wrapper.contains(record.target))) return true;
        if (record.type === "attributes") return geometryElements.has(record.target);
        return geometryElements.has(record.target) || [...record.addedNodes, ...record.removedNodes]
          .some((node) => node.nodeType === 1 && (node.matches?.("[data-effect-target-id]") || node.querySelector?.("[data-effect-target-id]")));
      })) schedule();
    });
    mutationObserver.observe(host, { subtree: true, childList: true, attributes: true, attributeFilter: ["style", "class"] });
    window.addEventListener("resize", schedule);
    engineRef.current?.resize(width, height);
    measure();
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [targets, width, height, debug.enabled]);

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
        debugEffect: debug.effect,
        runtime,
      }))
      .then((createdEngine) => {
        if (!alive) {
          createdEngine.destroy();
          return;
        }
        engine = createdEngine;
        engineRef.current = createdEngine;
        createdEngine.setVisible(visibleRef.current && document.visibilityState === "visible");
        createdEngine.setRuntime(dimensionsRef.current.runtime);
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
  }, [Boolean(targets.length), debug.effect]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setRuntime(runtime);
    engine.resize(width, height);
    engine.updateTargets(targetsRef.current).catch((error) => {
      console.error("[ThemeEffects] Failed to update targets:", error);
    });
  }, [height, targets, width, runtime]);

  useEffect(() => {
    if (!targets.length) return undefined;
    let intersects = true;
    const onVisibility = () => {
      visibleRef.current = intersects && document.visibilityState === "visible";
      engineRef.current?.setVisible(visibleRef.current);
    };
    const observer = new IntersectionObserver(([entry]) => {
      intersects = entry.isIntersecting;
      onVisibility();
    });
    if (canvasRef.current) observer.observe(canvasRef.current);
    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [targets.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement?.parentElement;
    if (!host || !targets.length) return undefined;
    let frame = 0;
    const inspect = () => {
      frame = 0;
      const activeIds = new Set(targetsRef.current.map((target) => target.id));
      eventCountsRef.current.forEach((_, id) => { if (!activeIds.has(id)) eventCountsRef.current.delete(id); });
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
    const eventSelector = '[data-widget-state], .slot-bingo-widget__square';
    const observer = new MutationObserver((records) => {
      if (records.some((record) => record.target.matches?.(eventSelector)
        || (record.type === "childList" && [...record.addedNodes, ...record.removedNodes]
          .some((node) => node.nodeType === 1 && (node.matches?.(eventSelector) || node.querySelector?.(eventSelector)))))) scheduleInspect();
    });
    observer.observe(host, { attributes: true, attributeFilter: ["class", "data-widget-state"], childList: true, subtree: true });
    const onEffect = (event) => {
      const wrapper = event.target.closest?.("[data-effect-target-id]");
      if (!wrapper || !host.contains(wrapper)) return;
      const id = wrapper.dataset.effectTargetId;
      const target = targetsRef.current.find((entry) => entry.id === id);
      if (!target || !['ice', 'orbital'].includes(target.theme.family)) return;
      const surface = findEffectSurface(host, target);
      const bounds = surface?.getBoundingClientRect();
      const source = event.detail?.source?.getBoundingClientRect?.();
      engineRef.current?.burst(id, {
        kind: event.detail?.kind,
        x: source && bounds?.width ? (source.left + source.width / 2 - bounds.left) / bounds.width : 0.5,
        y: source && bounds?.height ? (source.top + source.height / 2 - bounds.top) / bounds.height : 0.5,
      });
    };
    host.addEventListener("theme-effects:burst", onEffect);
    return () => {
      observer.disconnect();
      host.removeEventListener("theme-effects:burst", onEffect);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [targets.length]);

  useEffect(() => {
    if (!debug.enabled || !targets.length) return undefined;
    const timer = window.setInterval(() => {
      setDebugStats(engineRef.current?.getStats() || null);
    }, 500);
    return () => window.clearInterval(timer);
  }, [debug.enabled, targets.length]);

  if (!targets.length) return null;
  return (
    <div
      className="theme-effects-layer"
      data-effects-runtime={runtime}
      data-effects-fallback={failed ? "css" : undefined}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="theme-effects-layer__canvas" />
      <OrbitalStructure targets={measuredTargets} width={width} height={height} singleInstanceId={singleInstanceId} />
      {debug.enabled && measuredTargets.map((target) => (
        <span
          key={target.id}
          className="theme-effects-layer__target-debug"
          style={{
            left: target.x,
            top: target.y,
            width: target.width,
            height: target.height,
          }}
        >
          {target.widgetType} · z {target.zIndex} · {Math.round(target.width)}×{Math.round(target.height)}
        </span>
      ))}
      {debug.enabled && debugStats && (
        <output className="theme-effects-layer__debug" data-frames={debugStats.frames} data-running={String(debugStats.running)} data-ready={debugStats.pending ? 'false' : 'true'} data-last-event={debugStats.lastEvent}>
          FX {debugStats.quality.toUpperCase()} · {debugStats.fps} FPS · {debugStats.particles} particles · {debugStats.targets} targets · DPR {debugStats.resolution}{debugStats.debugEffect ? ` · FORCE ${debugStats.debugEffect.toUpperCase()}` : ""}
        </output>
      )}
    </div>
  );
}
