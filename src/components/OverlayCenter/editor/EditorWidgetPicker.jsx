import React, { useEffect, useRef, useState } from "react";
import { Search, X, Plus } from "lucide-react";

export default function EditorWidgetPicker({
  open,
  onClose,
  definitions,
  onAdd,
}) {
  const dialog = useRef(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  useEffect(() => {
    if (open) {
      setSearch("");
      setCategory("All");
      dialog.current.showModal();
    } else dialog.current.close();
  }, [open]);
  const categories = [
    "All",
    ...new Set(definitions.map((item) => item.editor.category)),
  ];
  const filtered = definitions.filter(
    (item) =>
      (category === "All" || category === item.editor.category) &&
      `${item.label} ${item.editor.keywords || ""}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
  );
  return (
    <dialog
      ref={dialog}
      aria-label="Add widget"
      className="editor-dialog editor-widget-picker"
      onClose={onClose}
    >
      <header>
        <h2>Add widget</h2>
        <button
          type="button"
          title="Close"
          aria-label="Close widget picker"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>
      <label className="editor-search">
        <Search size={16} />
        <input
          autoFocus
          type="search"
          aria-label="Search widgets"
          placeholder="Search widgets"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div
        className="editor-picker-categories"
        role="group"
        aria-label="Widget categories"
      >
        {categories.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={category === name}
            onClick={() => setCategory(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="editor-widget-options">
        {filtered.map((item) => (
          <button
            type="button"
            key={item.widgetType}
            onClick={() => {
              onAdd(item.widgetType);
              onClose();
            }}
          >
            <span className="editor-widget-option-icon">{item.icon}</span>
            <span>
              <strong>{item.label}</strong>
              <small>{item.editor.category}</small>
            </span>
            <Plus size={17} />
          </button>
        ))}
      </div>
      {!filtered.length && (
        <p className="editor-empty-result">No matching widgets</p>
      )}
    </dialog>
  );
}
