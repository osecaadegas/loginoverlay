# Test SC Web Transitions v3.9.0 — Golden Sheep Money CGI

1. Close earlier versions fully; keep a copy of your last working release.
2. Run **SC_Web_Transitions_v3.9.0_Money_CGI_RC1.exe** on Windows 10/11 (64-bit).
3. Connect to OBS WebSocket v5, select the keyed webcam in the current program scene and click **Install / realign camera renderer**.
4. Choose **Money Burst CGI 3D**. In settings choose **WebGL2 3D** (not Canvas2D compatibility) and **Cinematic** or **Ultra** quality.
5. Record a short local test of both **Money OUT** and **Money IN**. Ensure the webcam hides only after the final money cover, returns behind the assembled paper, and the last bill leaves the frame.
6. Check app **Renderer** status. For the new version it should read **WebGL2 CGI Paper 3D** while the effect runs. If it says **Money Canvas2D compatibility**, GPU context initialization failed, so use OBS Browser Source GPU acceleration or switch to 2D explicitly.
7. On any black frame, stuck transition or camera visibility issue, choose **Recover Camera** and revert to the previous version if necessary.

**Important:** Do not assume the synthetic Mesa videos verify your real OBS render. This version is a private test candidate.
