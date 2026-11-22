import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { QURAN_DEPLOY_BASE } from '../../vite/quran-site.ts';

const types: Record<string, string> = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

export async function serveQuranBuild(): Promise<{
  readonly url: string;
  readonly stop: () => Promise<void>;
  readonly setUnavailable: () => void;
}> {
  const output = resolve('dist');
  let unavailable = false;
  const server = createServer((request, response) => {
    if (unavailable) {
      response.writeHead(503, { 'Cache-Control': 'no-store' });
      response.end('Origin unavailable');
      return;
    }
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (!pathname.startsWith(QURAN_DEPLOY_BASE)) {
      response.writeHead(404);
      response.end();
      return;
    }
    const relative = pathname.slice(QURAN_DEPLOY_BASE.length);
    const filename = relative === '' || relative.endsWith('/') ? relative + 'index.html' : relative;
    const target = resolve(output, filename);
    if (!target.startsWith(output + sep)) {
      response.writeHead(403);
      response.end();
      return;
    }
    void readFile(target).then(
      (bytes) => {
        response.writeHead(200, {
          'Content-Type': types[extname(target)] ?? 'application/octet-stream',
          'Cache-Control': 'no-store',
        });
        response.end(bytes);
      },
      () => {
        response.writeHead(404);
        response.end();
      },
    );
  });

  await new Promise<void>((done, fail) => {
    server.once('error', fail);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', fail);
      done();
    });
  });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Unable to determine Quran test server port');
  }
  let stopped = false;
  return {
    url: 'http://127.0.0.1:' + String(address.port) + QURAN_DEPLOY_BASE,
    setUnavailable() {
      unavailable = true;
    },
    async stop() {
      if (stopped) return;
      stopped = true;
      await new Promise<void>((done, fail) => {
        server.close((error) => {
          if (error) fail(error);
          else done();
        });
        server.closeAllConnections();
      });
    },
  };
}
