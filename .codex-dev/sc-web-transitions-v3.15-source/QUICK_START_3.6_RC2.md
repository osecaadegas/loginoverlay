# SC Web Transitions v3.6.0 GPU RC2 — Quick Start

1. **Back up** your known-good v3.5 app and fully exit it.
2. Launch `SC_Web_Transitions_v3.6.0_GPU_3D_RC2.exe` on Windows 10/11.
3. With OBS running and WebSocket enabled on port 4455, press **Connect** then **Install / realign camera renderer**.
4. Select **Crystal Growth**, **Lightning Surge**, or **Petal Bloom**.
5. Under **Expansion rendering engine**, select **WebGL2 Instanced 3D (experimental)**, press **Save effect settings**.
6. Start a **local OBS recording**, then trigger OUT and IN. The app's Renderer status must say **WebGL2 instanced 3D** to confirm you're seeing the new GPU renderer.
7. Ensure the webcam is **OFF after OUT** and **ON after IN**, and all FX pixels leave the frame. Inspect frame pacing while playing a game.
8. If the new 3D renderer fails or looks worse, switch **Expansion rendering engine → Canvas2D compatibility**, save, and keep the previous EXE available.

**Scope:** 3D affects the eight newer expansion effects. Money, Ice, Smoke, Toxic and Inferno retain their unchanged rendering code. Webcam silhouette tracking still uses a one-time capture. The RC is **not** Windows/OBS performance-certified and is **not** a code-signed public installer.
