# SC Web Transitions v3.7 RC1 — Crystal Ultra setup

1. Quit the existing SC Web Transitions process completely. Save the previous EXE as a backup.
2. Run `SC_Web_Transitions_v3.7.0_Crystal_Ultra_RC1.exe` on Windows.
3. Connect to the local OBS WebSocket service on port 4455.
4. Choose the **Crystal Growth Ultra** effect.
5. Under **Expansion rendering engine**, select **WebGL2 3D + Crystal Ultra (experimental)** and save.
6. Click **Install / realign camera renderer** so OBS loads the new embedded Browser Source URL.
7. Test Crystal OUT followed by Crystal IN off-stream. In the activity/status diagnostics confirm `WebGL2 tessellated crystal hero` where available.
8. Check actual Program output and verify webcam OFF after OUT and ON after IN. For source-capture failures use **Recover Camera**.
9. If the GPU effect is unavailable or misrenders, select **Canvas2D compatibility**, save and realign the renderer.

> All provided preview videos use a synthetic subject and Mesa offscreen graphics. They are not real webcam/OBS recordings. This EXE is unsigned.
