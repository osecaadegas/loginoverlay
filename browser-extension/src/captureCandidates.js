(function registerCaptureCandidates(global) {
  const MIN_WIDTH = 240;
  const MIN_HEIGHT = 160;
  const CANDIDATE_SELECTOR = [
    'iframe', 'canvas', '[data-game-container]', '[data-game-frame]',
    '[class*="game-container" i]', '[class*="game-frame" i]',
    '[id*="game-container" i]', '[id*="game-frame" i]',
  ].join(',');

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  function hash(value) {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return (result >>> 0).toString(36);
  }
  function safeSegment(value, max = 80) {
    return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  }
  function visibleRect(element) {
    const rect = element.getBoundingClientRect();
    const style = global.getComputedStyle(element);
    const visible = style.display !== 'none' && style.visibility !== 'hidden'
      && Number(style.opacity || 1) > 0.02 && rect.width >= MIN_WIDTH && rect.height >= MIN_HEIGHT
      && rect.bottom > 0 && rect.right > 0 && rect.left < global.innerWidth && rect.top < global.innerHeight;
    return { rect, style, visible };
  }
  function stablePath(element) {
    const parts = [];
    let current = element;
    while (current && current.nodeType === 1 && parts.length < 7) {
      let part = current.tagName.toLowerCase();
      if (current.id) {
        part += `#${safeSegment(current.id, 48).replace(/[^a-z0-9_-]/gi, '-')}`;
        parts.unshift(part);
        break;
      }
      const stableClasses = [...current.classList]
        .filter((name) => !/^(active|selected|hover|open|visible|loading)$/i.test(name)).slice(0, 2)
        .map((name) => safeSegment(name, 32).replace(/[^a-z0-9_-]/gi, '-'));
      if (stableClasses.length) part += `.${stableClasses.join('.')}`;
      const siblings = current.parentElement ? [...current.parentElement.children].filter((node) => node.tagName === current.tagName) : [];
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      parts.unshift(part);
      current = current.parentElement;
    }
    return parts.join('>');
  }
  function scoreCandidate(element, rect, style) {
    const viewportArea = Math.max(1, global.innerWidth * global.innerHeight);
    const visibleArea = Math.max(0, Math.min(rect.right, global.innerWidth) - Math.max(rect.left, 0))
      * Math.max(0, Math.min(rect.bottom, global.innerHeight) - Math.max(rect.top, 0));
    const ratio = rect.width / Math.max(rect.height, 1);
    let score = clamp((visibleArea / viewportArea) * 58, 0, 58);
    if (element.tagName === 'IFRAME') score += 18;
    if (element.tagName === 'CANVAS') score += 16;
    if (ratio >= 1.15 && ratio <= 2.4) score += 10;
    if (style.position === 'fixed' || style.position === 'absolute') score += 4;
    if (/game|slot|casino|launch|play/i.test(`${element.id} ${element.className} ${element.title}`)) score += 10;
    if (rect.width >= global.innerWidth * 0.6 && rect.height >= global.innerHeight * 0.55) score += 8;
    return Math.round(clamp(score, 1, 100));
  }
  function serializeCandidate(element, index) {
    const { rect, style, visible } = visibleRect(element);
    if (!visible) return null;
    const path = stablePath(element);
    const type = element.tagName.toLowerCase();
    const source = type === 'iframe' ? element.getAttribute('src') || '' : '';
    let sourceDomain = '';
    try { sourceDomain = new URL(source, global.location.href).hostname.replace(/^www\./, ''); } catch { /* omit */ }
    return {
      candidateId: `${type}-${hash(`${path}:${Math.round(rect.width)}x${Math.round(rect.height)}`)}`,
      type,
      label: safeSegment(element.title || element.getAttribute('aria-label') || element.dataset.gameName || `${type} ${index + 1}`, 96),
      fingerprint: hash(`${global.location.hostname}:${path}:${type}`),
      pathHash: hash(path),
      bounds: { x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) },
      viewport: { width: global.innerWidth, height: global.innerHeight, devicePixelRatio: global.devicePixelRatio || 1 },
      scroll: { x: Math.round(global.scrollX), y: Math.round(global.scrollY) },
      browserMetrics: {
        screenX: Math.round(global.screenX), screenY: Math.round(global.screenY),
        outerWidth: Math.round(global.outerWidth), outerHeight: Math.round(global.outerHeight),
        innerWidth: global.innerWidth, innerHeight: global.innerHeight,
      },
      transform: style.transform === 'none' ? '' : safeSegment(style.transform, 128),
      sourceDomain,
      confidence: scoreCandidate(element, rect, style),
    };
  }
  function collectCandidates(root = document) {
    const candidates = [...root.querySelectorAll(CANDIDATE_SELECTOR)].map(serializeCandidate).filter(Boolean)
      .sort((left, right) => right.confidence - left.confidence);
    const seen = new Set();
    return candidates.filter((candidate) => {
      const key = `${candidate.fingerprint}:${candidate.bounds.x}:${candidate.bounds.y}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 30);
  }
  function findCandidate(candidateId) {
    return [...document.querySelectorAll(CANDIDATE_SELECTOR)].find((element, index) => serializeCandidate(element, index)?.candidateId === candidateId) || null;
  }
  global.StreamersCenterCaptureCandidates = { collectCandidates, findCandidate, serializeCandidate };
})(globalThis);
