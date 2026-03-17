import axios from 'axios';
import fs from 'fs';
import {
    ConstantDatabase,
    CourseData,
    RegionOverrides,
    Sheet,
    Song,
    SongDatabase,
    SongDatabaseCategories,
    SongDatabaseDifficulties,
    SongDatabaseRegions,
    SongDatabaseVersions,
} from 'types/SongDatabase';
import yaml from 'js-yaml';
import { ChartType, Difficulty } from './CommonEnums';
import exception from 'config/exception.json';

type SourceSong = {
    songId: string;
    title: string;
    artist: string;
    bpm: number;
    imageName: string;
    version: string;
    releaseDate: string;
    isNew: boolean;
    isLocked: boolean;
    comment: string | null;
    sheets: SourceSheet[];
    category: string;
};

type SourceSheet = {
    type: 'dx' | 'std' | 'utage';
    difficulty: 'basic' | 'advanced' | 'expert' | 'master' | 'remaster' | string;
    level: string;
    levelValue: number;
    internalLevel: string | null;
    internalLevelValue: number;
    noteCounts: {
        tap: number | null;
        hold: number | null;
        slide: number | null;
        touch: number | null;
        break: number | null;
        total: number | null;
    };
    noteDesigner: string;
    regions: {
        jp: boolean;
        intl: boolean;
        usa: boolean;
        cn: boolean;
    };
    regionOverrides: RegionOverrides;
    isSpecial: boolean;
    version: string;
};

const diffText = {
    [Difficulty.Basic]: 'basic',
    [Difficulty.Advanced]: 'advanced',
    [Difficulty.Expert]: 'expert',
    [Difficulty.Master]: 'master',
    [Difficulty.ReMaster]: 'remaster',
    [Difficulty.UTAGE]: 'utage',
};

const chartTypeId = {
    std: ChartType.STD,
    dx: ChartType.DX,
    utage: ChartType.UTAGE,
};

const diffId = {
    basic: Difficulty.Basic,
    advanced: Difficulty.Advanced,
    expert: Difficulty.Expert,
    master: Difficulty.Master,
    remaster: Difficulty.ReMaster,
    utage: Difficulty.UTAGE,
};

class SongDataFetcher {
    private static instance: SongDataFetcher;
    private filePath: string;

    static genres: string[];
    static difficulties: SongDatabaseDifficulties[];
    static versions: SongDatabaseVersions[];
    static regions: SongDatabaseRegions[];

    private constructor() {
        this.filePath = 'tmp/data.json';
    }

    public static getInstance(): SongDataFetcher {
        if (!SongDataFetcher.instance) {
            SongDataFetcher.instance = new SongDataFetcher();
        }
        return SongDataFetcher.instance;
    }

    async fetchData(): Promise<void> {
        try {
            const response = await axios.get('https://dp4p6x0xfi5o9.cloudfront.net/maimai/data.json');
            if (response.status === 200) {
                const data = response.data;
                const intlConstantDBResponse = await axios.get(
                    'https://raw.githubusercontent.com/zvuc/otoge-db/refs/heads/master/maimai/data/music-ex-intl.json',
                );
                const jpConstantDBResponse = await axios.get(
                    'https://raw.githubusercontent.com/zvuc/otoge-db/refs/heads/master/maimai/data/music-ex.json',
                );

                const outputData: SongDatabase = {
                    ...data,
                };

                if (intlConstantDBResponse.status === 200) {
                    const intlConstantData = intlConstantDBResponse.data as ConstantDatabase[];
                    const jpConstantData = jpConstantDBResponse.data as ConstantDatabase[];

                    outputData.songs = [];

                    data.songs.forEach((song: SourceSong) => {
                        const mapped = song.sheets.map((sheet: SourceSheet) => {
                            let constantSong = intlConstantData.find(
                                (item) => ((exception as any)[item.title] ?? item.title) === song.title,
                            );

                            if (!constantSong) {
                                constantSong = jpConstantData.find(
                                    (item) => ((exception as any)[item.title] ?? item.title) === song.title,
                                );
                            }

                            const type = chartTypeId[sheet.type];

                            let internalLevelValue = sheet.internalLevelValue;

                            let diff;
                            let utageType;
                            if (sheet.type !== 'utage') diff = diffId[sheet.difficulty as keyof typeof diffId];
                            else utageType = sheet.difficulty;
                            if (sheet.type === 'dx') {
                                switch (sheet.difficulty) {
                                    case diffText[Difficulty.Basic]:
                                        sheet.level = constantSong?.dx_lev_bas ?? sheet.level;
                                        sheet.internalLevelValue = constantSong?.dx_lev_bas_i
                                            ? parseFloat(constantSong.dx_lev_bas_i)
                                            : internalLevelValue;
                                        break;

                                    case diffText[Difficulty.Advanced]:
                                        sheet.level = constantSong?.dx_lev_adv ?? sheet.level;
                                        sheet.internalLevelValue = constantSong?.dx_lev_adv_i
                                            ? parseFloat(constantSong.dx_lev_adv_i)
                                            : internalLevelValue;
                                        break;
                                    case diffText[Difficulty.Expert]:
                                        sheet.level = constantSong?.dx_lev_exp ?? sheet.level;
                                        sheet.internalLevelValue = constantSong?.dx_lev_exp_i
                                            ? parseFloat(constantSong.dx_lev_exp_i)
                                            : internalLevelValue;
                                        break;
                                    case diffText[Difficulty.Master]:
                                        sheet.level = constantSong?.dx_lev_mas ?? sheet.level;
                                        sheet.internalLevelValue = constantSong?.dx_lev_mas_i
                                            ? parseFloat(constantSong.dx_lev_mas_i)
                                            : internalLevelValue;
                                        break;
                                    case diffText[Difficulty.ReMaster]:
                                        sheet.level = constantSong?.dx_lev_remas ?? sheet.level;
                                        sheet.internalLevelValue = constantSong?.dx_lev_remas_i
                                            ? parseFloat(constantSong.dx_lev_remas_i)
                                            : internalLevelValue;
                                        break;
                                }
                            } else if (sheet.type === 'std') {
                                switch (sheet.difficulty) {
                                    case diffText[Difficulty.Basic]:
                                        sheet.level = constantSong?.lev_bas ?? sheet.level;
                                        sheet.internalLevelValue = constantSong?.lev_bas_i
                                            ? parseFloat(constantSong.lev_bas_i)
                                            : internalLevelValue;
                                        break;
                                    case diffText[Difficulty.Advanced]:
                                        sheet.level = constantSong?.lev_adv ?? sheet.level;
                                        sheet.internalLevelValue = constantSong?.lev_adv_i
                                            ? parseFloat(constantSong.lev_adv_i)
                                            : internalLevelValue;
                                        break;
                                    case diffText[Difficulty.Expert]:
                                        sheet.level = constantSong?.lev_exp ?? sheet.level;
                                        sheet.internalLevelValue = constantSong?.lev_exp_i
                                            ? parseFloat(constantSong.lev_exp_i)
                                            : internalLevelValue;
                                        break;
                                    case diffText[Difficulty.Master]:
                                        sheet.level = constantSong?.lev_mas ?? sheet.level;
                                        sheet.internalLevelValue = constantSong?.lev_mas_i
                                            ? parseFloat(constantSong.lev_mas_i)
                                            : internalLevelValue;
                                        break;
                                    case diffText[Difficulty.ReMaster]:
                                        sheet.level = constantSong?.lev_remas ?? sheet.level;
                                        sheet.internalLevelValue = constantSong?.lev_remas_i
                                            ? parseFloat(constantSong.lev_remas_i)
                                            : internalLevelValue;
                                        break;
                                }
                            }

                            return {
                                ...sheet,
                                type: type,
                                difficulty: diff ?? Difficulty.Basic,
                                utageType: utageType,
                            };
                        });

                        outputData.songs.push({
                            ...song,
                            sheets: mapped,
                        });
                    });
                }

                SongDataFetcher.genres = outputData.categories.map(
                    (category: { category: string }) => category.category,
                );

                SongDataFetcher.versions = outputData.versions;
                SongDataFetcher.difficulties = outputData.difficulties;
                SongDataFetcher.regions = outputData.regions;

                fs.writeFileSync(this.filePath, JSON.stringify(outputData));
            }
        } catch (error) {
            console.error('Error fetching song data:', error);
        }
    }

    async fetchCourseData() {
        try {
            const response = await axios.get('https://dp4p6x0xfi5o9.cloudfront.net/maimai/gallery.yaml');
            if (response.status === 200) {
                fs.writeFileSync('tmp/course.yaml', response.data);
                const yamlProcessed = yaml.load(response.data);
                fs.writeFileSync('tmp/course.json', JSON.stringify(yamlProcessed));
            }
        } catch (error) {
            console.error('Error fetching course data:', error);
        }
    }

    async getCourseData(): Promise<CourseData[]> {
        let data = fs.readFileSync('tmp/course.json', 'utf-8');
        return JSON.parse(data);
    }

    private getData(): SongDatabase {
        let data = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(data);
    }

    search(query: string) {
        let data = this.getData();
        return data.songs
            .filter((item: any) => item.title.toLowerCase().includes(query.toLowerCase()))
            .map((item) => {
                return {
                    name: item.songId.length > 100 ? item.songId.slice(0, 97) + '...' : item.songId,
                    value: String(data.songs.indexOf(item)),
                };
            })
            .slice(0, 25);
    }

    getSong(index: number): Song {
        let data = this.getData();
        if (index < 0 || index >= data.songs.length) {
            throw new Error('Index out of bounds');
        }
        return data.songs[index];
    }

    getSongByName(name: string): Song {
        let data = this.getData();
        let song = data.songs.find((item: any) => item.title.toLowerCase() === name.toLowerCase());
        if (!song) {
            throw new Error('Song not found');
        }
        return song;
    }

    getRawData(): SongDatabase {
        let data = this.getData();
        return data;
    }
}

export default SongDataFetcher;
