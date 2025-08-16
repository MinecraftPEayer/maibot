import { Request, Response } from 'express';
import fs from 'fs';

export async function POST(req: Request, res: Response) {
    let body = req.body;

    if (!body || !body.token || !body.id) {
        return res.status(400).json({ error: 'Bad request' });
    }

    let generatedToken = fs.readFileSync('data/api/token.json');
    let tokenData = JSON.parse(generatedToken.toString());

    fs.writeFileSync(
        'data/api/token.json',
        JSON.stringify([...tokenData, { id: body.id, token: body.token }], null, 2),
    );

    return res.status(200).json({ success: true });
}
