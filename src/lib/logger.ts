import { timezone } from 'config/config.json';
import util from 'util';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

interface LoggerOptions {
    prefix?: string;
    minLogLevel?: LogLevel;
}

class Logger {
    private prefix: string;
    private minLogLevel: LogLevel;

    private static readonly colors = {
        reset: '\x1b[0m',
        cyan: '\x1b[36m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        red: '\x1b[31m',
        dimRed: '\x1b[2m\x1b[31m',
        gray: '\x1b[90m',
        dim: '\x1b[2m',
    };

    private static readonly levelColors = {
        [LogLevel.DEBUG]: Logger.colors.cyan,
        [LogLevel.INFO]: Logger.colors.reset,
        [LogLevel.WARN]: Logger.colors.yellow,
        [LogLevel.ERROR]: Logger.colors.red,
    };

    private static readonly levelName = {
        [LogLevel.DEBUG]: 'DEBUG',
        [LogLevel.INFO]: 'INFO',
        [LogLevel.WARN]: 'WARN',
        [LogLevel.ERROR]: 'ERROR',
    };

    constructor(options: string | LoggerOptions) {
        if (typeof options === 'string') options = { prefix: options };

        this.prefix = options.prefix || 'App';
        this.minLogLevel = options.minLogLevel || LogLevel.INFO;
    }

    private parseTimestamp(): string {
        const time = new Date(Date.now() + timezone * 1000 * 60 * 60);
        return `${time.getUTCHours().toString().padStart(2, '0')}:${time.getUTCMinutes().toString().padStart(2, '0')}:${time.getUTCSeconds().toString().padStart(2, '0')}`;
    }

    private isErrorLike(obj: any): boolean {
        return (
            obj instanceof Error ||
            (obj && typeof obj === 'object' && 'message' in obj && 'stack' in obj) ||
            (obj && typeof obj === 'object' && obj.constructor && obj.constructor.name.includes('Error'))
        );
    }

    private separateErrorParts(error: any): { stack: string; properties: string } {
        const fullInspect = util.inspect(error, {
            colors: true,
            depth: null,
        });

        if (!error.stack) {
            return { stack: '', properties: fullInspect };
        }

        const fullLines = fullInspect.split('\n');

        let stackEndIndex = -1;
        for (let i = fullLines.length - 1; i >= 0; i--) {
            const trimmed = fullLines[i].trim();
            if (trimmed.startsWith('at ') || trimmed.startsWith('\x1b')) {
                if (fullLines[i].includes('at ')) {
                    stackEndIndex = i;
                    break;
                }
            }
        }

        if (stackEndIndex === -1) {
            return { stack: fullInspect, properties: '' };
        }

        const stackPart = fullLines.slice(0, stackEndIndex + 1).join('\n');
        const propertiesPart = fullLines.slice(stackEndIndex + 1).join('\n');

        return {
            stack: stackPart,
            properties: propertiesPart.trim(),
        };
    }

    private replaceStackColors(text: string): string {
        const lines = text.split('\n');

        return lines
            .map((line) => {
                const hasGrayOrDim = line.includes('\x1b[90m') || line.includes('\x1b[2m');

                if (hasGrayOrDim) {
                    return (
                        Logger.colors.red +
                        line
                            .replace(/\x1b\[90m/g, Logger.colors.dimRed) // 灰色 -> 紅色
                            .replace(/\)\x1b\[39m/g, ')' + Logger.colors.reset)
                            .replace(/\x1b\[39m/g, Logger.colors.reset + Logger.colors.red)
                    );
                } else {
                    const stripped = line.replace(/\x1b\[\d+m/g, '').replace(/\x1b\[0m/g, Logger.colors.red);

                    if (stripped.trim() === '') {
                        return line;
                    }

                    return Logger.colors.red + stripped + Logger.colors.reset;
                }
            })
            .join('\n');
    }

    private formatError(error: any, colors: boolean): string {
        if (!colors) {
            if (error.stack) {
                return util.inspect(error, { colors: false, depth: null });
            }
            return util.inspect(error, { colors: false });
        }

        const { stack, properties } = this.separateErrorParts(error);

        const coloredStack = stack ? this.replaceStackColors(stack) : '';

        if (properties) {
            return coloredStack + '\n' + properties;
        }

        return coloredStack;
    }

    private formatArg(arg: any, colors: boolean): string {
        if (typeof arg === 'string') {
            return arg;
        }

        if (this.isErrorLike(arg)) {
            return this.formatError(arg, colors);
        }

        return util.inspect(arg, {
            colors: colors,
            depth: null,
            maxArrayLength: null,
            breakLength: 80,
            compact: false,
        });
    }

    private format(level: LogLevel, args: any[]): string {
        const timestamp = this.parseTimestamp();
        const levelName = Logger.levelName[level];
        const color = Logger.levelColors[level];

        const prefix = `${color}[${timestamp}] [${this.prefix}/${levelName}]: `;

        const messages = args.map((arg) => this.formatArg(arg, true));

        const message = messages.join(' ');

        const lines = message.split('\n');

        const formattedLines = lines.map((line) => prefix + line);
        return formattedLines.join('\n');
    }

    private writeLog(level: LogLevel, args: any[]): void {
        if (level < this.minLogLevel) return;

        const formatted = this.format(level, args);

        if (level === LogLevel.ERROR) {
            console.error(formatted);
        } else if (level === LogLevel.WARN) {
            console.warn(formatted);
        } else {
            console.log(formatted);
        }
    }

    debug(...args: any[]): void {
        this.writeLog(LogLevel.DEBUG, args);
    }

    log(...args: any[]): void {
        this.writeLog(LogLevel.INFO, args);
    }

    warn(...args: any[]): void {
        this.writeLog(LogLevel.WARN, args);
    }

    error(...args: any[]): void {
        this.writeLog(LogLevel.ERROR, args);
    }

    setLevel(level: LogLevel): void {
        this.minLogLevel = level;
    }
}

export default Logger;
