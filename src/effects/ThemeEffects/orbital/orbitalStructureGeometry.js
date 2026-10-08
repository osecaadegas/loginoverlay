// Decorative geometry only: never writes back to layout or reserves space.
// Connect aligned modules only. Free-positioned widgets keep their own shell.
export function orbitalStructure(targets, width, height) {
  const visible = targets.filter(t => t.opacity > 0 && t.theme?.family === 'orbital');
  const right = t => t.x + t.width;
  const bottom = t => t.y + t.height;
  const overlaps = (a, b) => a.x < right(b) && right(a) > b.x && a.y < bottom(b) && bottom(a) > b.y;
  const modules = visible.filter(t => t.widgetType !== 'background');
  const structures = [];
  const add = (id, x, y, w, h, members = [], depth = 10) => {
    if (w < 60 || h < 60 || x < 0 || y < 0 || x + w > width || y + h > height) return;
    const rails = [
      { x, y, width: w, height: depth }, { x, y: y + h - depth, width: w, height: depth },
      { x, y, width: depth, height: h }, { x: x + w - depth, y, width: depth, height: h },
    ];
    if (modules.some(t => !members.includes(t.id) && rails.some(r => overlaps(r, t)))) return;
    const frame = { id, x, y, width: w, height: h, depth };
    structures.push(frame);
    return frame;
  };
  const sidebar = modules.filter(t => ['slideshow_frame', 'giveaway', 'chat'].includes(t.widgetType) && t.x > width / 2).sort((a, b) => a.y - b.y);
  // An enclosing shell is only appropriate for one aligned, non-overlapping stack.
  if (sidebar.length >= 2 && sidebar.every((t, i) => !i || (t.y >= bottom(sidebar[i - 1]) && t.y - bottom(sidebar[i - 1]) < 100 && Math.abs(t.x - sidebar[0].x) < 32 && Math.abs(right(t) - right(sidebar[0])) < 32))) {
    const x = Math.min(...sidebar.map(t => t.x));
    const end = Math.max(...sidebar.map(right));
    const frame = add('comms-column', x - 6, sidebar[0].y - 6, end - x + 12, bottom(sidebar.at(-1)) - sidebar[0].y + 12, sidebar.map(t => t.id), 6);
    if (frame) frame.dividers = sidebar.slice(1).flatMap((t, i) => {
      const gap = t.y - bottom(sidebar[i]);
      return gap >= 6 ? [{ y: bottom(sidebar[i]) + gap / 2, depth: Math.min(8, gap - 2) }] : [];
    });
  }
  const hunt = modules.find(t => t.widgetType === 'bonus_hunt' && right(t) < width / 2);
  const nav = modules.find(t => t.widgetType === 'navbar');
  const telemetry = modules.find(t => t.widgetType === 'rtp_stats' && t.width > width / 3);
  const environment = visible.find(t => t.widgetType === 'background' && t.effects?.orbital?.environment !== 'off');
  if (hunt && nav && telemetry && environment && structures.some(frame => frame.id === 'comms-column')) {
    const x = right(hunt) + 7;
    const end = Math.min(...sidebar.map(t => t.x)) - 8;
    const y = bottom(nav) + 7;
    const endY = telemetry.y - 6;
    add('gameplay-window', x, y, end - x, endY - y, [], 20);
  }
  return structures;
}
