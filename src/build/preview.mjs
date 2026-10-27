// SPDX-License-Identifier: Apache-2.0
// Serve the declared public output on loopback with production-like script restrictions.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { loadConfig } from './config.mjs';
import { noSymlinks, contains } from './files.mjs';

export const policy = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ttf':'font/ttf','.woff2':'font/woff2','.xml':'application/xml'};

export async function preview(file, options = {}) {
  const config = await loadConfig(file);
  const port = Number(options.port ?? 4173);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid preview port.');
  const server = createServer(async (request,response) => {
    const headers = {'Content-Security-Policy':policy,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'};
    try {
      if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405,headers); response.end(); return; }
      const pathname = decodeURIComponent(new URL(request.url,'http://localhost').pathname);
      if (pathname === config.paths.basePath && config.paths.docsPath) { response.writeHead(302,{...headers,Location:config.urls.docs}); response.end(); return; }
      if (!pathname.startsWith(config.urls.docs) || /[\\\x00]/.test(pathname)) throw new Error('Not found');
      let name = pathname.slice(config.paths.basePath.length);
      if (!name || name.endsWith('/')) name += 'index.html';
      const target = resolve(config.internal.outputRoot,name);
      if (!contains(config.internal.docsRoot,target)) throw new Error('Not found');
      await noSymlinks(target);
      if (!(await stat(target)).isFile()) throw new Error('Not found');
      const bytes = await readFile(target);
      response.writeHead(200,{...headers,'Content-Type':types[extname(target)] || 'application/octet-stream'});
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch {
      response.writeHead(404,{...headers,'Content-Type':'text/html; charset=utf-8'});
      response.end(request.method === 'HEAD' ? undefined : await readFile(resolve(config.internal.docsRoot,'404.html')).catch(() => 'Page not found.'));
    }
  });
  await new Promise((accept,reject) => { server.once('error',reject); server.listen(port,'127.0.0.1',accept); });
  return {server,url:`http://127.0.0.1:${server.address().port}${config.urls.docs}`};
}
