import fs from 'fs';
import { writeFileAtomic } from './Utils';
import { execSync } from 'child_process';

function git(args: string): string | null {
    try {
        return execSync(`git ${args}`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch (error) {
        return null;
    }
}

export default async () => {
    if (!fs.existsSync('tmp')) fs.mkdirSync('tmp', { recursive: true });
    if (!fs.existsSync('tmp/cache')) fs.mkdirSync('tmp/cache', { recursive: true });
    if (!fs.existsSync('tmp/cache/image')) fs.mkdirSync('tmp/cache/image', { recursive: true });
    if (!fs.existsSync('data')) fs.mkdirSync('data', { recursive: true });
    if (!fs.existsSync('data/api')) fs.mkdirSync('data/api', { recursive: true });
    if (!fs.existsSync('data/user')) fs.mkdirSync('data/user', { recursive: true });
    if (!fs.existsSync('data/playerData')) fs.mkdirSync('data/playerData', { recursive: true });

    if (!fs.existsSync('data/api/token.json')) {
        writeFileAtomic('data/api/token.json', JSON.stringify([], null, 2));
    }

    const hash = git('rev-parse --short HEAD');
    const branch = git('rev-parse --abbrev-ref HEAD');
    const dirty = git('status --porcelain -uno') ? '-dirty' : '';
    const prefix = process.env.DEVELOPMENT ? 'dev' : 'git';

    process.BuildVersion = hash ? `${prefix}-${branch}-${hash}${dirty}` : prefix === 'dev' ? 'dev' : 'unknown';

    process.logger.log(`Starting bot (${process.BuildVersion})`);
};
