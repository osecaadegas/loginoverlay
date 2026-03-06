import React from 'react';

/* ══════════════════════════════════════════════════════════
   ShatterEffect — cinematic glass shatter on a canvas
   Phases: tension → cracks → flash → shard explosion → dissolve
   ══════════════════════════════════════════════════════════ */

/* ── Deterministic pseudo-random (no seed drift between frames) ── */
const pr = (i, salt = 0) => {
  const x = Math.sin((i + 1) * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/* ── Tessellate a rect into jittered triangles ── */
function tessellate(rx, ry, rw, rh, density) {
  const cols = Math.max(3, Math.round(Math.sqrt(density * (rw / rh))));
  const rows = Math.max(3, Math.round(density / cols));
  const cw = rw / cols, ch = rh / rows;

  // Jittered grid
  const grid = [];
  for (let r = 0; r <= rows; r++) {
    grid[r] = [];
    for (let c = 0; c <= cols; c++) {
      let x = rx + c * cw, y = ry + r * ch;
      if (r > 0 && r < rows && c > 0 && c < cols) {
        x += (pr(r * 100 + c, 1) - 0.5) * cw * 0.72;
        y += (pr(r * 100 + c, 2) - 0.5) * ch * 0.72;
      }
      grid[r][c] = [x, y];
    }
  }

  // Triangulate quads
  const tris = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const tl = grid[r][c], tr = grid[r][c + 1];
      const bl = grid[r + 1][c], br = grid[r + 1][c + 1];
      if (pr(r * 31 + c * 17) > 0.5) {
        tris.push([tl, tr, bl]); tris.push([tr, br, bl]);
      } else {
        tris.push([tl, tr, br]); tris.push([tl, br, bl]);
      }
    }

  // Build shard objects with physics
  const cx = rx + rw / 2, cy = ry + rh / 2;
  return tris.map((verts, i) => {
    const center = [
      (verts[0][0] + verts[1][0] + verts[2][0]) / 3,
      (verts[0][1] + verts[1][1] + verts[2][1]) / 3,
    ];
    const area = Math.abs(
      (verts[1][0] - verts[0][0]) * (verts[2][1] - verts[0][1]) -
      (verts[2][0] - verts[0][0]) * (verts[1][1] - verts[0][1])
    ) / 2;

    const dx = center[0] - cx, dy = center[1] - cy;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const normDist = dist / (Math.max(rw, rh) * 0.5);
    const sizeScale = 1 / (1 + area * 0.003);
    const speed = (140 + pr(i, 10) * 280) * sizeScale;

    return {
      verts, center, area,
      vx: (dx / dist) * speed + (pr(i, 20) - 0.5) * 90,
      vy: (dy / dist) * speed + (pr(i, 30) - 0.5) * 70 - 40,
      rotSpeed: (pr(i, 40) - 0.5) * 16,
      delay: normDist * 0.018 + pr(i, 50) * 0.025,
    };
  });
}

/* ── Draw slot image in "cover" mode ── */
function drawCover(ctx, img, x, y, w, h) {
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = w / h;
  let sx, sy, sw, sh;
  if (ir > cr) { sh = img.naturalHeight; sw = sh * cr; sx = (img.naturalWidth - sw) / 2; sy = 0; }
  else         { sw = img.naturalWidth;  sh = sw / cr; sx = 0; sy = (img.naturalHeight - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/* ── Rounded-rect path ── */
function rrPath(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);   ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);   ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);       ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ── Crack lines from center ── */
function drawCracks(ctx, cx, cy, w, h, progress, color) {
  const n = 10;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = Math.min(1, progress * 1.6);
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;

  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 + pr(i, 70) * 0.6;
    const maxLen = Math.min(w, h) * 0.55;
    ctx.lineWidth = 1.6 - progress * 0.6;
    ctx.beginPath(); ctx.moveTo(cx, cy);

    let px = cx, py = cy;
    for (let s = 1; s <= 6; s++) {
      const t = s / 6;
      if (t > progress) break;
      const dev = pr(i * 10 + s, 71) * 18 - 9;
      px = cx + Math.cos(angle + dev * 0.014) * maxLen * t;
      py = cy + Math.sin(angle + dev * 0.014) * maxLen * t;
      ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Branch cracks at higher progress
    if (progress > 0.45 && pr(i, 80) > 0.35) {
      const bFrac = 0.35 + pr(i, 81) * 0.3;
      const bx = cx + Math.cos(angle) * maxLen * bFrac;
      const by = cy + Math.sin(angle) * maxLen * bFrac;
      const ba = angle + (pr(i, 82) - 0.5) * 1.8;
      const bl = maxLen * 0.3 * Math.min(1, (progress - 0.45) / 0.55);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(ba) * bl, by + Math.sin(ba) * bl);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* ── Sparkle particles ── */
function drawSparkles(ctx, cx, cy, t, color, count) {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const a = pr(i, 90) * Math.PI * 2;
    const spd = 50 + pr(i, 91) * 200;
    const x = cx + Math.cos(a) * spd * t;
    const y = cy + Math.sin(a) * spd * t + 35 * t * t;
    const alpha = Math.max(0, 1 - t * 1.4) * (0.3 + pr(i, 92) * 0.7);
    const sz = 0.7 + pr(i, 93) * 2.2;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pr(i, 94) > 0.5 ? color : '#ffffff';
    ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════
   Main React Component
   ═══════════════════════════════════════════════════════════ */
export default function ShatterEffect({ imageUrl, side, onComplete, accentColor = '#00e5ff' }) {
  const canvasRef = React.useRef(null);
  const animRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = parent.clientWidth;
    const ch = parent.clientHeight;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Approximate card rect (flex: 1 + VS + gap)
    const cardW = cw * 0.455;
    const cr = side === 'left'
      ? { x: 0, y: 0, w: cardW, h: ch }
      : { x: cw - cardW, y: 0, w: cardW, h: ch };

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const run = (srcImg) => {
      const shards = tessellate(cr.x, cr.y, cr.w, cr.h, 90);
      const DURATION = 1400;
      const t0 = performance.now();

      // Phase boundaries (normalised 0–1)
      const P1 = 0.14;   // tension end   ~200 ms
      const P2 = 0.36;   // crack end     ~300 ms
      const P3 = 0.43;   // shatter point ~100 ms

      const cardCx = cr.x + cr.w / 2;
      const cardCy = cr.y + cr.h / 2;

      const frame = (now) => {
        const t = Math.min((now - t0) / DURATION, 1);
        const elapsed = now - t0;
        ctx.clearRect(0, 0, cw, ch);

        if (t < P3) {
          /* === PHASES 1-2: Intact card with effects === */
          ctx.save();

          // Phase 1: tension tilt
          if (t < P1) {
            const tp = t / P1;
            ctx.translate(cardCx, cardCy);
            ctx.rotate(Math.sin(tp * Math.PI) * 4 * Math.PI / 180);
            ctx.translate(-cardCx, -cardCy);
          }

          // Phase 2: vibration
          if (t >= P1) {
            const intensity = 2.5 * (1 + (t - P1) * 4);
            ctx.translate(
              intensity * Math.sin(elapsed * 0.08),
              intensity * 0.6 * Math.cos(elapsed * 0.11),
            );
          }

          // Draw card: dark bg + image
          ctx.beginPath();
          rrPath(ctx, cr.x, cr.y, cr.w, cr.h, 14);
          ctx.clip();

          // dark fill (ensures no transparency leak)
          ctx.fillStyle = '#0a0a18';
          ctx.fillRect(cr.x, cr.y, cr.w, cr.h);

          if (srcImg) drawCover(ctx, srcImg, cr.x, cr.y, cr.w, cr.h);

          // Glow pulse (phase 1)
          if (t < P1) {
            const gp = Math.sin((t / P1) * Math.PI);
            ctx.fillStyle = accentColor;
            ctx.globalAlpha = 0.18 * gp;
            ctx.fillRect(cr.x, cr.y, cr.w, cr.h);
            ctx.globalAlpha = 1;
          }

          ctx.restore();

          // Cracks
          if (t > P1 * 0.4) {
            const cp = Math.min(1, (t - P1 * 0.4) / (P3 - P1 * 0.4));
            drawCracks(ctx, cardCx, cardCy, cr.w, cr.h, cp, accentColor);
          }

          // Pre-flash ramp
          if (t > P3 - 0.04) {
            const fp = (t - (P3 - 0.04)) / 0.04;
            ctx.fillStyle = `rgba(255,255,255,${(0.55 * fp).toFixed(3)})`;
            ctx.fillRect(cr.x - 20, cr.y - 20, cr.w + 40, cr.h + 40);
          }
        } else {
          /* === PHASES 3-5: Shards flying === */
          const st = (t - P3) / (1 - P3);

          // Flash
          if (st < 0.06) {
            ctx.fillStyle = `rgba(255,255,255,${(0.7 * (1 - st / 0.06)).toFixed(3)})`;
            ctx.fillRect(0, 0, cw, ch);
          }

          // Image drawParams for shards (cover-mode offsets)
          let imgDx = 0, imgDy = 0, imgDw = cr.w, imgDh = cr.h;
          if (srcImg) {
            const ir = srcImg.naturalWidth / srcImg.naturalHeight;
            const crr = cr.w / cr.h;
            if (ir > crr) { imgDh = cr.h; imgDw = imgDh * ir; }
            else           { imgDw = cr.w; imgDh = imgDw / ir; }
            imgDx = (cr.w - imgDw) / 2;
            imgDy = (cr.h - imgDh) / 2;
          }

          // Draw each shard
          for (let si = 0; si < shards.length; si++) {
            const s = shards[si];
            const lt = Math.max(0, st - s.delay);
            if (lt <= 0) continue;

            const expandT = Math.min(lt / 0.65, 1);
            const dissolveT = lt > 0.5 ? (lt - 0.5) / 0.5 : 0;
            const ease = 1 - Math.pow(1 - expandT, 2.5);

            const x = s.center[0] + s.vx * ease * 0.85;
            const y = s.center[1] + s.vy * ease * 0.85 + 55 * ease * ease;
            const rot = s.rotSpeed * ease * 2.2;
            const scale = Math.max(0, 1 - dissolveT * 0.55);
            const opacity = Math.max(0, 1 - dissolveT);
            if (opacity < 0.01) continue;

            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.translate(x, y);
            ctx.rotate(rot);
            ctx.scale(scale, scale);

            // Clip to shard triangle
            ctx.beginPath();
            for (let vi = 0; vi < 3; vi++) {
              const vx = s.verts[vi][0] - s.center[0];
              const vy = s.verts[vi][1] - s.center[1];
              vi === 0 ? ctx.moveTo(vx, vy) : ctx.lineTo(vx, vy);
            }
            ctx.closePath();
            ctx.clip();

            // Image fragment
            if (srcImg) {
              ctx.drawImage(srcImg,
                cr.x - s.center[0] + imgDx,
                cr.y - s.center[1] + imgDy,
                imgDw, imgDh,
              );
            } else {
              ctx.fillStyle = '#1a1040';
              ctx.fillRect(-60, -60, 120, 120);
            }

            // Neon edge glow
            ctx.beginPath();
            for (let vi = 0; vi < 3; vi++) {
              const vx = s.verts[vi][0] - s.center[0];
              const vy = s.verts[vi][1] - s.center[1];
              vi === 0 ? ctx.moveTo(vx, vy) : ctx.lineTo(vx, vy);
            }
            ctx.closePath();
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 1.2;
            ctx.globalAlpha = opacity * 0.45;
            ctx.shadowColor = accentColor;
            ctx.shadowBlur = 4;
            ctx.stroke();

            ctx.restore();
          }

          // Sparkles
          if (st < 0.85) drawSparkles(ctx, cardCx, cardCy, st, accentColor, 30);
        }

        if (t < 1) animRef.current = requestAnimationFrame(frame);
        else onComplete?.();
      };

      animRef.current = requestAnimationFrame(frame);
    };

    if (imageUrl) {
      img.onload = () => run(img);
      img.onerror = () => run(null);
      img.src = imageUrl;
    } else {
      run(null);
    }

    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas ref={canvasRef} style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      zIndex: 50, pointerEvents: 'none',
    }} />
  );
}
