# Ice Shatter Ultra — quick setup

1. Back up your last working SC Web Transitions EXE and existing presets. Close the running copy.
2. Launch the new `SC_Web_Transitions_v3.11.0_Ice_Shatter_Ultra_RC1.exe` on Windows. This standalone EXE retains the prior self-install logic (an unsigned test build may prompt Windows SmartScreen).
3. In OBS, open an off-stream test scene. Select your already chroma-keyed/alpha-removed webcam in the SC application and click **Install / realign camera renderer**.
4. Select **Ice Shatter Ultra**, set `GPU transition rendering engine = WebGL2 3D`, `Rendering quality = Ultra`; save. Try **Cinematic** for a safer streaming performance budget.
5. Record Ice OUT and IN; confirm the Dashboard renderer heartbeat says **Ice Shatter Ultra WebGL2 3D**. The camera should disappear only once the figure is fully frozen and should return before the IN break-away.
6. If the screen turns blank, the app falls back automatically. You can explicitly choose **Canvas2D compatibility**, Save, then reinstall/realign the OBS Browser Source. Use **Recover Camera** if source state is wrong.
7. Do not distribute as a certified broadcast tool until real 1080p60 OBS and repeated-use tests pass.

Included `SC_Ice_Shatter_Ultra_*_Mesa_Synthetic.mp4` files are **synthetic shader demos** and do not represent real OBS video.
