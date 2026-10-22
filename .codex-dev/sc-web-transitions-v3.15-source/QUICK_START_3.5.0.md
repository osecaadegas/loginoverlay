# SC Web Transitions v3.5.0 RC1 — Private OBS Test

1. Back up your current EXE and settings. Fully quit the previous version from its Help & Setup menu.
2. Run `SC_Web_Transitions_v3.5.0_VFX_Audit_RC1.exe` on Windows 10/11 x64. This is an unsigned private test candidate, not a signed installer.
3. Connect to OBS WebSocket v5 on your configured port (default 4455).
4. Select the correct OBS **Program** scene and camera source. Use **Install / realign camera renderer**.
5. Choose one of the eight expansion effects and first test **OUT** while recording locally. Check that OBS actually reports the camera OFF afterward.
6. Test **IN** and verify camera ON and a clean, fully transparent effect ending. Repeat while moving your head and shoulders.
7. If any effect remains visible or the camera state is wrong, use **Recover Camera** and export the Activity log for diagnosis.
8. Do not use this build for a public broadcast until your actual OBS scene, camera key, frame pacing and effect quality have passed your checks.

Coverage tests and review videos in the release ZIP use a synthetic silhouette and do not certify live webcam performance.
