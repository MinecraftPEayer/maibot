import { timezone } from 'config/config.json';

class Logger {
    constructor(private prefix: any) {
        this.prefix = prefix;
    }

    private parseTime() {
        let time = new Date(Date.now() + timezone * 60 * 60 * 1000);
        return `${String(time.getUTCHours()).padStart(2, '0')}:${String(time.getUTCMinutes()).padStart(2, '0')}:${String(time.getUTCSeconds()).padStart(2, '0')}`;
    }

    log(...args: any) {
        console.log(`[${this.parseTime()}] [${this.prefix}/INFO]:`, ...args);
    }

    error(...args: any) {
        console.error(`\x1b[31m[${this.parseTime()}] [${this.prefix}/ERROR]:\x1b[0m`, ...args);
    }
}

export default Logger;
