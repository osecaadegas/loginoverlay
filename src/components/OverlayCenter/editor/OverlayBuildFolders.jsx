import React, { useEffect, useRef, useState } from "react";
import { Copy, Folder, FolderOpen, FolderPlus, Pencil, X } from "lucide-react";
import { createBetterEditorOverlay, listBetterEditorOverlays } from "../../../services/betterOverlayService";

export default function OverlayBuildFolders({ userId, record, layout, onSave, onSelect, onRename }) {
  const [builds, setBuilds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("create");
  const [name, setName] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    listBetterEditorOverlays(userId).then((rows) => {
      if (!cancelled) setBuilds(rows);
    }).catch((failure) => { if (!cancelled) setError(failure.message); });
    return () => { cancelled = true; };
  }, [userId]);

  const openDialog = (action) => {
    setMode(action);
    setName(action === "rename" ? layout.name : action === "duplicate" ? `${layout.name} Copy`.slice(0, 80) : "");
    setError("");
    dialogRef.current.showModal();
  };
  const switchBuild = async (id) => {
    if (busy || id === record.id) return;
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
        const created = await createBetterEditorOverlay(userId, name, mode === "duplicate" ? saved.draftLayout : null);
        onSelect(created.id);
      }
      dialogRef.current?.close();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };
  const rows = builds.length ? builds : [{ id: record.id, name: layout.name }];
  return (
    <section className="better-editor-builds" aria-label="Overlay builds" aria-busy={busy}>
      <div className="better-editor-builds__heading">
        <span>Builds</span>
        <div>
          <button type="button" title="New overlay build" aria-label="New overlay build" disabled={busy} onClick={() => openDialog("create")}><FolderPlus size={15} /></button>
          <button type="button" title="Duplicate overlay build" aria-label="Duplicate overlay build" disabled={busy} onClick={() => openDialog("duplicate")}><Copy size={15} /></button>
          <button type="button" title="Rename overlay build" aria-label="Rename overlay build" disabled={busy} onClick={() => openDialog("rename")}><Pencil size={15} /></button>
        </div>
      </div>
      <div className="better-editor-builds__list">
        {rows.map((build) => {
          const selected = build.id === record.id;
          const label = selected ? layout.name : build.name;
          return <button key={build.id} type="button" title={label} aria-current={selected ? "true" : undefined} disabled={busy} onClick={() => switchBuild(build.id)}>
            {selected ? <FolderOpen size={16} /> : <Folder size={16} />}<span>{label}</span>
          </button>;
        })}
      </div>
      {error && !dialogRef.current?.open && <p role="alert">{error}</p>}
      <dialog ref={dialogRef} className="better-editor-name-dialog" onCancel={(event) => { if (busy) event.preventDefault(); }}>
        <form onSubmit={submit}>
          <header><h2>{mode === "rename" ? "Rename build" : mode === "duplicate" ? "Duplicate build" : "New build"}</h2><button type="button" aria-label="Close" disabled={busy} onClick={() => dialogRef.current.close()}><X size={18} /></button></header>
          <label>Build name<input autoFocus required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} disabled={busy} /></label>
          {error && <p role="alert">{error}</p>}
          <footer><button type="button" disabled={busy} onClick={() => dialogRef.current.close()}>Cancel</button><button type="submit" disabled={busy || !name.trim()}>{busy ? "Saving..." : mode === "rename" ? "Save" : "Create"}</button></footer>
        </form>
      </dialog>
    </section>
  );
}
