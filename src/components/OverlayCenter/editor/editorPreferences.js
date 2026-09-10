import { useCallback, useState } from "react";

const keyFor = (userId, buildId) => `better-editor-ui:${userId}:${buildId}`;

export function readEditorPreferences(userId, buildId) {
  if (!userId || !buildId) return {};
  try {
    const value = JSON.parse(
      localStorage.getItem(keyFor(userId, buildId)) || "{}",
    );
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
  } catch {
    return {};
  }
}

export function writeEditorPreferences(userId, buildId, value) {
  if (!userId || !buildId) return;
  try {
    localStorage.setItem(keyFor(userId, buildId), JSON.stringify(value));
  } catch {
    /* Editing remains available with storage disabled. */
  }
}

export function useEditorPreferences(userId, buildId) {
  const key = keyFor(userId, buildId);
  const [state, setState] = useState(() => ({
    key,
    value: readEditorPreferences(userId, buildId),
  }));
  const preferences =
    state.key === key ? state.value : readEditorPreferences(userId, buildId);
  const update = useCallback(
    (patch) => {
      setState((current) => {
        const previous =
          current.key === key
            ? current.value
            : readEditorPreferences(userId, buildId);
        const value = {
          ...previous,
          ...(typeof patch === "function" ? patch(previous) : patch),
        };
        writeEditorPreferences(userId, buildId, value);
        return { key, value };
      });
    },
    [userId, buildId, key],
  );
  return [preferences, update];
}
