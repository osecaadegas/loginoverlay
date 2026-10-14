# StreamersCenter Slot Capture

## Estado atual

This delivery contains the real selection, persistence, local capture and loopback Browser Source foundation. It does not upload captured pixels. The current Windows backend captures a visible Chrome/Edge window through the GDI compatibility path and crops it to the selected DOM region.

Windows Graphics Capture, GPU mask/filter execution, shared D3D textures and the native OBS plugin are not included in this milestone. Therefore minimized windows, protected content, four simultaneous 1080p30 outputs and native zero-copy OBS transport are not claimed as supported.

## Instalar o agente Windows

1. Install the .NET 8 SDK on the streaming PC.
2. From the repository root, publish the local agent:

   ```powershell
   dotnet publish .\native\slot-capture-agent\StreamersCenter.SlotCapture.Agent.csproj -c Release
   ```

3. In Chrome or Edge, open the extensions page, enable developer mode, and load `browser-extension/` as an unpacked extension.
4. Copy the extension ID.
5. Register the published executable for the current Windows user:

   ```powershell
   .\native\slot-capture-agent\install-native-host.ps1 -ExtensionId <extension-id>
   ```

6. In StreamersCenter, open **Apps → Slot Detector**, create a pairing code, and enter it in the extension options.
7. Open **Apps → Slot Capture** and create a capture profile.

## Selecionar um jogo

1. Open the casino in Chrome or Edge and launch the slot.
2. Open the extension and press **Selecionar slot**.
3. If this is a new casino domain, grant access only to that domain.
4. Hover the highlighted iframe, canvas or game container and click it. Press Escape to cancel.
5. Return to `/slot-capture` and press **Associar seleção mais recente**.

The extension tracks element resizing, scrolling, visibility, DOM removal and tab closure. If a selected element disappears, the local source is marked disconnected instead of silently switching to another element.

## Adicionar ao OBS

1. Keep Chrome/Edge and the StreamersCenter agent running.
2. In the capture's **Saída** tab, copy the local OBS URL.
3. Add an OBS Browser Source and paste that URL.
4. Set its width and height to the capture profile dimensions and enable browser-source refresh when the scene becomes active only if needed.

The URL contains an ephemeral local token and is served only from `127.0.0.1`. Do not publish or share it. Reloading the agent creates a new token, so copy the URL again after an agent restart.

## Privacidade e limitações

- Supabase stores profiles, normalized masks, filter settings and output identifiers. It never stores captured frames.
- Full iframe URLs, query strings, authentication tokens and casino session identifiers are not persisted.
- Cross-origin iframe contents are not inspected; only the iframe boundary can be selected.
- The capture requires the browser window to remain visible with the compatibility backend.
- Hardware-accelerated or protected surfaces may return a black frame.
- Test each casino only where capture is authorized and permitted by its terms.
