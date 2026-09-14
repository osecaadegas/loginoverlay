import React from "react";
import { BACKGROUND_LIBRARY } from "../widgets/background/backgroundLibrary";

export default function BackgroundLibraryPicker({ value, onChange }) {
  return (
    <div className="bp-background-library" role="group" aria-label="Background library">
      {BACKGROUND_LIBRARY.map((background) => (
        <button
          key={background.url}
          type="button"
          aria-label={background.label}
          aria-pressed={value === background.url}
          title={background.label}
          onClick={() => onChange(background.url)}
        >
          <img src={background.url} alt="" loading="lazy" decoding="async" />
          <span>{background.label}</span>
        </button>
      ))}
    </div>
  );
}
