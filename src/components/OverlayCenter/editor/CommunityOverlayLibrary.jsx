import React, { useState } from "react";
import { Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CommunityOverlayLibrary({ onSave, disabled = false }) {
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);

  const openCommunity = async () => {
    if (disabled || opening) return;
    setOpening(true);
    try {
      await onSave?.();
      navigate("/community_overlays_share");
    } finally {
      setOpening(false);
    }
  };

  return (
    <button
      type="button"
      aria-label="Community overlays"
      disabled={disabled || opening}
      onClick={openCommunity}
    >
      <Share2 size={15} />
      <span>{opening ? "Opening..." : "Community"}</span>
    </button>
  );
}
