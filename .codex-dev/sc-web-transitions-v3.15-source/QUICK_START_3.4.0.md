# SC Web Transitions 3.4.0 — Test build quick start

1. Close the previously running SC Web Transitions application, not just its browser tab.
2. Keep a copy of your working v3.3 executable for rollback.
3. Run `SC_Web_Transitions_v3.4.0_Expansion_RC1.exe` on Windows 10/11 (x64).
4. Connect OBS WebSocket on port 4455; select your webcam source and target **Program** scene.
5. Click **Install / realign camera renderer** in the app. The renderer status should display `3.4.0-expansion-rc1`.
6. Select one of eight new effects and use the preview controls. Change accent, motion or detail and save settings if desired.
7. Test **OUT** followed by **IN** while NOT broadcasting. Check that the camera is OFF at the end of OUT and ON at the end of IN.
8. Check the Activity log and use **Recover Camera** after any camera/source mismatch.
9. If v3.4 produces incorrect behaviour, close it, launch the saved v3.3 executable, and run **Install / realign camera renderer** again.

For this release all new effects are preview/test VFX. Do not use them during a live stream without verifying locally first.
