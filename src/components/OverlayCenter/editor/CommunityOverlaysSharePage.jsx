import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Box,
  Download,
  Eye,
  LayoutGrid,
  Search,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import {
  getOrCreateBetterEditorOverlay,
  listSharedBetterOverlayPreviews,
  loadSharedBetterOverlay,
  selectBetterEditorOverlay,
  shareBetterOverlay,
  unshareBetterOverlay,
} from "../../../services/betterOverlayService";
import { ThemeEffectsLayer } from "../../../effects/ThemeEffects";
import LoadingSpinner from "../../LoadingSpinner/LoadingSpinner";
import {
  BETTER_CANVAS,
  BETTER_WIDGET_REGISTRY,
  normalizeBetterLayout,
  renderBetterWidgetInstance,
} from "./betterWidgetRegistry";
import "../OverlayRenderer.css";
import "./BetterWidgetPackages.css";
import "./WidgetEditorPage.css";
import "./CommunityOverlaysSharePage.css";

function widgetLabel(widgetType) {
  return BETTER_WIDGET_REGISTRY[widgetType]?.label || String(widgetType).replaceAll("_", " ");
}

function templateThemes(layout) {
  const themes = new Set();
  layout?.instances?.forEach((instance) => {
    const config = instance.config || {};
    const value =
      config.colourTheme || config.theme || config.betTheme || config.colour || "default";
    themes.add(String(value).replace(/^theme_/, ""));
  });
  return [...themes];
}

class CommunityPreviewBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previous) {
    if (previous.instanceId !== this.props.instanceId && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function CommunityOverlayPreview({ layout, userId, compact = false, label }) {
  const frameRef = useRef(null);
  const [scale, setScale] = useState(0.1);
  const [visible, setVisible] = useState(!compact);
  const normalized = useMemo(() => normalizeBetterLayout(layout), [layout]);

  useEffect(() => {
    if (!compact || !frameRef.current || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { rootMargin: "180px" },
    );
    observer.observe(frameRef.current);
    return () => observer.disconnect();
  }, [compact]);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    const resize = () => {
      const bounds = frame.getBoundingClientRect();
      setScale(
        Math.max(
          0.01,
          Math.min(bounds.width / BETTER_CANVAS.width, bounds.height / BETTER_CANVAS.height),
        ),
      );
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      className={`community-preview-frame${compact ? " is-compact" : ""}`}
      role="img"
      aria-label={label}
    >
      {visible && (
        <div
          className="better-editor-canvas community-preview-canvas"
          data-grid="false"
          data-preview="true"
          style={{
            width: BETTER_CANVAS.width,
            height: BETTER_CANVAS.height,
            transform: `scale(${scale})`,
          }}
        >
          <ThemeEffectsLayer
            userId={userId}
            instances={normalized.instances}
            width={BETTER_CANVAS.width}
            height={BETTER_CANVAS.height}
            runtime="community-preview"
          />
          {normalized.instances
            .filter((instance) => instance.visible !== false)
            .slice()
            .sort((a, b) => Number(a.zIndex) - Number(b.zIndex))
            .map((instance) => (
              <div
                key={instance.instanceId}
                className={`better-editor-canvas-instance${instance.widgetType === "background" ? " is-background" : ""}`}
                data-effect-target-id={instance.instanceId}
                data-effect-widget-type={instance.widgetType}
                style={{
                  left: instance.x,
                  top: instance.y,
                  width: instance.width,
                  height: instance.height,
                  opacity: instance.opacity,
                  zIndex: instance.zIndex,
                }}
              >
                <div className="better-editor-canvas-instance__content">
                  <CommunityPreviewBoundary instanceId={instance.instanceId}>
                    {renderBetterWidgetInstance({
                      instance,
                      layout: normalized,
                      mode: "mock",
                      runtime: "community-preview",
                      userId,
                      accessVerified: true,
                    })}
                  </CommunityPreviewBoundary>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default function CommunityOverlaysSharePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [currentOverlay, setCurrentOverlay] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const refresh = useCallback(async ({ preserveSelection = true } = {}) => {
    if (!user?.id) return;
    setLoading(true);
    setError("");
    try {
      const [library, editorOverlay] = await Promise.all([
        listSharedBetterOverlayPreviews(user.id),
        getOrCreateBetterEditorOverlay(user.id),
      ]);
      setTemplates(library);
      setCurrentOverlay(editorOverlay);
      setSelectedId((current) => {
        if (preserveSelection && library.some((template) => template.id === current)) {
          return current;
        }
        return library[0]?.id || "";
      });
    } catch (failure) {
      setError(failure.message || "Community overlays could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh({ preserveSelection: false });
  }, [refresh]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter((template) =>
      [template.name, template.description, ...template.widgetTypes]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [search, templates]);

  useEffect(() => {
    if (!filtered.length) setSelectedId("");
    else if (!filtered.some((template) => template.id === selectedId)) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = templates.find((template) => template.id === selectedId) || null;
  const selectedThemes = useMemo(
    () => (selected?.layout ? templateThemes(selected.layout) : []),
    [selected],
  );

  const submitShare = async (event) => {
    event.preventDefault();
    if (!currentOverlay?.draftLayout || !name.trim() || busy) return;
    setBusy("share");
    setError("");
    try {
      const shared = await shareBetterOverlay(user.id, currentOverlay.draftLayout, {
        name: name.trim(),
        description: description.trim(),
      });
      await refresh({ preserveSelection: false });
      setSelectedId(shared.id);
      setShareOpen(false);
      setName("");
      setDescription("");
    } catch (failure) {
      setError(failure.message || "The overlay could not be shared.");
    } finally {
      setBusy("");
    }
  };

  const loadSelected = async () => {
    if (!selected || busy) return;
    setBusy(`load:${selected.id}`);
    setError("");
    try {
      const created = await loadSharedBetterOverlay(user.id, selected.id);
      selectBetterEditorOverlay(user.id, created.id);
      navigate("/editor");
    } catch (failure) {
      setError(failure.message || "The overlay could not be loaded.");
      setBusy("");
    }
  };

  const removeSelected = async () => {
    if (
      !selected?.isMine ||
      busy ||
      !window.confirm(`Remove “${selected.name}” from the community library?`)
    ) return;
    setBusy(`remove:${selected.id}`);
    setError("");
    try {
      await unshareBetterOverlay(user.id, selected.id);
      setTemplates((current) => current.filter((template) => template.id !== selected.id));
      setSelectedId((current) => (current === selected.id ? "" : current));
    } catch (failure) {
      setError(failure.message || "The shared overlay could not be removed.");
    } finally {
      setBusy("");
    }
  };

  return (
    <main className="community-share-page">
      <section className="community-share-hero">
        <div className="community-share-hero__copy">
          <button type="button" className="community-back" onClick={() => navigate("/editor")}>
            <ArrowLeft size={16} /> Back to editor
          </button>
          <span className="community-eyebrow"><Sparkles size={14} /> Community layouts</span>
          <h1>Build together. Make it yours.</h1>
          <p>
            Inspect complete Streamers Center overlays, preview every widget with safe
            sample data, and load a design as your own editable build.
          </p>
        </div>
        <div className="community-share-hero__actions">
          <div>
            <small>Your current build</small>
            <strong>{currentOverlay?.draftLayout?.name || "Loading..."}</strong>
          </div>
          <button
            type="button"
            className="community-primary-button"
            disabled={!currentOverlay || Boolean(busy)}
            onClick={() => {
              setName(currentOverlay?.draftLayout?.name || "My Overlay");
              setDescription("");
              setShareOpen((open) => !open);
            }}
          >
            <Share2 size={17} /> Share current build
          </button>
        </div>
      </section>

      {shareOpen && (
        <form className="community-share-form" onSubmit={submitShare}>
          <div>
            <span className="community-eyebrow">Publish to the library</span>
            <h2>Share a clean copy of your design</h2>
            <p>
              Connections, live data, account details, tokens and external media are
              removed. Fonts, edges, theme colours, widget styles and positioning remain.
            </p>
          </div>
          <label>
            Overlay name
            <input
              autoFocus
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Description <span>optional</span>
            <textarea
              rows={3}
              maxLength={500}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Tell other streamers what this layout is designed for."
            />
          </label>
          <div className="community-share-form__actions">
            <button type="button" onClick={() => setShareOpen(false)} disabled={Boolean(busy)}>
              Cancel
            </button>
            <button type="submit" className="community-primary-button" disabled={Boolean(busy) || !name.trim()}>
              <Share2 size={16} /> {busy === "share" ? "Sharing..." : "Share overlay"}
            </button>
          </div>
        </form>
      )}

      <section className="community-library-toolbar" aria-label="Community library tools">
        <div>
          <LayoutGrid size={18} />
          <span><strong>{templates.length}</strong> compatible overlays</span>
        </div>
        <label>
          <Search size={17} />
          <input
            type="search"
            aria-label="Search community overlays"
            placeholder="Search layouts or widgets"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </section>

      {error && (
        <div className="community-page-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => refresh()}>Retry</button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Loading community overlays..." />
      ) : templates.length ? (
        <section className="community-library-layout">
          <aside className="community-template-list" aria-label="Shared overlays">
            {filtered.map((template) => (
              <button
                type="button"
                key={template.id}
                className={template.id === selectedId ? "is-selected" : ""}
                aria-pressed={template.id === selectedId}
                onClick={() => setSelectedId(template.id)}
              >
                <CommunityOverlayPreview
                  compact
                  layout={template.layout}
                  userId={user.id}
                  label={`${template.name} exact preview`}
                />
                <span className="community-template-card__copy">
                  <span>
                    <strong>{template.name}</strong>
                    {template.isMine && <small>Yours</small>}
                  </span>
                  <em>{template.description || "A community Streamers Center layout."}</em>
                  <span className="community-template-card__meta">
                    <Box size={12} /> {template.widgetTypes.length} widgets
                  </span>
                </span>
              </button>
            ))}
            {!filtered.length && <p>No overlays match “{search}”.</p>}
          </aside>

          {selected && (
            <article className="community-template-inspector">
              <header>
                <div>
                  <span className="community-eyebrow"><Eye size={14} /> Exact layout preview</span>
                  <h2>{selected.name}</h2>
                  <p>{selected.description || "A community Streamers Center layout."}</p>
                </div>
                {selected.isMine && <span className="community-owner-badge">Shared by you</span>}
              </header>

              <CommunityOverlayPreview
                layout={selected.layout}
                userId={user.id}
                label={`${selected.name} complete overlay preview`}
              />

              <div className="community-template-inspector__details">
                <section>
                  <h3>Overlay details</h3>
                  <dl>
                    <div><dt>Canvas</dt><dd>{BETTER_CANVAS.width} × {BETTER_CANVAS.height}</dd></div>
                    <div><dt>Widgets</dt><dd>{selected.layout.instances.filter((item) => item.widgetType !== "background").length}</dd></div>
                    <div><dt>Visible</dt><dd>{selected.layout.instances.filter((item) => item.visible !== false && item.widgetType !== "background").length}</dd></div>
                    <div><dt>Theme styles</dt><dd>{selectedThemes.join(", ") || "Default"}</dd></div>
                  </dl>
                </section>
                <section>
                  <h3>Included widgets</h3>
                  <ul>
                    {selected.layout.instances
                      .filter((instance) => instance.widgetType !== "background")
                      .map((instance) => (
                        <li key={instance.instanceId}>
                          <span>{widgetLabel(instance.widgetType)}</span>
                          <small>{Math.round(instance.width)} × {Math.round(instance.height)}</small>
                        </li>
                      ))}
                  </ul>
                </section>
              </div>

              <footer>
                <p>A new editable copy will be added to your builds. The shared original stays unchanged.</p>
                <div>
                  {selected.isMine && (
                    <button
                      type="button"
                      className="community-danger-button"
                      onClick={removeSelected}
                      disabled={Boolean(busy)}
                    >
                      <Trash2 size={16} /> Remove share
                    </button>
                  )}
                  <button
                    type="button"
                    className="community-primary-button"
                    onClick={loadSelected}
                    disabled={Boolean(busy)}
                  >
                    <Download size={17} />
                    {busy === `load:${selected.id}` ? "Loading..." : "Load into my editor"}
                  </button>
                </div>
              </footer>
            </article>
          )}
        </section>
      ) : (
        <section className="community-empty-state">
          <Share2 size={32} />
          <h2>Be the first to share an overlay</h2>
          <p>Your current build can become the first design in the community library.</p>
          <button type="button" className="community-primary-button" onClick={() => setShareOpen(true)}>
            Share current build
          </button>
        </section>
      )}
    </main>
  );
}
