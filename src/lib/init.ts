import axios from 'axios';
import fs from 'fs';

export default async () => {
    if (!fs.existsSync('tmp')) fs.mkdirSync('tmp', { recursive: true });
    if (!fs.existsSync('tmp/cache')) fs.mkdirSync('tmp/cache', { recursive: true });
    if (!fs.existsSync('tmp/cache/image')) fs.mkdirSync('tmp/cache/image', { recursive: true });
    if (!fs.existsSync('data')) fs.mkdirSync('data', { recursive: true });
    if (!fs.existsSync('data/api')) fs.mkdirSync('data/api', { recursive: true });
    if (!fs.existsSync('data/user')) fs.mkdirSync('data/user', { recursive: true });
    if (!fs.existsSync('data/playerData')) fs.mkdirSync('data/playerData', { recursive: true });

    if (!fs.existsSync('data/api/token.json')) {
        fs.writeFileSync('data/api/token.json', JSON.stringify([], null, 2));
    }
    if (!fs.existsSync('commit_hash.txt')) {
        const { data } = await axios.get('https://api.github.com/repos/MinecraftPEayer/maibot/commits/master');
        fs.writeFileSync('commit_hash.txt', data.sha);
    }

    process.BuildVersion = process.env.DEVELOPMENT
        ? 'dev'
        : `git-master-${fs.readFileSync('commit_hash.txt', 'utf-8').slice(0, 7)}`;

    process.logger.log(`Starting bot (${process.BuildVersion})`);
};
