/**
 * colorUtils.js — Shared color helpers for slot-request widget styles.
 */

/**
 * Convert a 6-digit hex color to an "r,g,b" string suitable for CSS rgb()/rgba().
 * Falls back to the slate accent "148,163,184" if parsing fails.
 *
 * @param {string} hex  e.g. "#94a3b8" or "94a3b8"
 * @returns {string}    e.g. "148,163,184"
 */
export function hex2rgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  return m
    ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`
    : '148,163,184';
}
