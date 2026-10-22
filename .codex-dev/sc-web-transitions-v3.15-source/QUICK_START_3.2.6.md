# SC Web Transitions v3.2.6 Cloud Rebuild — private test build

1. Quit your previous SC Web Transitions app completely, including the tray instance.
2. Back up the previous executable before installing this release candidate.
3. Run `SC_Web_Transitions_v3.2.6_Cloud_Rebuild_RC.exe`. The executable is unsigned, so Windows may show a publisher warning.
4. Connect to OBS Studio (OBS WebSocket v5, normally port 4455).
5. Choose the intended camera source that has chroma key or background removal applied **directly to the source**.
6. Click **Install / realign camera renderer** to ensure OBS reloads the new embedded Browser Source URL. Check renderer version `3.2.6-cloud-rc1` in the app status.
7. In a test OBS scene, try Smoke OUT, then Smoke IN; repeat with Toxic Cloud.
8. Confirm camera is hidden after each OUT, visible after each IN, and that the FX source ends transparent.
9. If a test leaves a cloud onscreen or camera in the wrong state, choose **Recover Camera · Clear Stuck FX**, and export/record the OBS log and Program output for diagnosis.

Do not replace a live streaming setup without testing in OBS first. Money and Ice functions remain unchanged.
