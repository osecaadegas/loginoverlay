# StreamersCenter Slot Capture Agent

Local-only Windows capture host used by the MV3 extension and OBS Browser Source fallback. It never sends frames to StreamersCenter, Supabase, or Vercel.

## Build and register

```powershell
dotnet publish .\native\slot-capture-agent\StreamersCenter.SlotCapture.Agent.csproj -c Release
.\native\slot-capture-agent\install-native-host.ps1 -ExtensionId <extension-id>
```

Load `browser-extension/` as an unpacked Chrome/Edge extension, copy its ID, and pass that exact ID to the installer. The installer writes only per-user Chrome/Edge Native Messaging registry keys.

## Implemented transport

- Chrome Native Messaging uses 32-bit little-endian length-prefixed JSON.
- Selection is accepted only while Chrome or Edge is the foreground window.
- Frames are captured from that selected browser window and cropped to the DOM region.
- Multiple output profiles run independently and publish to authenticated loopback-only HTML/WebSocket endpoints.
- OBS can load the copied `http://127.0.0.1:19384/obs/...` URL as a Browser Source.

The current capture backend is the visible-window GDI compatibility backend. It does not capture minimized windows and some accelerated/protected surfaces may return black frames. A Direct3D Windows Graphics Capture backend and native OBS texture-sharing plugin remain required before claiming the four-1080p/30 target or minimized-window support. The dashboard reports this backend explicitly rather than pretending WGC is active.
