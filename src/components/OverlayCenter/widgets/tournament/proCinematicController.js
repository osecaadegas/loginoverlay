// Presentation only. Tournament payouts, scores and winners remain owned by the engine.
const ease = "cubic-bezier(.2,.7,.2,1)";
const select = (root, selector) => root?.querySelector(selector);

export class ProCinematicController {
  constructor(root, options = {}) {
    this.root = root;
    this.options = options;
    this.cancelled = false;
    this.animations = new Set();
    this.frames = new Set();
    this.cleanups = new Set();
  }

  async animate(node, frames, duration, delay = 0) {
    if (!node || this.cancelled || !duration) return;
    const animation = node.animate(frames, { duration, delay, easing: ease, fill: "none" });
    this.animations.add(animation);
    try { await animation.finished; } catch { /* Cancellation reconciles the canonical DOM. */ }
    this.animations.delete(animation);
  }

  async together(steps) { await Promise.all(steps.filter(Boolean)); }

  async payout(roundIndex, payouts) {
    if (!this.options.payoutCounter || !payouts?.length) return;
    await this.together(payouts.map(async ({ side, value }) => {
      const cell = select(this.scopeRoot || this.root, `[data-pro-round="${roundIndex}"] [data-pro-side="${side}"] [data-pro-pay-cell]`) || select(this.scopeRoot, `[data-pro-side="${side}"] [data-pro-pay-cell]`);
      const number = cell?.querySelector("[data-pro-pay-value]");
      if (!number || !Number.isFinite(value)) return;
      const canonical = number.textContent;
      const currency = number.dataset.currency || "€";
      const duration = Math.round(1250 * this.scale);
      await this.animate(cell, [{ opacity: .58, transform: "scale(.97)" }, { opacity: 1, transform: "scale(1)" }], 300 * this.scale);
      if (this.cancelled || !duration) return;
      const start = performance.now();
      await new Promise((resolve) => {
        const frame = (now) => {
          this.frames.delete(id);
          if (this.cancelled || !number.isConnected) { resolve(); return; }
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          number.textContent = `${currency}${(value * eased).toFixed(2)}`;
          if (p < 1) { id = requestAnimationFrame(frame); this.frames.add(id); }
          else resolve();
        };
        let id = requestAnimationFrame(frame);
        this.frames.add(id);
        this.cleanups.add(resolve);
      });
      if (number.isConnected) number.textContent = canonical;
      await this.animate(cell, [{ opacity: .7 }, { opacity: 1 }], 160 * this.scale);
    }));
  }

  async intro() {
    const header = select(this.root, ".tw-pro-header");
    const left = select(this.root, ".tw-pro-player:not(.tw-pro-player--right)");
    const right = select(this.root, ".tw-pro-player--right");
    const score = select(this.root, ".tw-pro-score");
    const sweep = select(this.root, ".tw-pro-light-sweep");
    const scoreSweep = select(this.root, ".tw-pro-score-sweep");
    const vs = select(this.root, ".tw-pro-round--active .tw-pro-vs");
    await this.together([
      this.animate(header, [{ opacity: .3 }, { opacity: 1 }], 250 * this.scale),
      this.animate(left, [{ opacity: .1, transform: "translateX(-15px)" }, { opacity: 1, transform: "none" }], 650 * this.scale, 180 * this.scale),
      this.animate(right, [{ opacity: .1, transform: "translateX(15px)" }, { opacity: 1, transform: "none" }], 650 * this.scale, 180 * this.scale),
      this.animate(score, [{ opacity: 0, transform: "scale(.9)" }, { opacity: 1, transform: "scale(1)" }], 550 * this.scale, 650 * this.scale),
      this.animate(sweep, [{ opacity: 0, transform: "translateX(-130%)" }, { opacity: .8, offset: .5 }, { opacity: 0, transform: "translateX(130%)" }], 650 * this.scale),
      this.animate(scoreSweep, [{ opacity: 0, transform: "translateX(-130%)" }, { opacity: .65, offset: .5 }, { opacity: 0, transform: "translateX(130%)" }], 450 * this.scale, 700 * this.scale),
      this.animate(vs, [{ opacity: 0, transform: "scale(.82)" }, { opacity: 1, transform: "scale(1)" }], 350 * this.scale, 600 * this.scale),
    ]);
    await this.activate(0);
  }

  async winner(roundIndex, side) {
    if (!this.options.winnerEffects) return;
    const card = select(this.scopeRoot || this.root, `[data-pro-round="${roundIndex}"] [data-pro-side="${side}"]`) || select(this.scopeRoot, `[data-pro-side="${side}"]`);
    const trace = card?.querySelector(".tw-pro-energy-trace");
    const badge = card?.querySelector(".tw-pro-win-tag");
    await this.together([
      this.animate(card, [{ transform: "scale(1)" }, { transform: "scale(1.012)" }, { transform: "scale(1)" }], 1000 * this.scale),
      this.animate(trace, [{ opacity: 0, strokeDashoffset: 100 }, { opacity: 1, strokeDashoffset: 0 }, { opacity: 0, strokeDashoffset: 0 }], 950 * this.scale),
    ]);
    await this.animate(badge, [{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], 250 * this.scale);
  }

  async score(event) {
    await this.together(["left", "right"].map(async (side) => {
      const key = side === "left" ? "player1" : "player2";
      if (event.toScore[key] === event.fromScore[key]) return;
      const digit = select(this.scopeRoot || this.root, `[data-pro-score="${side}"]`);
      if (!digit) return;
      const canonical = digit.textContent;
      digit.textContent = String(event.fromScore[key]);
      await this.animate(digit, [{ transform: "perspective(150px) rotateX(0)" }, { transform: "perspective(150px) rotateX(90deg)" }], 180 * this.scale);
      if (this.cancelled) return;
      digit.textContent = canonical;
      await this.animate(digit, [{ transform: "perspective(150px) rotateX(-90deg)", opacity: .6 }, { transform: "perspective(150px) rotateX(0)", opacity: 1 }], 170 * this.scale);
      await this.animate(digit, [{ opacity: .75 }, { opacity: 1 }], 250 * this.scale);
    }));
  }

  async activate(index) {
    if (!this.options.roundTransitions || index > 2) return;
    const heading = select(this.scopeRoot || this.root, `[data-pro-round="${index}"] .tw-pro-round-heading`);
    const round = heading?.closest(".tw-pro-round");
    await this.together([
      this.animate(heading, [{ opacity: .45 }, { opacity: 1 }], 500 * this.scale),
      this.animate(round, [{ opacity: .78 }, { opacity: 1 }], 850 * this.scale),
    ]);
  }

  async champion(side) {
    if (!this.options.championReveal) return;
    const player = select(this.root, side === "player1" ? ".tw-pro-player:not(.tw-pro-player--right)" : ".tw-pro-player--right");
    const footer = select(this.root, ".tw-pro-footer");
    const crown = player?.querySelector(".tw-pro-champion-crown");
    const scoreSweep = select(this.root, ".tw-pro-score-sweep");
    const sparks = [...(player?.querySelectorAll(".tw-pro-champion-sparks i") || [])];
    await this.together([
      this.animate(player, [{ opacity: .65 }, { opacity: 1 }], 700 * this.scale),
      this.animate(crown, [{ opacity: 0, transform: "scale(.85)" }, { opacity: 1, transform: "scale(1)" }], 650 * this.scale, 500 * this.scale),
      this.animate(footer, [{ opacity: .45 }, { opacity: 1 }], 900 * this.scale, 900 * this.scale),
      this.animate(scoreSweep, [{ opacity: 0, transform: "translateX(-130%)" }, { opacity: .75, offset: .5 }, { opacity: 0, transform: "translateX(130%)" }], 520 * this.scale, 300 * this.scale),
      ...sparks.map((spark, index) => {
        const angle = index * Math.PI * 2 / sparks.length;
        const x = Math.round(Math.cos(angle) * 30);
        const y = Math.round(Math.sin(angle) * 18);
        return this.animate(spark, [
          { opacity: 0, transform: "translate(0, 0) scale(.5)" },
          { opacity: .85, offset: .28 },
          { opacity: 0, transform: `translate(${x}px, ${y}px) scale(.2)` },
        ], 1050 * this.scale, 1000 * this.scale);
      }),
    ]);
  }

  get scale() { return (this.options.intensity ?? 100) / 100; }

  async play(event, shatter) {
    if (this.cancelled) return false;
    this.scopeRoot = [...(this.root?.querySelectorAll("[data-pro-match-id]") || [])].find((node) => String(node.dataset.proMatchId) === String(event.matchId)) || this.root;
    const bracket = this.root?.dataset.layout === "pro_bracket";
    this.root?.setAttribute("data-cinematic-phase", event.type);
    if (event.type === "intro") await this.intro();
    if (event.type === "payout") await this.payout(event.roundIndex, event.payouts);
    if (event.type === "result") {
      await this.payout(event.roundIndex, event.payouts);
      if (!this.cancelled && event.winner !== "draw") await shatter(event);
      if (!this.cancelled && event.winner !== "draw") await this.winner(event.roundIndex, event.winner === "player1" ? "left" : "right");
      if (!this.cancelled) await this.score(event);
      if (!this.cancelled && event.champion && !bracket) await this.champion(event.champion);
      else if (!this.cancelled && !bracket) await this.activate(event.roundIndex + 1);
    }
    if (event.type === "champion" && !bracket) await this.champion(event.champion);
    this.root?.setAttribute("data-cinematic-phase", "idle");
    return !this.cancelled;
  }

  cancel() {
    this.cancelled = true;
    this.animations.forEach((animation) => animation.cancel());
    this.animations.clear();
    this.frames.forEach((frame) => cancelAnimationFrame(frame));
    this.frames.clear();
    this.cleanups.forEach((resolve) => resolve());
    this.cleanups.clear();
    this.root?.querySelectorAll("[data-pro-pay-value], [data-pro-score]").forEach((node) => {
      if (node.dataset.canonical) node.textContent = node.dataset.canonical;
    });
    this.root?.setAttribute("data-cinematic-phase", "idle");
  }
  reset() { this.cancel(); this.cancelled = false; }
  dispose() { this.cancel(); this.root = null; }
}
