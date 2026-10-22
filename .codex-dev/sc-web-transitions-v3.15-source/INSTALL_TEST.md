# Private Windows test
1. Keep v3.0 RC1 installer as rollback copy.
2. Quit previous app via Help & Setup > Quit.
3. Run SC_Web_Transitions_v3.1.0_RC1.exe.
4. Connect to OBS localhost WebSocket and press Install / realign camera renderer.
5. Confirm OBS Program source and renderer version 3.1.0-rc1.
6. Test Recover Camera while idle. It should show the camera and remove transition FX.
7. Test Smoke and Toxic OUT/IN, then Ice IN; record actual OBS Program output.
8. Verify the webcam is hidden after OUT and visible after IN.
Do not use this release live until it passes off-stream tests.
