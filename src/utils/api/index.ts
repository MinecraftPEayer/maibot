import express from 'express';
import fs from 'fs';

export default () => {
    const app = express();

    app.use(express.json());

    app.use((req, res, next) => {
        if (req.headers['authorization'] !== `Bearer ${process.env.API_KEY}`) {
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

    app.listen(parseInt(process.env.API_PORT || '3000'), () => {
        console.log(`API server is running on port ${process.env.API_PORT || '3000'}`);
    });
};
