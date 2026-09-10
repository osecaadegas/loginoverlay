import React, { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Copy,
  Folder,
  FolderPlus,
  Pencil,
  Search,
  X,
} from "lucide-react";
import {
  createBetterEditorOverlay,
  listBetterEditorOverlays,
} from "../../../services/betterOverlayService";
import { BETTER_CANVAS } from "./betterWidgetRegistry";

export default function OverlayBuildFolders({
  userId,
  record,
  layout,
  onSave,
  onSelect,
  onRename,
  disabled = false,
}) {
  const [builds, setBuilds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("create");
  const [name, setName] = useState("");
  const pickerRef = useRef(null);
  const dialogRef = useRef(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await listBetterEditorOverlays(userId);
      if (mounted.current) setBuilds(rows);
    } catch (failure) {
      if (mounted.current) setError(failure.message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  };
  const openPicker = () => {
    setSearch("");
    pickerRef.current.showModal();
    refresh();
  };
  const openDialog = (action) => {
    setMode(action);
    setName(
      action === "rename"
        ? layout.name
        : action === "duplicate"
          ? `${layout.name} Copy`.slice(0, 80)
          : "",
    );
    setError("");
    pickerRef.current.close();
    dialogRef.current.showModal();
  };
  const switchBuild = async (id) => {
    if (busy || disabled) return;
    if (id === record.id) {
      pickerRef.current.close();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave();
      onSelect(id);
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "rename") {
        onRename(name.trim());
        await onSave();
      } else {
        const saved = await onSave();
        const created = await createBetterEditorOverlay(
          userId,
          name,
          mode === "duplicate" ? saved.draftLayout : null,
        );
        onSelect(created.id);
      }
      dialogRef.current?.close();
    } catch (failure) {
      setError(failure.message);
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const rows = (
    builds.length ? builds : [{ id: record.id, name: layout.name }]
  ).filter((build) =>
    (build.id === record.id ? layout.name : build.name)
      .toLowerCase()
      .includes(search.toLowerCase().trim()),
  );
  return (
    <div className="editor-build-switcher" aria-label="Overlay builds">
      <button
        type="button"
        className="editor-build-trigger"
        title={layout.name}
        aria-label="Choose overlay build"
        disabled={busy || disabled}
        onClick={openPicker}
      >
        <Folder size={18} />
        <span>{layout.name}</span>
        <ChevronDown size={14} />
      </button>
      <dialog
        ref={pickerRef}
        aria-label="Overlay builds"
        className="editor-dialog editor-build-picker"
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <header>
          <h2>Overlay builds</h2>
          <button
            type="button"
            aria-label="Close build picker"
            title="Close"
            disabled={busy}
            onClick={() => pickerRef.current.close()}
          >
            <X size={18} />
          </button>
        </header>
        <label className="editor-search">
          <Search size={16} />
          <input
            type="search"
            autoFocus
            aria-label="Search builds"
            placeholder="Search builds"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="editor-build-actions">
          <button
            type="button"
            aria-label="New overlay build"
            disabled={busy}
            onClick={() => openDialog("create")}
          >
            <FolderPlus size={16} />
            New build
          </button>
          <button
            type="button"
            aria-label="Duplicate overlay build"
            disabled={busy}
            onClick={() => openDialog("duplicate")}
          >
            <Copy size={16} />
            Duplicate
          </button>
          <button
            type="button"
            aria-label="Rename overlay build"
            disabled={busy}
            onClick={() => openDialog("rename")}
          >
            <Pencil size={16} />
            Rename
          </button>
        </div>
        {loading && <p role="status">Loading builds...</p>}
        <div className="better-editor-builds__list">
          {rows.map((build) => {
            const selected = build.id === record.id;
            const label = selected ? layout.name : build.name;
            const preview = selected ? layout.preview : build.preview;
            const published = selected
              ? record.publishedVersion > 0 && !record.hasUnpublishedChanges
              : build.published;
            return (
              <button
                key={build.id}
                type="button"
                title={label}
                aria-current={selected ? "true" : undefined}
                disabled={busy}
                onClick={() => switchBuild(build.id)}
              >
                <span className="editor-build-thumbnail" aria-hidden="true">
                  {preview?.length ? (
                    preview.map((box, index) => (
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
                    <Folder size={24} />
                  )}
                </span>
                <span className="editor-build-copy">
                  <strong>{label}</strong>
                  <small>
                    {published ? "Published" : "Draft"}
                    {build.updatedAt &&
                      ` / ${new Date(build.updatedAt).toLocaleDateString()}`}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
        {!loading && !rows.length && <p>No matching builds</p>}
        {error && (
          <p role="alert">
            {error}
            <button type="button" onClick={refresh}>
              Retry
            </button>
          </p>
        )}
      </dialog>
      <dialog
        ref={dialogRef}
        aria-label="Build name"
        className="editor-dialog better-editor-name-dialog"
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <form onSubmit={submit}>
          <header>
            <h2>
              {mode === "rename"
                ? "Rename build"
                : mode === "duplicate"
                  ? "Duplicate build"
                  : "New build"}
            </h2>
            <button
              type="button"
              aria-label="Close"
              disabled={busy}
              onClick={() => dialogRef.current.close()}
            >
              <X size={18} />
            </button>
          </header>
          <label>
            Build name
            <input
              autoFocus
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={busy}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <footer>
            <button
              type="button"
              disabled={busy}
              onClick={() => dialogRef.current.close()}
            >
              Cancel
            </button>
            <button type="submit" disabled={busy || !name.trim()}>
              {busy ? "Saving..." : mode === "rename" ? "Save" : "Create"}
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
