import express from 'express';
import fs from 'fs';
import { createServer } from 'https';
import config from 'config/config.json';
import Logger from 'src/lib/logger';

export default async () => {
    const logger = new Logger('API');

    const app = express();

    app.use(express.json());

    const noAuthPaths = ['/img/dynamic/noteTable'];

    app.use((req, res, next) => {
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
                if (route.GET) {
                    app.get(`${path.replace(basePath, '')}/${item}`, await route.GET);
                    logger.log(`Registered GET /${path}/${item}`);
                }
                if (route.POST) {
                    app.post(`${path.replace(basePath, '')}/${item}`, await route.POST);
                    logger.log(`Registered POST /${path}/${item}`);
                }
                if (route.PUT) {
                    app.put(`${path.replace(basePath, '')}/${item}`, await route.PUT);
                    logger.log(`Registered PUT /${path}/${item}`);
                }
                if (route.DELETE) {
                    app.delete(`${path.replace(basePath, '')}/${item}`, await route.DELETE);
                    logger.log(`Registered DELETE /${path}/${item}`);
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
