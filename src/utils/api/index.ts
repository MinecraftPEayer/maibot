import express from 'express';
import fs from 'fs';
import { createServer } from 'https';
import config from 'config/config.json';
import Logger from 'src/lib/logger';

export default async () => {
    const logger = new Logger('API');

    const app = express();

    app.use(express.json());

    const noAuthPaths = ['/img/dynamic/noteTable', '/api/status'];

    let dynamicLoadingList: string[] = [];

    app.use(async (req, res, next) => {
        if ((process.env.DEVELOPMENT || config.api.debug_route.enabled) && dynamicLoadingList.includes(req.path)) {
            const routePath = `src/utils/api/routes${req.path}/route.ts`;
            delete require.cache[require.resolve(routePath)];
            let route = await import(`${routePath}?t=${Date.now()}`);

            if (!route[req.method]) {
                res.status(405).json({ error: 'Method Not Allowed' });
                return;
            }

            route[req.method](req, res);
            logger.log(`${req.method} ${req.path} ${res.statusCode} (dynamic)`);
            return;
        }

        if (req.headers['authorization'] !== `Bearer ${process.env.API_KEY}` && !noAuthPaths.includes(req.path)) {
            res.status(403).json({ error: 'Forbidden' });
        } else {
            next();
        }
        logger.log(`${req.method} ${req.path} ${res.statusCode}`);
    });
    const basePath = 'src/utils/api/routes';
    async function loadPath(path: string) {
        let items = fs.readdirSync(path);

        for (const item of items) {
            if (fs.statSync(`${path}/${item}`).isDirectory()) loadPath(`${path}/${item}`);
            if (fs.existsSync(`${path}/${item}/route.ts`)) {
                let route = await import(`${path}/${item}/route.ts`);

                if (route.debug) {
                    // 動態載入，而非啟動時載入
                    dynamicLoadingList.push(`${path.replace(basePath, '')}/${item}`);
                    logger.log(`Loaded debug route: ${path.replace(basePath, '')}/${item}`);
                    return;
                }

                if (route.GET) {
                    app.get(`${path.replace(basePath, '')}/${item}`, await route.GET);
                    logger.log(`Registered GET ${path.replace(basePath, '')}/${item}`);
                }
                if (route.POST) {
                    app.post(`${path.replace(basePath, '')}/${item}`, await route.POST);
                    logger.log(`Registered POST ${path.replace(basePath, '')}/${item}`);
                }
                if (route.PUT) {
                    app.put(`${path.replace(basePath, '')}/${item}`, await route.PUT);
                    logger.log(`Registered PUT ${path.replace(basePath, '')}/${item}`);
                }
                if (route.DELETE) {
                    app.delete(`${path.replace(basePath, '')}/${item}`, await route.DELETE);
                    logger.log(`Registered DELETE ${path.replace(basePath, '')}/${item}`);
                }
            }
        }
    }

    await loadPath('src/utils/api/routes');

    (config.api.https.enabled
        ? createServer(
              {
                  cert: fs.readFileSync(config.api.https.cert_path),
                  key: fs.readFileSync(config.api.https.key_path),
              },
              app,
          )
        : app
    ).listen(config.api.port || 3000, () => {
        logger.log(`API server is running on port ${config.api.port || 3000}`);
    });
};
