// Run the existing Vite app with anonymous, read-only public production content.
// Checkout, trials, review submissions and all private APIs remain local.
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicOrigin = 'https://streamerscenter.com';
const server = await createServer({
  root,
  server: { host: '127.0.0.1', port: Number(process.env.PORT || 3011), strictPort: true, open: false },
  plugins: [{
    name: 'landing-public-content-preview',
    configureServer(devServer) {
      devServer.middlewares.use(async (request, response, next) => {
        if (request.method !== 'GET') return next();
        const url = new URL(request.url, 'http://localhost');
        let publicPath;
        if (url.pathname === '/api/premium' && url.searchParams.get('action') === 'page') {
          publicPath = '/api/premium?action=page';
        } else if (url.pathname === '/api/reviews' && url.searchParams.get('action') === 'public') {
          const offset = Number(url.searchParams.get('offset') || 0);
          if (!Number.isSafeInteger(offset) || offset < 0) return next();
          publicPath = `/api/reviews?action=public&offset=${offset}`;
        } else if (url.pathname === '/api/public-slot-count') {
          publicPath = '/api/public-slot-count';
        } else {
          return next();
        }
        try {
          // Never forward browser cookies, credentials, request bodies or headers.
          const upstream = await fetch(new URL(publicPath, publicOrigin), {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(15000),
          });
          const body = await upstream.json();
          response.writeHead(upstream.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
          response.end(JSON.stringify(body));
        } catch {
          response.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
          response.end(JSON.stringify({ error: 'The public website content is temporarily unavailable.' }));
        }
      });
    },
  }],
});
await server.listen();
server.printUrls();
