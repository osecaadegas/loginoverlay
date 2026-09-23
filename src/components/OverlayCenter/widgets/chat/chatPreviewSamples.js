// Preview-only events shared by the editor, sample canvas and appearance editor.
export const SAMPLE_CHAT_MESSAGES = [
  { id: "sample-viewer", platform: "youtube", username: "StreamFan", message: "Good luck everyone!" },
  { id: "sample-owner", platform: "twitch", username: "ChannelOwner", message: "Welcome! The giveaway is open — type !join.", isBroadcaster: true },
  { id: "sample-raid", platform: "twitch", username: "RaidLeader", message: "Raiding with 50 viewers!", type: "raid", isRaid: true, raidViewers: 50 },
  { id: "sample-gift", platform: "twitch", username: "GiftBoss", message: "Gifted 5 subscriptions!", type: "gift", giftCount: 5 },
  { id: "sample-bits", platform: "twitch", username: "CheerSquad", message: "Cheer100 Let's go!", bits: 100 },
  { id: "sample-sub", platform: "twitch", username: "LoyalSub", message: "Subscribed for 12 months!", type: "sub", isSub: true },
  { id: "sample-vip", platform: "twitch", username: "CommunityVIP", message: "That was a huge win!", isVip: true },
  { id: "sample-mod", platform: "twitch", username: "ChatModerator", message: "!so RaidLeader", isMod: true },
  { id: "sample-entry", platform: "kick", username: "LuckyViewer", message: "!join" },
];

export const SAMPLE_CHAT_GIVEAWAY = {
  title: "Giveaway #1",
  prize: "1000 channel points",
  keyword: "join",
  participants: ["StreamFan", "CommunityVIP", "LuckyViewer"],
  isActive: true,
  winner: "",
  spinningWinner: "",
};

export const SAMPLE_CHAT_SHOUTOUT = {
  id: "sample-chat-shoutout",
  raider_username: "raidleader",
  raider_display_name: "RaidLeader",
  game_name: "Just Chatting",
};

export function withChatPreviewSamples(config = {}) {
  return {
    ...config,
    __appearancePreviewMessages: Array.isArray(config.__appearancePreviewMessages)
      ? config.__appearancePreviewMessages : SAMPLE_CHAT_MESSAGES,
    __previewShoutoutAlert: config.__previewShoutoutAlert || SAMPLE_CHAT_SHOUTOUT,
    __previewGiveawayConfig: config.__previewGiveawayConfig || SAMPLE_CHAT_GIVEAWAY,
    __appearancePreviewSample: true,
  };
}
