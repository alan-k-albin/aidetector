import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Custom Vite plugin that simulates Vercel Serverless Functions in local development,
 * executing the exact handlers in api/analyze.js and api/analyze/[id].js.
 */
function vercelApiDevPlugin() {
  return {
    name: 'vercel-api-dev-bridge',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // POST /api/analyze
        if (url === '/api/analyze' && req.method === 'POST') {
          try {
            let bodyChunks = [];
            req.on('data', (chunk) => bodyChunks.push(chunk));
            req.on('end', async () => {
              const rawBody = Buffer.concat(bodyChunks).toString();
              let parsedBody = {};
              try {
                parsedBody = JSON.parse(rawBody);
              } catch (e) {
                parsedBody = rawBody;
              }

              const { default: handler } = await import('./api/analyze.js');

              const mockRes = {
                statusCode: 200,
                headers: {},
                setHeader(name, val) {
                  this.headers[name] = val;
                  res.setHeader(name, val);
                },
                status(code) {
                  this.statusCode = code;
                  res.statusCode = code;
                  return this;
                },
                json(data) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                },
                end(data) {
                  res.end(data);
                }
              };

              const mockReq = {
                method: req.method,
                url: req.url,
                headers: req.headers,
                body: parsedBody
              };

              await handler(mockReq, mockRes);
            });
          } catch (err) {
            console.error('Dev API error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        // GET /api/analyze/:id
        if (url.startsWith('/api/analyze/') && req.method === 'GET') {
          try {
            const parts = url.split('?')[0].split('/');
            const id = parts[parts.length - 1];

            const { default: handler } = await import('./api/analyze/[id].js');

            const mockRes = {
              statusCode: 200,
              headers: {},
              setHeader(name, val) {
                this.headers[name] = val;
                res.setHeader(name, val);
              },
              status(code) {
                this.statusCode = code;
                res.statusCode = code;
                return this;
              },
              json(data) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              },
              end(data) {
                res.end(data);
              }
            };

            const mockReq = {
              method: req.method,
              url: req.url,
              headers: req.headers,
              query: { id }
            };

            await handler(mockReq, mockRes);
          } catch (err) {
            console.error('Dev API GET error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        next();
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), vercelApiDevPlugin()],
  server: {
    port: 5173
  }
});
