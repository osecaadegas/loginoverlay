import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Snowflake, TriangleAlert } from "lucide-react";
import { DEFAULT_CONFIG, sanitizeConfig } from "./config";
import { WebcamTransitionRenderer } from "./renderer";
import "./FreezeShatterWidget.css";

const EVENT_NAME = "streamerscenter:freeze-shatter";
const STATUS_EVENT_NAME = "streamerscenter:freeze-shatter-status";
const ACTIONS = new Set([
  "freezeAndShatter",
  "reconstructWebcam",
  "toggleWebcamTransition",
  "resetWebcamTransition",
  "preview",
]);

function describeError(message) {
  const text = String(message || "");
  if (/transparent background|visible silhouette|chroma key/i.test(text)) {
    return { kind: "chroma", title: "Adjust chroma key", action: "Dismiss" };
  }
  if (/camera|permission|selected source|capture requires/i.test(text)) {
    return { kind: "camera", title: "Camera access needed", action: "Try camera again" };
  }
  return { kind: "renderer", title: "Effect needs attention", action: "Dismiss" };
}

function rendererConfig(config, previewOnly) {
  return sanitizeConfig({
    ...DEFAULT_CONFIG,
    ...config,
    mode: "browser",
    source: previewOnly ? "demo" : config?.source || "default",
    sound: previewOnly ? false : config?.sound === true,
  });
}

function installBrowserApi() {
  if (typeof window === "undefined") return;
  const api = window.StreamersCenter || {};
  const dispatch = (action, instanceId) =>
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, { detail: { action, instanceId } }),
    );
  api.freezeAndShatter = (instanceId) => dispatch("freezeAndShatter", instanceId);
  api.reconstructWebcam = (instanceId) => dispatch("reconstructWebcam", instanceId);
  api.toggleWebcamTransition = (instanceId) => dispatch("toggleWebcamTransition", instanceId);
  api.resetWebcamTransition = (instanceId) => dispatch("resetWebcamTransition", instanceId);
  window.StreamersCenter = api;
}

export default function FreezeShatterWidget({
  config = {},
  widgetId,
  previewOnly = false,
  runtime = "editor",
}) {
  const instanceId = String(
    config.__betterInstanceId || widgetId || "freeze-shatter",
  );
  const normalized = useMemo(
    () => rendererConfig(config, previewOnly),
    [config, previewOnly],
  );
  const normalizedRef = useRef(normalized);
  const hostRef = useRef(null);
  const rendererRef = useRef(null);
  const timerRef = useRef(null);
  const previewCycleRef = useRef(false);
  const ranOnLoadRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState("VISIBLE");
  const [error, setError] = useState("");

  normalizedRef.current = normalized;

  const clearTimer = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const emitStatus = useCallback((detail) => {
    window.dispatchEvent(new CustomEvent(STATUS_EVENT_NAME, {
      detail: { ...detail, instanceId },
    }));
  }, [instanceId]);

  const runAction = useCallback(
    (action) => {
      const renderer = rendererRef.current;
      if (!renderer || !ACTIONS.has(action)) return false;
      clearTimer();
      setError("");
      if (action === "preview") {
        previewCycleRef.current = true;
        return renderer.previewTransition();
      }
      previewCycleRef.current = false;
      if (action === "freezeAndShatter") return renderer.freezeAndShatter();
      if (action === "reconstructWebcam") return renderer.reconstructWebcam();
      if (action === "toggleWebcamTransition")
        return renderer.toggleWebcamTransition();
      renderer.resetWebcamTransition();
      return true;
    },
    [clearTimer],
  );

  const retryCamera = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    setError("");
    setReady(false);
    void renderer.setSource(normalizedRef.current.source).catch((failure) => {
      setError(failure?.message || "The selected camera is unavailable.");
    });
  }, []);

  useEffect(() => {
    installBrowserApi();
    const receive = (event) => {
      const detail = event.detail || {};
      if (
        detail.instanceId &&
        String(detail.instanceId) !== instanceId &&
        String(detail.instanceId) !== String(widgetId || "")
      )
        return;
      if (ACTIONS.has(detail.action)) runAction(detail.action);
    };
    window.addEventListener(EVENT_NAME, receive);
    return () => window.removeEventListener(EVENT_NAME, receive);
  }, [instanceId, widgetId, runAction]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let cancelled = false;
    const renderer = new WebcamTransitionRenderer(normalizedRef.current, {
      onState: (nextState) => {
        if (cancelled) return;
        setState(nextState);
        emitStatus({ type: "state", state: nextState });
        if (nextState === "HIDDEN" && previewCycleRef.current) {
          clearTimer();
          timerRef.current = window.setTimeout(() => {
            renderer.reconstructWebcam();
          }, 700);
          return;
        }
        if (
          nextState === "HIDDEN" &&
          !previewOnly &&
          normalizedRef.current.triggerMode === "loop"
        ) {
          clearTimer();
          timerRef.current = window.setTimeout(
            () => renderer.reconstructWebcam(),
            normalizedRef.current.hiddenDuration * 1000,
          );
          return;
        }
        if (
          nextState === "VISIBLE" &&
          !previewOnly &&
          normalizedRef.current.triggerMode === "loop" &&
          ranOnLoadRef.current
        ) {
          clearTimer();
          timerRef.current = window.setTimeout(
            () => renderer.freezeAndShatter(),
            normalizedRef.current.triggerDelay * 1000,
          );
        }
      },
      onProgress: () => undefined,
      onError: (message) => {
        if (!cancelled) {
          setError(message);
          emitStatus({ type: "error", message, kind: describeError(message).kind });
        }
      },
      onReady: () => {
        if (!cancelled) {
          setReady(true);
          setError("");
          emitStatus({ type: "ready" });
        }
      },
      onMetrics: () => undefined,
    });
    rendererRef.current = renderer;
    void renderer.init(host, false, false).catch((failure) => {
      if (!cancelled)
        setError(failure?.message || "The freeze renderer could not start.");
    });
    return () => {
      cancelled = true;
      clearTimer();
      rendererRef.current = null;
      renderer.destroy();
    };
  }, [clearTimer, emitStatus, instanceId, previewOnly]);

  useEffect(() => {
    rendererRef.current?.updateConfig(normalized);
  }, [normalized]);

  useEffect(() => {
    if (!ready || previewOnly || normalized.triggerMode === "manual") return;
    if (normalized.triggerMode === "on_load" && ranOnLoadRef.current) return;
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      ranOnLoadRef.current = true;
      rendererRef.current?.freezeAndShatter();
    }, normalized.triggerDelay * 1000);
    return clearTimer;
  }, [clearTimer, normalized.triggerDelay, normalized.triggerMode, previewOnly, ready]);

  const errorInfo = describeError(error);
  // Setup guidance belongs in the editor. OBS output must remain transparent
  // when its browser profile has not been granted camera access yet.
  const showError = previewOnly && Boolean(error) && errorInfo.kind === "camera";

  return (
    <div
      className="freeze-shatter-widget"
      data-ready={ready ? "true" : "false"}
      data-state={state.toLowerCase()}
      data-runtime={runtime}
      data-trigger-mode={normalized.triggerMode}
      data-widget-instance={instanceId}
    >
      <div className="freeze-shatter-widget__renderer" ref={hostRef} />
      {previewOnly && (
        <div className="freeze-shatter-widget__status" aria-live="polite">
          <Snowflake size={14} />
          <span>{ready ? state.replaceAll("_", " ") : "Preparing renderer"}</span>
        </div>
      )}
      {showError && (
        <div className="freeze-shatter-widget__error" data-error-kind={errorInfo.kind} role="alert">
          <TriangleAlert size={18} />
          <span className="freeze-shatter-widget__error-copy">
            <strong>{errorInfo.title}</strong>
            <span>{error}</span>
          </span>
          <button type="button" onClick={errorInfo.kind === "camera" ? retryCamera : () => setError("")}>
            {errorInfo.action}
          </button>
        </div>
      )}
    </div>
  );
}
