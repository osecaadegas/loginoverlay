# Quick start — v3.2.7

This is a private OBS test candidate. Money and Ice are unchanged.

1. Exit the older app using Quit, and keep its EXE for rollback.
2. Run the v3.2.7 EXE; open OBS Studio with OBS WebSocket enabled on 4455.
3. Select the **Program** scene unless intentionally using Studio Mode Preview.
4. Choose the webcam input directly visible in that scene; click **Install / realign camera renderer** to reload the correct FX Browser Source.
5. Wait for the renderer display to say `3.2.7-organic-flow-rc1`.
6. Select Smoke or Toxic; record OUT, then IN while off-stream. Check the Activity log for camera OFF/ON confirmations and watch the plume leave the frame completely.
7. If the app refuses to turn off the camera, it means the verified FX screenshot did not actually conceal it or OBS rejected the switch. Open the Activity log for the exact reason. Use Recover Camera if necessary.

To roll back: fully quit v3.2.7, start the backed-up previous EXE, click Install / realign to update OBS's Browser Source URL.
