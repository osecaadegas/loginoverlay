# v3.14.0 Raymarched Gas — Quick start

1. Keep the v3.13.4 EXE for rollback. Close previous SC Web Transitions build.
2. Launch `SC_Web_Transitions_v3.14.0_Raymarched_Gas_RC1.exe` on Windows.
3. In settings choose **WebGL2 3D** rendering, initially **Balanced** or **Cinematic** quality; choose **Smoke** or **Toxic Cloud**.
4. Use the synthetic preview and confirm the renderer diagnostics say **WebGL2 raymarched 3D smoke volume**. If they say 2D fallback, the new renderer is not running.
5. In OBS, test both OUT and IN off-stream. Verify full webcam coverage before hiding, no black frames, fade-out of fumes, and Recover Camera after interruption.
6. Ultra renders at native resolution up to 1920×1080 with 40 samples per ray. This can be GPU-intensive; use it only when OBS FPS and render P95 permit, because OBS and games share the GPU.

Contact sheets in this release are genuine Mesa offscreen GPU renders from the shipping shaders and exact seeded volume. They are **not** a Windows OBS test or Hollywood reference renders.
