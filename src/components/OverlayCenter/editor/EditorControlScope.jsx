import React, { createContext, useContext } from "react";

export const EditorControlContext = createContext(null);
export const useEditorControlScope = () => useContext(EditorControlContext);
export const matchesControlTab = (active, tab) =>
  active === "__all" || active === tab;

export function controlSearchText(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(controlSearchText).join(" ");
  if (!React.isValidElement(node)) return "";
  const { title, label, placeholder, options, children } = node.props;
  return [
    title,
    label,
    placeholder,
    options
      ?.map((option) => option.label || option.name || option.key)
      .join(" "),
    controlSearchText(children),
  ]
    .filter(Boolean)
    .join(" ");
}

export function useEditorControlSection(title, children, defaultOpen = true) {
  const scope = useEditorControlScope();
  const search = scope?.search?.trim().toLowerCase() || "";
  const text = `${title} ${controlSearchText(children)}`.toLowerCase();
  const visible = search
    ? search.split(/\s+/).every((word) => text.includes(word))
    : scope?.mode === "simple"
      ? scope.simpleSections.includes(title)
      : true;
  const open = search
    ? true
    : (scope?.sections?.[title] ??
      (scope?.mode === "advanced" ? false : defaultOpen));
  return { scope, visible, open, toggle: () => scope?.onSection(title, !open) };
}
