import express from 'express';
import fs from 'fs';
import { createServer } from 'https';
import config from 'config/config.json';
import { createCanvas, loadImage } from 'canvas';
import { initializeFonts, FontStack } from 'src/lib/Utils';

export default () => {
    const app = express();

    app.use(express.json());

    const noAuthPaths = ['/img/dynamic/noteTable'];

    app.use((req, res, next) => {
        if (req.headers['authorization'] !== `Bearer ${process.env.API_KEY}` && !noAuthPaths.includes(req.path)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    });

    app.get('/api/user/check', (req, res) => {
        let token = req.query.token as string;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        console.log('GET /api/user/check');

        let generatedToken = fs.readFileSync('data/api/token.json');
        let tokenData = JSON.parse(generatedToken.toString());

        if (!tokenData.map((item: { id: string; token: string }) => item.token).includes(token)) {
            return res.status(200).json({ available: true });
        } else {
            return res.status(401).json({ available: false, error: 'Token not available.' });
        }
    });

    app.post('/api/user/authenticate', (req, res) => {
        let body = req.body;

        if (!body || !body.token || !body.id) {
            return res.status(400).json({ error: 'Bad request' });
        }
        console.log('POST /api/user/authenticate');

        let generatedToken = fs.readFileSync('data/api/token.json');
        let tokenData = JSON.parse(generatedToken.toString());

        fs.writeFileSync(
            'data/api/token.json',
            JSON.stringify([...tokenData, { id: body.id, token: body.token }], null, 2),
        );

        return res.status(200).json({ success: true });
    });

    app.post('/api/user/data-upload', (req, res) => {
        let body = req.body;

        if (!body || !body.userData || !body.userData.token || !body.data) {
            return res.status(400).json({ error: 'Bad request' });
        }

        console.log('POST /api/user/data-upload');

        let generatedToken = fs.readFileSync('data/api/token.json');
        let tokenData = JSON.parse(generatedToken.toString());

        let id = body.userData.id;

        let date = new Date();
        date.setHours(date.getHours() + 8);
        let formattedDate =
            date.getFullYear() +
            '-' +
            String(date.getMonth() + 1).padStart(2, '0') +
            '-' +
            String(date.getDate()).padStart(2, '0') +
            '_' +
            String(date.getHours()).padStart(2, '0') +
            '-' +
            String(date.getMinutes()).padStart(2, '0') +
            '-' +
            String(date.getSeconds()).padStart(2, '0');

        if (
            tokenData.some(
                (item: { id: string; token: string }) => item.id === id && item.token === body.userData.token,
            )
        ) {
            if (!fs.existsSync(`data/user/${id}`)) fs.mkdirSync(`data/user/${id}`);
            fs.writeFileSync(`data/user/${id}/${formattedDate}.json`, JSON.stringify(body.data, null, 2));
            fs.writeFileSync(`data/user/${id}/latest.json`, JSON.stringify(body.data, null, 2));
            fs.writeFileSync(
                `data/api/token.json`,
                JSON.stringify(
                    tokenData.filter((item: { id: string; token: string }) => item.id !== id),
                    null,
                    2,
                ),
            );

            if (!fs.existsSync(`data/user/${id}/detailed.json`))
                fs.writeFileSync(`data/user/${id}/detailed.json`, '[]');
            fs.readFileSync(`data/user/${id}/detailed.json`, 'utf8');
            let detailedData = JSON.parse(fs.readFileSync(`data/user/${id}/detailed.json`, 'utf8'));

            body.data.recentCreditDetail.forEach((item: any) => {
                if (
                    !detailedData.some(
                        (d: any) =>
                            item.time === d.time &&
                            item.songName === d.songName &&
                            item.difficulty === d.difficulty &&
                            item.track === d.track,
                    )
                )
                    detailedData.unshift(item);
            });

            fs.writeFileSync(`data/user/${id}/detailed.json`, JSON.stringify(detailedData, null, 2));

            return res.status(200).json({ success: true });
        }
    });

    app.get('/img/dynamic/noteTable', async (req, res) => {
        const noteType = ['tap', 'hold', 'slide', 'touch', 'break'];
        const judgementColor = ['#D49100', '#FF9D03', '#F75EA3', '#2FCA4C', '#868686'];
        const { tap, hold, slide, touch, break: breakNote } = req.query;

        if (!tap || !hold || !slide || !touch || !breakNote) {
            res.status(400).send({
                code: 400,
                message: 'Bad request',
            });
        }

        const notes = [tap, hold, slide, touch, breakNote].map((note) => String(note));
        if (notes.some((note) => note.split(',').length !== 5)) {
            res.status(400).send({
                code: 400,
                message: 'Bad request',
            });
        }

        initializeFonts();

        const totalData: {
            [key: string]: string[];
        } = {};
        notes.forEach((note, index) => {
            totalData[noteType[index]] = note.split(',');
        });

        const canvas = createCanvas(695, 253);
        const ctx = canvas.getContext('2d');

        let tableImg = await loadImage('assets/NoteTable.png');
        ctx.drawImage(tableImg, 0, 0, 695, 253);

        /**
         * 起始點 164+47=211 / 66+25=91
         * X offset = 66+47=113
         * Y offset = 12+25=37
         */

        ctx.textAlign = 'right';
        ctx.font = `24px ${FontStack}`;
        for (let i = 0; i < 5; i++) {
            Object.values(totalData).forEach((note, index) => {
                ctx.fillStyle = judgementColor[i];
                ctx.fillText(note[i], 211 + i * 113, 88 + index * 37);
            });
        }

        res.header('Content-Type', 'image/png').send(canvas.toBuffer('image/png'));
    });

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
        console.log(`API server is running on port ${config.api.port || 3000}`);
    });
};
