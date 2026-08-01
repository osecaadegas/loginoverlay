import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getPublishedBetterLiveSource,
  getPublishedBetterOverlay,
  subscribeToBetterLiveSource,
  subscribeToPublishedBetterOverlay,
  unsubscribeBetterLiveSource,
  unsubscribeBetterOverlay,
} from "../../../services/betterOverlayService";
import {
  BETTER_CANVAS,
  normalizeBetterLayout,
  renderBetterWidgetInstance,
} from "./betterWidgetRegistry";
import "./BetterObsOverlay.css";

const FALLBACK_REFRESH_MS = 30000;

class BetterObsWidgetBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.instanceId !== this.props.instanceId && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}

function useViewportSize() {
  const [size, setSize] = useState(() => ({
    width:
      typeof window !== "undefined" ? window.innerWidth : BETTER_CANVAS.width,
    height:
      typeof window !== "undefined" ? window.innerHeight : BETTER_CANVAS.height,
  }));

  useEffect(() => {
    const update = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return size;
}

export default function BetterObsOverlay() {
  const { publicOverlayId, instanceId } = useParams();
  const [publication, setPublication] = useState(null);
  const [liveSource, setLiveSource] = useState(() => ({
    overlayId: null,
    widgets: [],
    theme: null,
  }));
  const [loaded, setLoaded] = useState(false);
  const viewport = useViewportSize();

  const loadPublication = useCallback(async () => {
    const nextPublication = await getPublishedBetterOverlay(publicOverlayId);
    setPublication(nextPublication);
    setLoaded(true);
  }, [publicOverlayId]);

  useEffect(() => {
    document.documentElement.classList.add("better-obs-document");
    document.body.classList.add("better-obs-document");
    return () => {
      document.documentElement.classList.remove("better-obs-document");
      document.body.classList.remove("better-obs-document");
    };
  }, []);

  useEffect(() => {
    if (!publication?.ownerUserId) {
      setLiveSource({ overlayId: null, widgets: [], theme: null });
      return undefined;
    }

    let alive = true;
    let channel = null;

    const refreshLiveSource = async () => {
      const source = await getPublishedBetterLiveSource(
        publication.ownerUserId,
      );
      if (!alive) return null;
      setLiveSource(source);
      return source;
    };

    refreshLiveSource()
      .then((source) => {
        if (!alive || !source?.overlayId) return;
        channel = subscribeToBetterLiveSource(
          publication.ownerUserId,
          source.overlayId,
          {
            onWidgets: () =>
              refreshLiveSource().catch((liveError) => {
                console.error(
                  "[BetterObsOverlay] Failed to refresh live widget data:",
                  liveError,
                );
              }),
            onTheme: (theme) => {
              setLiveSource((current) => ({ ...current, theme }));
            },
          },
        );
      })
      .catch((liveError) => {
        console.error(
          "[BetterObsOverlay] Failed to load live widget data:",
          liveError,
        );
      });

    const fallbackInterval = window.setInterval(() => {
      refreshLiveSource().catch((liveError) => {
        console.error(
          "[BetterObsOverlay] Failed to refresh live widget data:",
          liveError,
        );
      });
    }, FALLBACK_REFRESH_MS);

    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") {
        refreshLiveSource().catch((liveError) => {
          console.error(
            "[BetterObsOverlay] Failed to refresh live widget data:",
            liveError,
          );
        });
      }
    };
    const refreshOnline = () => refreshLiveSource().catch(() => {});

    document.addEventListener("visibilitychange", refreshOnVisible);
    window.addEventListener("online", refreshOnline);

    return () => {
      alive = false;
      unsubscribeBetterLiveSource(channel);
      window.clearInterval(fallbackInterval);
      document.removeEventListener("visibilitychange", refreshOnVisible);
      window.removeEventListener("online", refreshOnline);
    };
  }, [publication?.ownerUserId]);

  useEffect(() => {
    let alive = true;
    loadPublication().catch(() => {
      if (alive) setLoaded(true);
    });

    const channel = subscribeToPublishedBetterOverlay(
      publicOverlayId,
      (nextPublication) => {
        if (nextPublication) {
          setPublication(nextPublication);
          setLoaded(true);
        } else {
          loadPublication().catch(() => setPublication(null));
        }
      },
    );

    const fallbackInterval = window.setInterval(() => {
      loadPublication().catch(() => {});
    }, FALLBACK_REFRESH_MS);

    const refreshOnVisible = () => {
      if (document.visibilityState === "visible")
        loadPublication().catch(() => {});
    };
    const refreshOnline = () => loadPublication().catch(() => {});

    document.addEventListener("visibilitychange", refreshOnVisible);
    window.addEventListener("online", refreshOnline);

    return () => {
      alive = false;
      unsubscribeBetterOverlay(channel);
      window.clearInterval(fallbackInterval);
      document.removeEventListener("visibilitychange", refreshOnVisible);
      window.removeEventListener("online", refreshOnline);
    };
  }, [loadPublication, publicOverlayId]);

  const layout = useMemo(
    () =>
      publication?.publishedLayout
        ? normalizeBetterLayout(publication.publishedLayout)
        : null,
    [publication?.publishedLayout],
  );

  const targetInstance = useMemo(
    () =>
      layout?.instances.find(
        (instance) => instance.instanceId === instanceId,
      ) || null,
    [instanceId, layout?.instances],
  );

  const isSingleWidget = Boolean(instanceId);
  const targetWidth = isSingleWidget
    ? Number(targetInstance?.width || 0)
    : BETTER_CANVAS.width;
  const targetHeight = isSingleWidget
    ? Number(targetInstance?.height || 0)
    : BETTER_CANVAS.height;
  const scale =
    isSingleWidget || !targetWidth || !targetHeight
      ? 1
      : Math.min(viewport.width / targetWidth, viewport.height / targetHeight);

  if (!loaded || !layout || (isSingleWidget && !targetInstance)) {
    return <main className="better-obs-overlay better-obs-overlay--empty" />;
  }

  if (isSingleWidget) {
    return (
      <main className="better-obs-overlay">
        <div
          className="better-obs-canvas better-obs-canvas--single"
          style={{
            width: targetWidth,
            height: targetHeight,
            transform: `scale(${scale})`,
          }}
        >
          {targetInstance.visible !== false && (
            <div
              className="better-obs-instance"
              style={{
                left: 0,
                top: 0,
                width: targetInstance.width,
                height: targetInstance.height,
                opacity: targetInstance.opacity,
                zIndex: 1,
              }}
            >
              <BetterObsWidgetBoundary instanceId={targetInstance.instanceId}>
                {renderBetterWidgetInstance({
                  instance: targetInstance,
                  layout,
                  mode: "live",
                  runtime: "obs",
                  userId: publication.ownerUserId,
                  theme: liveSource.theme,
                  liveWidgets: liveSource.widgets,
                  publicOverlayId,
                })}
              </BetterObsWidgetBoundary>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="better-obs-overlay">
      <div
        className="better-obs-canvas"
        style={{
          width: BETTER_CANVAS.width,
          height: BETTER_CANVAS.height,
          transform: `scale(${scale})`,
        }}
      >
        {layout.instances
          .filter((instance) => instance.visible !== false)
          .sort((a, b) => Number(a.zIndex) - Number(b.zIndex))
          .map((instance) => (
            <div
              key={instance.instanceId}
              className="better-obs-instance"
              style={{
                left: instance.x,
                top: instance.y,
                width: instance.width,
                height: instance.height,
                opacity: instance.opacity,
                zIndex: instance.zIndex,
              }}
            >
              <BetterObsWidgetBoundary instanceId={instance.instanceId}>
                {renderBetterWidgetInstance({
                  instance,
                  layout,
                  mode: "live",
                  runtime: "obs",
                  userId: publication.ownerUserId,
                  theme: liveSource.theme,
                  liveWidgets: liveSource.widgets,
                  publicOverlayId,
                })}
              </BetterObsWidgetBoundary>
            </div>
          ))}
      </div>
    </main>
  );
}
