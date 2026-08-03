import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const debug = process.argv.includes('--debug');
const portArgument = process.argv.find((argument) => argument.startsWith('--port='));
const port = Number(portArgument?.split('=')[1] ?? 8080);
const root = resolve(process.cwd());
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
};

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host ?? `localhost:${port}`}`);
    if (debug && requestUrl.pathname === '/' && !requestUrl.searchParams.has('debug')) {
      response.writeHead(302, { Location: '/?debug=1#/map' });
      response.end();
      return;
    }

    const pathname = decodeURIComponent(requestUrl.pathname);
    let file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(`${root}${sep}`)) {
      respond(response, 403, 'Forbidden');
      return;
    }

    const metadata = await stat(file);
    if (metadata.isDirectory()) file = resolve(file, 'index.html');
    const fileMetadata = await stat(file);
    if (!fileMetadata.isFile()) throw Object.assign(new Error('Not found'), { code: 'ENOENT' });

    response.writeHead(200, {
      'Content-Type': mimeTypes[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': debug ? 'no-store' : 'no-cache',
    });
    if (request.method === 'HEAD') response.end();
    else createReadStream(file).pipe(response);
  } catch (error) {
    respond(response, error.code === 'ENOENT' ? 404 : 500, error.code === 'ENOENT' ? 'Not found' : 'Server error');
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') console.error(`Port ${port} is already in use. Try --port=${port + 1}.`);
  else console.error(error);
  process.exitCode = 1;
});

server.listen(port, () => {
  const url = `http://localhost:${port}/${debug ? '?debug=1#/map' : ''}`;
  console.log(`${debug ? 'Debug arcade' : 'Arcade'} running at ${url}`);
  if (debug) console.log('All eleven games and Inside Backpropagation are unlocked. Journey progress will not advance.');
});

function respond(response, status, message) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(message);
}
