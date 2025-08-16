import { Request, Response } from 'express';
import fs from 'fs';

export async function GET(req: Request, res: Response) {
    let token = req.query.token as string;

    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }

    let generatedToken = fs.readFileSync('data/api/token.json');
    let tokenData = JSON.parse(generatedToken.toString());

    if (!tokenData.map((item: { id: string; token: string }) => item.token).includes(token)) {
        return res.status(200).json({ available: true });
    } else {
        return res.status(401).json({ available: false, error: 'Token not available.' });
    }
}
