import React, { useMemo, useRef, useState } from "react";
import { Download, Search, Share2, Trash2, X } from "lucide-react";
import {
  listSharedBetterOverlays,
  loadSharedBetterOverlay,
  shareBetterOverlay,
  unshareBetterOverlay,
} from "../../../services/betterOverlayService";
import { BETTER_CANVAS, BETTER_WIDGET_REGISTRY } from "./betterWidgetRegistry";

function widgetLabel(widgetType) {
  return BETTER_WIDGET_REGISTRY[widgetType]?.label || widgetType.replaceAll("_", " ");
}

export default function CommunityOverlayLibrary({
  userId,
  layout,
  onSave,
  onSelect,
  disabled = false,
}) {
  const dialogRef = useRef(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [sharing, setSharing] = useState(false);
  const [showShareForm, setShowShareForm] = useState(false);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      setTemplates(await listSharedBetterOverlays(userId));
    } catch (failure) {
      setError(failure.message || "Community overlays could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  const open = () => {
    setSearch("");
    setError("");
    setShowShareForm(false);
    dialogRef.current?.showModal();
    refresh();
  };

  const submitShare = async (event) => {
    event.preventDefault();
    if (sharing || !name.trim()) return;
    setSharing(true);
    setError("");
    try {
      const saved = await onSave();
      const shared = await shareBetterOverlay(userId, saved.draftLayout, {
        name: name.trim(),
        description: description.trim(),
      });
      setTemplates((current) => [shared, ...current]);
      setShowShareForm(false);
      setName("");
      setDescription("");
    } catch (failure) {
      setError(failure.message || "The overlay could not be shared.");
    } finally {
      setSharing(false);
    }
  };

  const loadTemplate = async (template) => {
    if (busyId) return;
    setBusyId(template.id);
    setError("");
    try {
      await onSave();
      const created = await loadSharedBetterOverlay(userId, template.id);
      dialogRef.current?.close();
      onSelect(created.id);
    } catch (failure) {
      setError(failure.message || "The overlay could not be loaded.");
    } finally {
      setBusyId("");
    }
  };

  const removeTemplate = async (template) => {
    if (
      busyId ||
      !window.confirm(`Remove “${template.name}” from the community library?`)
    )
      return;
    setBusyId(template.id);
    setError("");
    try {
      await unshareBetterOverlay(userId, template.id);
      setTemplates((current) => current.filter((item) => item.id !== template.id));
    } catch (failure) {
      setError(failure.message || "The shared overlay could not be removed.");
    } finally {
      setBusyId("");
    }
  };

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter((template) =>
      [template.name, template.description, ...template.widgetTypes]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [search, templates]);

  return (
    <>
      <button
        type="button"
        aria-label="Community overlays"
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={open}
      >
        <Share2 size={15} />
        <span>Community</span>
      </button>
      <dialog
        ref={dialogRef}
        className="editor-dialog community-overlay-dialog"
        aria-labelledby="community-overlay-title"
        onClose={() => {
          setShowShareForm(false);
          setError("");
        }}
      >
        <header>
          <div>
            <h2 id="community-overlay-title">Community overlays</h2>
            <p>Load a shared design as a new build without changing the original.</p>
          </div>
          <button
            type="button"
            aria-label="Close community overlays"
            title="Close"
            disabled={Boolean(busyId) || sharing}
            onClick={() => dialogRef.current?.close()}
          >
            <X size={18} />
          </button>
        </header>

        <div className="community-overlay-actions">
          <label className="editor-search">
            <Search size={16} />
            <input
              type="search"
              aria-label="Search community overlays"
              placeholder="Search overlays or widgets"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="is-primary"
            disabled={Boolean(busyId) || sharing}
            onClick={() => {
              setName(layout.name || "My Overlay");
              setDescription("");
              setShowShareForm((current) => !current);
              setError("");
            }}
          >
            <Share2 size={15} />
            Share this overlay
          </button>
        </div>

        {showShareForm && (
          <form className="community-overlay-share-form" onSubmit={submitShare}>
            <label>
              Template name
              <input
                autoFocus
                required
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={sharing}
              />
            </label>
            <label>
              Description <span>optional</span>
              <textarea
                maxLength={500}
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={sharing}
                placeholder="What makes this layout useful?"
              />
            </label>
            <p>
              Connections, live data, account details, tokens and external media are
              never included.
            </p>
            <div>
              <button
                type="button"
                disabled={sharing}
                onClick={() => setShowShareForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="is-primary" disabled={sharing || !name.trim()}>
                {sharing ? "Sharing..." : "Share with community"}
              </button>
            </div>
          </form>
        )}

        {loading && <p role="status">Loading community overlays...</p>}
        {!loading && (
          <div className="community-overlay-list">
            {rows.map((template) => (
              <article key={template.id}>
                <span className="editor-build-thumbnail" aria-hidden="true">
                  {template.preview.length ? (
                    template.preview.map((box, index) => (
                      <i
                        key={index}
                        style={{
                          left: `${(box.x / BETTER_CANVAS.width) * 100}%`,
                          top: `${(box.y / BETTER_CANVAS.height) * 100}%`,
                          width: `${(box.width / BETTER_CANVAS.width) * 100}%`,
                          height: `${(box.height / BETTER_CANVAS.height) * 100}%`,
                        }}
                      />
                    ))
                  ) : (
                    <Share2 size={24} />
                  )}
                </span>
                <div className="community-overlay-copy">
                  <div>
                    <strong>{template.name}</strong>
                    {template.isMine && <small>Shared by you</small>}
                  </div>
                  {template.description && <p>{template.description}</p>}
                  <ul aria-label="Included widgets">
                    {template.widgetTypes.slice(0, 6).map((widgetType) => (
                      <li key={widgetType}>{widgetLabel(widgetType)}</li>
                    ))}
                    {template.widgetTypes.length > 6 && (
                      <li>+{template.widgetTypes.length - 6}</li>
                    )}
                  </ul>
                </div>
                <div className="community-overlay-card-actions">
                  <button
                    type="button"
                    className="is-primary"
                    disabled={Boolean(busyId) || sharing}
                    onClick={() => loadTemplate(template)}
                  >
                    <Download size={15} />
                    {busyId === template.id ? "Loading..." : "Load as new build"}
                  </button>
                  {template.isMine && (
                    <button
                      type="button"
                      className="is-danger"
                      aria-label={`Remove ${template.name} from community`}
                      disabled={Boolean(busyId) || sharing}
                      onClick={() => removeTemplate(template)}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </article>
            ))}
            {!rows.length && <p>No community overlays match your search.</p>}
          </div>
        )}
        {error && (
          <p className="community-overlay-error" role="alert">
            {error}
            <button type="button" onClick={refresh}>Retry</button>
          </p>
        )}
      </dialog>
    </>
  );
}
