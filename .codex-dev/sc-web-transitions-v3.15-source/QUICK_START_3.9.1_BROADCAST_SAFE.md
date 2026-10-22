# Quick start — SC Web Transitions v3.9.1

1. Close the old SC Web Transitions process before running the new EXE. Multiple versions use local port **18767** and cannot operate together.
2. Run `SC_Web_Transitions_v3.9.1_Broadcast_Safe_RC1.exe` on Windows 10/11.
3. Connect to OBS WebSocket v5 on `127.0.0.1:4455`, selecting your active webcam in the current scene.
4. Click **Install / realign camera renderer** to refresh the OBS Browser Source.
5. Leave the **Synthetic preview** off during streaming. Click **Start preview** only when needed; it pauses automatically if a transition begins.
6. Keep **Adaptive GPU quality** enabled initially. It reduces detail on a *subsequent* transition after repeated slow-frame reports; it never changes the current scene halfway through an animation.
7. Test **Money CGI OUT -> IN** off-stream with OBS recording. Verify that the camera never shows through the visual cover.
8. If the camera becomes hidden or a layer sticks, use **Recover Camera · Clear Stuck FX**. If OBS is disconnected or the scene changed, repair it manually in OBS and realign.

**Important:** The renderer's low FPS while **Idle** is intentional to save GPU; judge performance only while an effect is playing. All effects retain their v3.9.0 appearance. This build has only been verified with synthetic/mock OBS tests; test it locally before using it live.
