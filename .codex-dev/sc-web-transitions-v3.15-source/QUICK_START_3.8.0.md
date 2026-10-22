# SC Web Transitions v3.8.0 Premium VFX RC1

1. Close all previous SC Web Transitions processes. Keep the old EXE available for rollback.
2. Run `SC_Web_Transitions_v3.8.0_Premium_VFX_RC1.exe` on Windows 10/11.
3. Start OBS and connect the application to OBS WebSocket v5 on the configured port (typically 4455).
4. Install / realign the OBS browser renderer over the chroma-keyed camera.
5. Select **Crystal Growth Ultra**. In expansion settings, choose **WebGL2 3D + authored VFX assets (experimental)** and save.
6. Run a local recording, first **OUT** then **IN**. Watch that the camera hides only once the subject is covered and fully reappears at IN completion.
7. Also test **Petal Bloom** and **Shadow Swarm**. Their particles now use curved authored meshes under WebGL2.
8. If WebGL2 is unavailable or unstable, select **Canvas2D compatibility**. Use **Recover Camera** if an OBS source is stuck.
9. Compare the local result against the protected Money/Ice effects and send video evidence for further material and animation improvements.

This is a private test candidate, not a production-certified, fully redesigned VFX release. No native OBS GPU integration or live depth tracking is claimed.
