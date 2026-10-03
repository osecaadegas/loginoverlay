import { useEffect, useRef, useState } from "react";

export default function useLandingMotion() {
  const rootRef = useRef(null);
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [userPaused, setUserPaused] = useState(false);
  const paused = reduced || userPaused;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(preference.matches);
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        target.dataset.revealed = "true";
        observer.unobserve(target);
      });
    }, { threshold: 0.08 });
    root.querySelectorAll(".lp-home-section").forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || paused || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return undefined;
    let frame = 0;
    let active;
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      active?.style.removeProperty("--tilt-x");
      active?.style.removeProperty("--tilt-y");
      active = null;
    };
    const move = (event) => {
      const surface = event.target.closest("[data-tilt]");
      if (surface !== active) reset();
      if (!surface || !root.contains(surface)) return;
      active = surface;
      cancelAnimationFrame(frame);
      const { clientX, clientY } = event;
      frame = requestAnimationFrame(() => {
        const rect = surface.getBoundingClientRect();
        const x = Math.max(-0.5, Math.min(0.5, (clientX - rect.left) / rect.width - 0.5));
        const y = Math.max(-0.5, Math.min(0.5, (clientY - rect.top) / rect.height - 0.5));
        surface.style.setProperty("--tilt-x", `${-y * 5}deg`);
        surface.style.setProperty("--tilt-y", `${x * 5}deg`);
      });
    };
    root.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerleave", reset);
    return () => {
      reset();
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", reset);
    };
  }, [paused]);

  return { rootRef, paused, reduced, toggleMotion: () => setUserPaused((value) => !value) };
}
