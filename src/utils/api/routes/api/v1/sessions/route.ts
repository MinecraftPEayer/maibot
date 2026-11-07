import { Request, Response } from "express";
import MaimaiDXNetFetcher from "src/lib/maimaiDXNetFetcher";
import SessionService from "src/lib/SessionService";
import { ErrorCode } from "src/utils/api/errors";

const DISCORD_ID_REGEX = /^\d{17,19}$/;

function readToken(req: Request): string {
    const token = req.headers['x-session-token'];
    return typeof token === 'string' && token.length > 0 ? token : '';
}

export function GET(req: Request, res: Response) {
    const sessionInstance = SessionService.getInstance();
    const token = readToken(req);
    if (!token) return res.status(400).json({ error: ErrorCode.MissingToken });

    const session = sessionInstance.resolve(token);
    if (!session) return res.status(401).json({ error: ErrorCode.InvalidToken });

    return res.status(200).json(session);
}

export function POST(req: Request, res: Response) {
    const body = req.body;
    if (!body || typeof body !== 'object') return res.status(400).json({ error: ErrorCode.InvalidBody });

    const { id } = body;
    if (typeof id !== 'string' || !DISCORD_ID_REGEX.test(id)) return res.status(400).json({ error: ErrorCode.InvalidDiscordId });

    if (!MaimaiDXNetFetcher.getInstance().getFriendCodeByDiscordId(id)) {
        return res.status(404).json({ error: ErrorCode.NotLinked });    
    }

    const session = SessionService.getInstance().create(id);
    return res.status(201).json(session);
}

export function DELETE(req: Request, res: Response) {
    const token = readToken(req);
    if (token) SessionService.getInstance().revoke(token);
    return res.status(204).end()
}