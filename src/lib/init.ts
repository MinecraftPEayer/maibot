import fs from 'fs';

export default () => {
    if (!fs.existsSync('tmp')) fs.mkdirSync('tmp', { recursive: true });
    if (!fs.existsSync('tmp/cache')) fs.mkdirSync('tmp/cache', { recursive: true });
    if (!fs.existsSync('tmp/cache/image')) fs.mkdirSync('tmp/cache/image', { recursive: true });
    if (!fs.existsSync('data')) fs.mkdirSync('data', { recursive: true });
    if (!fs.existsSync('data/api')) fs.mkdirSync('data/api', { recursive: true });
    if (!fs.existsSync('data/user')) fs.mkdirSync('data/user', { recursive: true });

    if (!fs.existsSync('data/api/token.json')) {
        fs.writeFileSync('data/api/token.json', JSON.stringify([], null, 2));
    }
};
