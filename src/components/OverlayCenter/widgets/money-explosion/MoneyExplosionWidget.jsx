import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Banknote, TriangleAlert } from "lucide-react";
import { DEFAULT_MONEY_EXPLOSION_CONFIG, sanitizeMoneyExplosionConfig } from "./config";
import { MoneyExplosionRenderer } from "./renderer";
import "./MoneyExplosionWidget.css";

const EVENT_NAME = "streamerscenter:money-explosion";
const STATUS_EVENT_NAME = "streamerscenter:money-explosion-status";
const ACTIONS = new Set(["moneyExplosion", "moneyReconstruction", "toggleMoneyTransition", "resetMoneyTransition", "preview"]);

function describeError(message) {
  const text = String(message || "");
  if (/transparent background|visible silhouette|chroma key/i.test(text)) return { kind: "chroma", title: "Adjust chroma key", action: "Dismiss" };
  if (/camera|permission|selected source|capture requires/i.test(text)) return { kind: "camera", title: "Camera access needed", action: "Try camera again" };
  return { kind: "renderer", title: "Effect needs attention", action: "Dismiss" };
}

function rendererConfig(config, previewOnly) {
  return sanitizeMoneyExplosionConfig({ ...DEFAULT_MONEY_EXPLOSION_CONFIG, ...config, source: previewOnly ? "demo" : config?.source || "default", sound: previewOnly ? false : config?.sound === true });
}

function installBrowserApi() {
  if (typeof window === "undefined") return;
  const api = window.StreamersCenter || {};
  const dispatch = (action, instanceId) => window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { action, instanceId } }));
  api.moneyExplosion = (instanceId) => dispatch("moneyExplosion", instanceId);
  api.moneyReconstruction = (instanceId) => dispatch("moneyReconstruction", instanceId);
  api.toggleMoneyTransition = (instanceId) => dispatch("toggleMoneyTransition", instanceId);
  api.resetMoneyTransition = (instanceId) => dispatch("resetMoneyTransition", instanceId);
  window.StreamersCenter = api;
}

export default function MoneyExplosionWidget({ config = {}, widgetId, previewOnly = false, runtime = "editor" }) {
  const instanceId = String(config.__betterInstanceId || widgetId || "money-explosion");
  const normalized = useMemo(() => rendererConfig(config, previewOnly), [config, previewOnly]);
  const normalizedRef = useRef(normalized); normalizedRef.current = normalized;
  const hostRef = useRef(null); const rendererRef = useRef(null); const timerRef = useRef(null); const previewCycleRef = useRef(false); const ranOnLoadRef = useRef(false);
  const [ready, setReady] = useState(false); const [state, setState] = useState("VISIBLE"); const [error, setError] = useState(""); const [obsPermissionWait, setObsPermissionWait] = useState(false); const [metrics, setMetrics] = useState({ banknotes: 0, particles: 0 });

  const clearTimer = useCallback(() => { if (timerRef.current) window.clearTimeout(timerRef.current); timerRef.current = null; }, []);
  const emitStatus = useCallback((detail) => window.dispatchEvent(new CustomEvent(STATUS_EVENT_NAME, { detail: { ...detail, instanceId } })), [instanceId]);
  const runAction = useCallback((action) => {
    const renderer = rendererRef.current; if (!renderer || !ACTIONS.has(action)) return false;
    clearTimer(); setError("");
    if (action === "preview") { previewCycleRef.current = true; return renderer.previewTransition(); }
    previewCycleRef.current = false;
    if (action === "moneyExplosion") return renderer.moneyExplosion();
    if (action === "moneyReconstruction") return renderer.moneyReconstruction();
    if (action === "toggleMoneyTransition") return renderer.toggleMoneyTransition();
    renderer.resetMoneyTransition(); return true;
  }, [clearTimer]);

  const retryCamera = useCallback(() => {
    const renderer = rendererRef.current; if (!renderer) return; setError(""); setReady(false); setObsPermissionWait(false);
    void renderer.setSource(normalizedRef.current.source).catch((failure) => setError(failure?.message || "The selected camera is unavailable."));
  }, []);

  useEffect(() => {
    installBrowserApi();
    const receive = (event) => { const detail = event.detail || {}; if (detail.instanceId && String(detail.instanceId) !== instanceId && String(detail.instanceId) !== String(widgetId || "")) return; if (ACTIONS.has(detail.action)) runAction(detail.action); };
    window.addEventListener(EVENT_NAME, receive); return () => window.removeEventListener(EVENT_NAME, receive);
  }, [instanceId, widgetId, runAction]);

  useEffect(() => {
    const host = hostRef.current; if (!host) return undefined; let cancelled = false;
    const renderer = new MoneyExplosionRenderer(normalizedRef.current, {
      onState: (nextState) => {
        if (cancelled) return; setState(nextState); emitStatus({ type: "state", state: nextState });
        if (nextState === "HIDDEN" && previewCycleRef.current) { clearTimer(); timerRef.current = window.setTimeout(() => renderer.moneyReconstruction(), 500); return; }
        if (nextState === "HIDDEN" && !previewOnly && normalizedRef.current.triggerMode === "loop") { clearTimer(); timerRef.current = window.setTimeout(() => renderer.moneyReconstruction(), normalizedRef.current.hiddenDuration * 1000); return; }
        if (nextState === "VISIBLE" && !previewOnly && normalizedRef.current.triggerMode === "loop" && ranOnLoadRef.current) { clearTimer(); timerRef.current = window.setTimeout(() => renderer.moneyExplosion(), normalizedRef.current.triggerDelay * 1000); }
      },
      onProgress: () => undefined,
      onError: (message) => { if (!cancelled) { setObsPermissionWait(false); setError(message); emitStatus({ type: "error", message, kind: describeError(message).kind }); } },
      onReady: () => { if (!cancelled) { setObsPermissionWait(false); setReady(true); setError(""); emitStatus({ type: "ready" }); } },
      onMetrics: (nextMetrics) => { if (!cancelled) setMetrics(nextMetrics); },
    });
    rendererRef.current = renderer; void renderer.init(host).catch((failure) => { if (!cancelled) setError(failure?.message || "The money renderer could not start."); });
    return () => { cancelled = true; clearTimer(); rendererRef.current = null; renderer.destroy(); };
  }, [clearTimer, emitStatus, instanceId, previewOnly]);

  useEffect(() => { rendererRef.current?.updateConfig(normalized); }, [normalized]);
  useEffect(() => {
    if (previewOnly || runtime !== "obs" || ready || !normalized.enabled || error) { setObsPermissionWait(false); return undefined; }
    const timer = window.setTimeout(() => setObsPermissionWait(true), 1800);
    return () => window.clearTimeout(timer);
  }, [error, normalized.enabled, previewOnly, ready, runtime]);
  useEffect(() => {
    if (!ready || previewOnly || normalized.triggerMode === "manual") return;
    if (normalized.triggerMode === "on_load" && ranOnLoadRef.current) return;
    clearTimer(); timerRef.current = window.setTimeout(() => { ranOnLoadRef.current = true; rendererRef.current?.moneyExplosion(); }, normalized.triggerDelay * 1000); return clearTimer;
  }, [clearTimer, normalized.triggerDelay, normalized.triggerMode, previewOnly, ready]);

  const errorInfo = describeError(error); const obsNeedsCamera = runtime === "obs" && !previewOnly && normalized.enabled && (obsPermissionWait || (Boolean(error) && errorInfo.kind === "camera")); const showError = (previewOnly && Boolean(error) && errorInfo.kind === "camera") || obsNeedsCamera || (runtime === "obs" && Boolean(error) && errorInfo.kind !== "camera"); const visibleError = error || "Open this Browser Source with Interact, then press Enable camera once.";
  return (
    <div className="money-explosion-widget" data-ready={ready ? "true" : "false"} data-state={state.toLowerCase()} data-runtime={runtime} data-trigger-mode={normalized.triggerMode} data-widget-instance={instanceId} data-banknotes={metrics.banknotes} data-visible-banknotes={state === "HIDDEN" || state === "VISIBLE" ? 0 : metrics.banknotes} data-particles={metrics.particles}>
      <div className="money-explosion-widget__renderer" ref={hostRef} />
      {previewOnly && <div className="money-explosion-widget__status" aria-live="polite"><Banknote size={15} /><span>{ready ? state.replaceAll("_", " ") : "Preparing renderer"}</span></div>}
      {showError && <div className="money-explosion-widget__error" data-error-kind={errorInfo.kind} role="alert"><TriangleAlert size={18} /><span className="money-explosion-widget__error-copy"><strong>{obsNeedsCamera ? "Enable camera in OBS" : errorInfo.title}</strong><span>{visibleError}</span></span><button type="button" onClick={obsNeedsCamera || errorInfo.kind === "camera" ? retryCamera : () => setError("")}>{obsNeedsCamera ? "Enable camera" : errorInfo.action}</button></div>}
    </div>
  );
}
