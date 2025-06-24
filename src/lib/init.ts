import fs from 'fs';

export default () => {
    if (!fs.existsSync('tmp')) fs.mkdirSync('tmp', { recursive: true });
    if (!fs.existsSync('tmp/cache')) fs.mkdirSync('tmp/cache', { recursive: true });
    if (!fs.existsSync('tmp/cache/image')) fs.mkdirSync('tmp/cache/image', { recursive: true });
};
