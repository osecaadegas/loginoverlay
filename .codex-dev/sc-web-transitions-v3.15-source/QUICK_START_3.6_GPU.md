# SC Web Transitions v3.6.0 RC1: Windows Quick Start

1. Keep your last known-good v3.5 EXE as a backup and fully close it.
2. Run `SC_Web_Transitions_v3.6.0_GPU_3D_RC1.exe`.
3. Connect OBS via WebSocket port 4455, then click **Install / realign camera renderer**.
4. Select **Crystal Growth**, **Petal Bloom** or **Lightning Surge**.
5. Under **Expansion rendering engine**, choose **WebGL2 Instanced 3D (experimental)** and click **Save effect settings**.
6. Record locally in OBS while testing OUT and IN. Inspect the app's Renderer status to confirm GPU mode is active.
7. If the effect is invisible, appears wrong, or makes OBS lag, select **Canvas2D compatibility**, save, and re-test. Money and Ice remain on the known-good paths.
8. Verify camera hidden after OUT, camera visible after IN, FX fully cleared, and no frame freezes. Test both Program/Preview targeting appropriately.

The GPU option affects the eight expansion effects only. Money, Ice, Smoke, Toxic and Inferno keep their existing rendering implementations. A GPU-enabled option alone does not guarantee the OBS browser supports WebGL2. This is a private test candidate, not a signed production installer.
