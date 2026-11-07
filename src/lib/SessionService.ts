import crypto from 'crypto';
import fs from 'fs'
import { writeFileAtomic } from './Utils';
import Logger from './logger';

type StoredSession = { id: string, createdAt: number, expiresAt: number };
export type SessionCreated = { token: string, expiresAt: number };
export type SessionInfo = { id: string, expiresAt: number };

const FILE = 'data/api/sessions.json';
const TTL = 1000 * 60 * 60 * 24 * 30; // 30 Days

class SessionService {
    private static instance: SessionService;
    private sessions: Map<string, StoredSession>;

    private logger: Logger = new Logger('SessionService');
    
    private constructor() {
        this.sessions = new Map<string, StoredSession>(Object.entries(this.load()));
        this.purgeExpired();
    }

    private load(): Record<string, StoredSession> {
        if (!fs.existsSync(FILE)) return {};

        try {
            return JSON.parse(fs.readFileSync(FILE, 'utf-8'));
        } catch (error) {
            fs.renameSync(FILE, `${FILE}.broken-${Date.now()}`);
            this.logger.error(`Error parsing session file:`, error);
            return {};
        }
    }

    public static getInstance(): SessionService {
        if (!SessionService.instance) {
            SessionService.instance = new SessionService();
        }
        return SessionService.instance;
    }

    private save(): void {
        writeFileAtomic(FILE, JSON.stringify(Object.fromEntries(this.sessions), null, 2));
    }

    private hash(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    public create(id: string): SessionCreated {
        const token = crypto.randomBytes(32).toString('base64url');
        const now = Date.now();
        this.sessions.set(this.hash(token), { id, createdAt: now, expiresAt: now + TTL });
        this.save();
        return { token, expiresAt: now + TTL };
    }

    public resolve(token: string): SessionInfo | null {
        const s = this.sessions.get(this.hash(token));
        if (!s) return null;
        if (s.expiresAt < Date.now()) {
            this.sessions.delete(this.hash(token));
            this.save();
            return null;
        }
        return { id: s.id, expiresAt: s.expiresAt };
    }

    public revoke(token: string): void {
        if (this.sessions.delete(this.hash(token))) 
            this.save();
    }

    public revokeAll(id: string): void {
        let changed = false;
        for (const [token, session] of this.sessions.entries()) {
            if (session.id === id) {
                this.sessions.delete(token);
                changed = true;
            }
        }
        if (changed) this.save();
    }

    public purgeExpired(): void {
        let changed = false;
        const now = Date.now();
        for (const [token, session] of this.sessions.entries()) {
            if (session.expiresAt < now) {
                this.sessions.delete(token);
                changed = true;
            }
        }
        if (changed) this.save();
    }
}

export default SessionService;