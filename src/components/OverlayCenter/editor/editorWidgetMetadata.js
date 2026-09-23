// Navigation metadata only. The existing widget controls own validation and updates.
const WIDGET_METADATA = {
  slot_bingo: {
    category: "Community",
    keywords: "slot bingo board milestones challenges lines",
    source: "Slot Bingo",
    route: "/overlay-center/widgets/slot-bingo",
    simpleSections: ["Content", "Board", "Layout", "Colours"],
  },
  bonus_hunt: {
    category: "Hunt",
    keywords: "bonus slots requests carousel tracker",
    source: "Bonus Hunt",
    route: "/overlay-center/widgets/bonus-hunt",
    simpleSections: [
      "Orientation",
      "Carousel Style",
      "List Style",
      "Colour",
      "Chat Requests",
    ],
  },
  rtp_stats: {
    category: "Hunt",
    keywords: "slot rtp personal best statistics",
    source: "Bonus Hunt",
    route: "/overlay-center/widgets/bonus-hunt",
    simpleSections: ["Presets", "Display", "Colours"],
  },
  giveaway: {
    category: "Community",
    keywords: "giveaway prize keyword entries",
    source: "Giveaway",
    route: "/overlay-center/widgets/giveaway",
    simpleSections: ["Presets", "Colour", "Card copy"],
  },
  bets: {
    category: "Community",
    keywords: "bets prediction results",
    source: "Bets",
    route: "/overlay-center/widgets/bets",
    simpleSections: ["Bets Style", "Colour Theme", "Display Mode", "Orientation", "Toggles"],
  },
  chat: {
    category: "Community",
    keywords: "twitch messages emotes",
    source: "Chat",
    route: "/overlay-center/widgets/chat",
    simpleSections: ["Chat Style", "Typography", "Colours", "Display", "Emotes", "In-Chat Giveaway", "In-Chat Shoutout"],
  },
  navbar: {
    category: "Stream",
    keywords: "header music spotify social casino clock",
    source: "Navbar",
    route: "/overlay-center/widgets/navbar",
    simpleSections: ["Visible sections", "Colours", "Casino"],
  },
  background: {
    category: "Stream",
    keywords: "background media image video texture",
    simpleSections: [
      "Curated Atmospheres",
      "Background source",
      "Texture palette",
    ],
  },
  slideshow_frame: {
    category: "Stream",
    keywords: "slideshow image video frame media",
    simpleSections: [
      "Media links",
      "Frame style",
      "Slideshow timing",
      "Media fit",
    ],
  },
  tournament: {
    category: "Community",
    keywords: "tournament bracket competition",
    simpleSections: ["Visual layout", "Slot images"],
  },
  raid_shoutout: {
    category: "Community",
    keywords: "twitch raid shoutout alert",
    simpleSections: ["Headline", "Alert playback", "Frame style"],
  },
  connect_four: {
    category: "Community",
    keywords: "connect four game board",
    simpleSections: ["Game details", "Players", "Board"],
  },
};

export const EDITOR_WIDGET_METADATA = Object.freeze(Object.fromEntries(
  Object.entries(WIDGET_METADATA).map(([type, metadata]) => [type, {
    ...metadata,
    simpleSections: [...new Set(["Colour Theme", ...metadata.simpleSections])],
  }]),
));
