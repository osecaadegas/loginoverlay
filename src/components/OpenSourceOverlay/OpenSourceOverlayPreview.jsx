import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getBetterEditorLiveSource,
  subscribeToBetterLiveSource,
  unsubscribeBetterLiveSource,
} from "../../services/betterOverlayService";
import {
  BETTER_CANVAS,
  normalizeBetterLayout,
  renderBetterWidgetInstance,
} from "../OverlayCenter/editor/betterWidgetRegistry";
import { ThemeEffectsLayer } from "../../effects/ThemeEffects";
import { getObsRenderGeometry } from "../OverlayCenter/editor/obsRenderGeometry";
import { getOrCreateOpenSourceOverlay } from "./openSourceOverlayBuild";
import "../OverlayCenter/OverlayRenderer.css";
import "../OverlayCenter/editor/BetterObsOverlay.css";

class OpenSourceWidgetBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("[OpenSourceOverlayPreview] Widget failed to render", {
      instanceId: this.props.instanceId,
      error,
      componentStack: info?.componentStack,
    });
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function useViewport() {
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    const resize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  return viewport;
}

export default function OpenSourceOverlayPreview() {
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [liveSource, setLiveSource] = useState({ overlayId: null, widgets: [], theme: null });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const viewport = useViewport();

  const load = useCallback(async () => {
    if (!user?.id) return;
    setBusy(true);
    setError("");
    try {
      const [nextRecord, nextLiveSource] = await Promise.all([
        getOrCreateOpenSourceOverlay(user),
        getBetterEditorLiveSource(user.id),
      ]);
      setRecord(nextRecord);
      setLiveSource(nextLiveSource);
    } catch (loadError) {
      setError(loadError?.message || "Could not load the open source overlay preview.");
    } finally {
      setBusy(false);
    }
  }, [user?.id]);

  useEffect(() => {
    document.documentElement.classList.add("better-obs-document");
    document.body.classList.add("better-obs-document");
    return () => {
      document.documentElement.classList.remove("better-obs-document");
      document.body.classList.remove("better-obs-document");
    };
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user?.id || !liveSource.overlayId) return undefined;
    const channel = subscribeToBetterLiveSource(user.id, liveSource.overlayId, {
      onWidgets: () => getBetterEditorLiveSource(user.id).then(setLiveSource).catch((refreshError) => console.error("[OpenSourceOverlayPreview] Live widget refresh failed", refreshError)),
      onTheme: (theme) => setLiveSource((current) => ({ ...current, theme })),
    });
    return () => unsubscribeBetterLiveSource(channel);
  }, [user?.id, liveSource.overlayId]);

  const layout = useMemo(() => record?.draftLayout ? normalizeBetterLayout(record.draftLayout) : null, [record?.draftLayout]);
  const geometry = getObsRenderGeometry({
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    targetWidth: BETTER_CANVAS.width,
    targetHeight: BETTER_CANVAS.height,
    scaleMode: "fit",
  });

  if (busy && !layout) return <main className="better-obs-overlay better-obs-overlay--empty" aria-label="Loading overlay preview" />;
  if (error || !layout) {
    return (
      <main className="opensource-preview-error" role="alert">
        <p>{error || "The source overlay is not available."}</p>
        <button type="button" onClick={load}><RefreshCw size={16} /> Retry</button>
        <Link to="/opensource"><ArrowLeft size={16} /> Overlay controls</Link>
      </main>
    );
  }

  return (
    <main className="better-obs-overlay better-obs-overlay--full opensource-preview" data-source="draft">
      <div className="better-obs-frame" style={{ width: geometry.displayWidth, height: geometry.displayHeight }}>
        <div className="better-obs-canvas" style={{ width: BETTER_CANVAS.width, height: BETTER_CANVAS.height, transform: geometry.transform }}>
          <ThemeEffectsLayer userId={user.id} instances={layout.instances} width={BETTER_CANVAS.width} height={BETTER_CANVAS.height} runtime="obs-full" />
          {layout.instances
            .filter((instance) => instance.visible !== false)
            .sort((a, b) => Number(a.zIndex) - Number(b.zIndex))
            .map((instance) => (
              <div key={instance.instanceId} className="better-obs-instance" data-effect-target-id={instance.instanceId} data-effect-widget-type={instance.widgetType} style={{ left: instance.x, top: instance.y, width: instance.width, height: instance.height, opacity: instance.opacity, zIndex: instance.zIndex }}>
                <OpenSourceWidgetBoundary instanceId={instance.instanceId}>
                  {renderBetterWidgetInstance({
                    instance,
                    layout,
                    mode: "live",
                    runtime: "obs",
                    renderScale: geometry.renderScale,
                    userId: user.id,
                    theme: liveSource.theme,
                    liveWidgets: liveSource.widgets,
                    publicOverlayId: record.publicOverlayId,
                  })}
                </OpenSourceWidgetBoundary>
              </div>
            ))}
        </div>
      </div>
    </main>
  );
}
