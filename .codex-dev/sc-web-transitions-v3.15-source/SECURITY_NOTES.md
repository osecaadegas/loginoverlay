# Security notes

Current app only binds HTTP to 127.0.0.1 and restricts Host and Origin headers to localhost/127.0.0.1 on port 18767. UI mutations use an in-memory random token. OBS WebSocket credentials are held in memory, not persisted to settings.

The renderer instance ID is a bearer capability in the local Browser Source URL. This model prevents accidental stale-instance ACKs but is not full inter-process authentication. Locally privileged malware or users with access to OBS scene settings can read the token. A native plugin should use a restricted, authenticated control channel and avoid exposing raw frames over HTTP. Security review of DNS rebinding, local malware, origin behavior in CEF and control endpoint permissions is still required.

The v3 RC executable is unsigned. Use official Windows signing tools and a trusted certificate before commercial release; do not bypass Windows protections.
