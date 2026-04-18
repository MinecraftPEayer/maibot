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

type MaiNoteSongData = {
    id: string;
    title: string;
    artist: string;
    bpm: string;
    genre: string;
    version: string;
    type: 'deluxe' | 'standard';
    release_date: string;
    gamerch_id: string;
    simai_id: string | null;
    gamerch_scraped_at: string | null;
    simai_scraped_at: string | null;
};

type MaiNoteChartData = {
    id: string;
    song_id: string;
    difficulty: 'BASIC' | 'ADVANCED' | 'EXPERT' | 'MASTER' | 'Re:MASTER';
    level: string;
    internal_level: number;
    version: string;
    release_date: string;
    notes_designer: string | null;
    has_chart_data: boolean;
};

type MaiNoteManifest = {
    generated_at: string;
    songs_count: number;
    charts_count: number;
    songs: Record<string, MaiNoteSongData>;
    charts: MaiNoteChartData[];
};

export { PlayerInfo, MaiNoteSongData, MaiNoteChartData, MaiNoteManifest };
