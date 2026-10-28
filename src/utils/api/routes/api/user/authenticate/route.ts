import { Request, Response } from 'express';
import fs from 'fs';
import { writeFileAtomic } from 'src/lib/Utils';

export async function POST(req: Request, res: Response) {
    let body = req.body;

    if (!body || !body.token || !body.id) {
        return res.status(400).json({ error: 'Bad request' });
    }

    if (!/^\d+$/.test(body.id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }

    let generatedToken = fs.readFileSync('data/api/token.json');
    let tokenData = JSON.parse(generatedToken.toString());

    writeFileAtomic(
        'data/api/token.json',
        JSON.stringify([...tokenData, { id: body.id, token: body.token }], null, 2),
    );

    return res.status(200).json({ success: true });
}
