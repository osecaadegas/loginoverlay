const assigned = (name) => Boolean(name && String(name).trim() && String(name).toUpperCase() !== "TBD");

export function getProMatchQueue(matches = [], activeMatchId) {
  const list = Array.isArray(matches) ? matches : [];
  const activeIndex = list.findIndex((match) => String(match?.id) === String(activeMatchId));
  if (activeIndex < 0) return { next: null, remaining: 0 };
  const upcoming = list.slice(activeIndex + 1).filter((match) =>
    match && match.status !== "completed" && match.status !== "cancelled" && !match.winner
      && assigned(match.player1) && assigned(match.player2));
  return { next: upcoming[0] || null, remaining: upcoming.length };
}
