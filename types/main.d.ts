import 'discord.js';
import Logger from 'src/lib/logger';

declare global {
    namespace NodeJS {
        export interface Process {
            logger: Logger;
        }
    }
}

declare module 'discord.js' {
    export interface Client {
        commands: Map<string, any>;
        logger: Logger;
    }
}
