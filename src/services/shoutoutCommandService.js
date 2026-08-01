const SHOUTOUT_COMMAND_PATTERN = /^!so\s+["']?@?([a-z0-9_]{1,25})["']?\s*$/i;

export function parseShoutoutChatCommand(message = {}) {
  if (!message.isBroadcaster && !message.isMod) return null;
  const match = String(message.message || "").match(SHOUTOUT_COMMAND_PATTERN);
  if (!match) return null;
  const sourceEventId = String(message.id || "").trim();
  if (!sourceEventId) return null;
  return {
    raiderUsername: match[1].toLowerCase(),
    sourceEventId,
    requesterRole: message.isBroadcaster ? "broadcaster" : "moderator",
  };
}

export async function triggerShoutoutChatCommand({ publicOverlayId, command }) {
  if (!publicOverlayId || !command) return null;
  const response = await fetch("/api/raid-shoutout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...command,
      publicOverlayId,
      triggeredBy: "chat_command",
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || "Failed to trigger Twitch shoutout");
  }
  return result;
}
