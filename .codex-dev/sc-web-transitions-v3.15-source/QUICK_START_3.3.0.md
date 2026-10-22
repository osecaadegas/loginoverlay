# SC Web Transitions 3.3.0 RC1 (Inferno) quick start

1. Fully close your previous SC Web Transitions executable and keep that previous EXE as a backup.
2. Run `SC_Web_Transitions_v3.3.0_Inferno_RC.exe` on a Windows 10/11 x64 PC.
3. Start OBS Studio with OBS WebSocket enabled (usually port 4455).
4. Connect in the app, select the correctly keyed **camera source** in the chosen Program/Preview scene, then click **Install / realign camera renderer**.
5. Check that the overlay renderer heartbeat reports `3.3.0-inferno-rc1`.
6. Select the **Inferno Disintegration** card. Use **Cinematic**, duration around **3 seconds** and density **75%** for initial off-stream testing.
7. With the camera visible, click **INFERNO OUT**. The camera should hide behind fully developed flame coverage and stay OFF once the embers dissipate.
8. Click **INFERNO IN**. The particles should reconstruct a fiery silhouette before the camera is enabled beneath it; the webcam should stay ON after the ember shell disappears.
9. If any transition leaves the camera in the wrong state, use **Recover Camera · Clear Stuck FX** and review Activity messages.

This app handles only the selected keyed camera scene item, not the whole scene. Do not run this build in a live broadcast until OUT and IN have been validated in your OBS installation.
