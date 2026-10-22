# SC Web Transitions — Money CGI Ultra RC1

This is an unsigned Windows x64 standalone EXE built from the included Go source, keeping the existing local-only OBS setup.

1. Back up and completely close v3.9.1, then launch `SC_Web_Transitions_v3.10.0_Money_CGI_Ultra_RC1.exe`.
2. In OBS, use Tools → WebSocket Server Settings to ensure the server is enabled (default port 4455); connect from the SC dashboard.
3. Select your active OBS scene and keyed webcam source, and choose **Install / realign camera renderer**.
4. Choose **Money CGI Ultra**, **Rendering quality: Ultra**, **GPU transition rendering: WebGL2** and save settings.
5. Record OUT and IN **off stream**. Watch the renderer mode, FPS, P95 and camera-source visibility as you test.
6. If Ultra causes render lag, change to **Cinematic** then **Balanced**. Adaptive GPU quality can independently lower the *next* transition. For broken WebGL, select Canvas2D compatibility.
7. To compile yourself: install Go 1.23+, run `GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-H windowsgui -s -w" -o SC_Web_Transitions_v3.10.0_Money_CGI_Ultra_RC1.exe .` from source root.
8. The `SC_Web_Transitions.iss` file is an optional Inno Setup recipe. Compiling it requires the EXE alongside the .iss file. A compiled Windows installer is **not** included in this release.

**Never perform deliberate OBS failure tests while broadcasting live.**
