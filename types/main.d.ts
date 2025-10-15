import 'discord.js';
import Logger from 'src/lib/logger';
import { TitleType } from 'src/lib/CommonEnums';

declare global {
    namespace NodeJS {
        export interface Process {
            BuildVersion: string;
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

type PlayerInfo = {
    name: string;
    avatar: string;
    rating: number;
    title: string;
    titleType: TitleType;
    course: string;
    classRank: string;
};

export { PlayerInfo };
