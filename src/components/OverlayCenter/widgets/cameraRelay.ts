export type LocalCameraRelay = { frameUrl: string };

export async function discoverLocalCameraRelay(): Promise<LocalCameraRelay> {
  let relayFound = false;
  for (let port = 17832; port <= 17841; port += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 450);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/camera/status`, {
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
      });
      if (!response.ok) continue;
      relayFound = true;
      const status = await response.json();
      if (status?.active === true) return { frameUrl: `http://127.0.0.1:${port}/camera/frame` };
    } catch {
      // The helper binds a port in this range only while running; keep searching.
    } finally {
      window.clearTimeout(timeout);
    }
  }

  if (relayFound) {
    throw new Error('ScreenSplit Browser is running, but its camera relay is off. Open Camera relay in the app, allow camera access, and retry.');
  }
  throw new Error('ScreenSplit Browser camera relay was not found. Open the app, start Camera relay, allow local network access if OBS asks, then retry.');
}

export async function fetchRelayFrame(frameUrl: string): Promise<ImageBitmap> {
  const response = await fetch(`${frameUrl}?t=${Date.now()}`, {
    cache: 'no-store',
    credentials: 'omit',
  });
  if (!response.ok) throw new Error('The ScreenSplit camera relay stopped sending frames.');
  return createImageBitmap(await response.blob());
}
