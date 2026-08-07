import React, { useEffect, useRef } from "react";

function clamp(value, minimum, maximum, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? Math.min(maximum, Math.max(minimum, numeric))
    : fallback;
}

export default function ChromaKeySmoke({ opacity, tolerance, softness }) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !video || !container) return undefined;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return undefined;

    let animationFrame = 0;
    let videoFrame = 0;
    let stopped = false;

    function resize() {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      const scale = Math.min(1, 640 / width, 360 / height);
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
    }

    function scheduleFrame() {
      if (stopped) return;
      if (typeof video.requestVideoFrameCallback === "function") {
        videoFrame = video.requestVideoFrameCallback(drawFrame);
      } else {
        animationFrame = requestAnimationFrame(drawFrame);
      }
    }

    function drawFrame() {
      if (video.readyState >= 2 && canvas.width > 0 && canvas.height > 0) {
        const sourceRatio = video.videoWidth / video.videoHeight;
        const targetRatio = canvas.width / canvas.height;
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = video.videoWidth;
        let sourceHeight = video.videoHeight;

        if (sourceRatio > targetRatio) {
          sourceWidth = video.videoHeight * targetRatio;
          sourceX = (video.videoWidth - sourceWidth) / 2;
        } else {
          sourceHeight = video.videoWidth / targetRatio;
          sourceY = (video.videoHeight - sourceHeight) / 2;
        }

        context.drawImage(
          video,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          canvas.width,
          canvas.height,
        );

        const frame = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = frame.data;
        const cutoff = 180 - clamp(tolerance, 0, 100, 55) * 0.9;
        const feather = 8 + clamp(softness, 0, 100, 35) * 0.72;
        const featherStart = cutoff - feather;

        for (let index = 0; index < pixels.length; index += 4) {
          const red = pixels[index];
          const green = pixels[index + 1];
          const blue = pixels[index + 2];
          const dominance = green - Math.max(red, blue);
          let alpha = 255;

          if (green > 60 && dominance >= cutoff) {
            alpha = 0;
          } else if (green > 60 && dominance > featherStart) {
            alpha =
              255 * (1 - (dominance - featherStart) / Math.max(1, feather));
          }

          if (dominance > 0) pixels[index + 1] = Math.max(red, blue);
          pixels[index + 3] = Math.round((pixels[index + 3] * alpha) / 255);
        }

        context.putImageData(frame, 0, 0);
      }
      scheduleFrame();
    }

    function start() {
      resize();
      video.play().catch(() => {});
      scheduleFrame();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    if (video.readyState >= 2) start();
    else video.addEventListener("loadeddata", start, { once: true });

    return () => {
      stopped = true;
      resizeObserver.disconnect();
      video.removeEventListener("loadeddata", start);
      video.pause();
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (videoFrame && typeof video.cancelVideoFrameCallback === "function") {
        video.cancelVideoFrameCallback(videoFrame);
      }
    };
  }, [softness, tolerance]);

  return (
    <div
      className="oc-fx-smoke"
      style={{ position: "absolute", inset: 0, opacity, overflow: "hidden" }}
    >
      <video
        ref={videoRef}
        src="/smoke_effect.mp4"
        autoPlay
        loop
        muted
        playsInline
        crossOrigin="anonymous"
        style={{ display: "none" }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}