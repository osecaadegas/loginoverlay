/**
 * colorUtils.js — Shared color helpers for slot-request widget styles.
 */

/**
 * Convert a 6-digit hex color to an "r,g,b" string suitable for CSS rgb()/rgba().
 * Falls back to the purple accent "167,139,250" if parsing fails.
 *
 * @param {string} hex  e.g. "#a78bfa" or "a78bfa"
 * @returns {string}    e.g. "167,139,250"
 */
export function hex2rgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  return m
    ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`
    : '167,139,250';
}
