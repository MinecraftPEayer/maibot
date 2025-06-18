import axios from 'axios';
import fs from 'fs';
import { Sheet, Song, SongDatabase } from 'types/SongDatabase';
import { Difficulty } from './maimaiDXNetEnums';
import exception from 'config/exception.json';

const diffText = {
    [Difficulty.Basic]: 'basic',
    [Difficulty.Advanced]: 'advanced',
    [Difficulty.Expert]: 'expert',
    [Difficulty.Master]: 'master',
    [Difficulty.ReMaster]: 'remaster',
    [Difficulty.UTAGE]: 'utage',
};

class SongDataFetcher {
    private static instance: SongDataFetcher;
    private filePath: string;

    private constructor() {
        this.filePath = 'tmp/data.json';
        this.fetchData();
    }

    public static getInstance(): SongDataFetcher {
        if (!SongDataFetcher.instance) {
            SongDataFetcher.instance = new SongDataFetcher();
        }
        return SongDataFetcher.instance;
    }

    private async fetchData(): Promise<void> {
        try {
            const response = await axios.get(
                'https://dp4p6x0xfi5o9.cloudfront.net/maimai/data.json',
            );
            if (response.status === 200) {
                const data = response.data;
                const constantDBResponse = await axios.get(
                    'https://raw.githubusercontent.com/zvuc/otoge-db/refs/heads/master/maimai/data/music-ex-intl.json',
                );
                if (constantDBResponse.status === 200) {
                    const constantData =
                        constantDBResponse.data as SongDatabase['constant'];

                    data.songs.forEach((song: Song) => {
                        song.sheets.forEach((sheet: Sheet) => {
                            let constantSong = constantData.find(
                                (item) =>
                                    ((exception as any)[item.title] ??
                                        item.title) === song.title,
                            );

                            if (sheet.type === 'dx') {
                                switch (sheet.difficulty) {
                                    case diffText[Difficulty.Basic]:
                                        sheet.level =
                                            constantSong?.dx_lev_bas ??
                                            sheet.level;
                                        sheet.internalLevelValue =
                                            parseFloat(
                                                constantSong?.dx_lev_bas_i ??
                                                    constantSong?.dx_lev_bas ??
                                                    '',
                                            ) ?? sheet.internalLevelValue;
                                        break;

                                    case diffText[Difficulty.Advanced]:
                                        sheet.level =
                                            constantSong?.dx_lev_adv ??
                                            sheet.level;
                                        sheet.internalLevelValue =
                                            parseFloat(
                                                constantSong?.dx_lev_adv_i ??
                                                    constantSong?.dx_lev_adv ??
                                                    '',
                                            ) ?? sheet.internalLevelValue;
                                        break;
                                    case diffText[Difficulty.Expert]:
                                        sheet.level =
                                            constantSong?.dx_lev_exp ??
                                            sheet.level;
                                        sheet.internalLevelValue =
                                            parseFloat(
                                                constantSong?.dx_lev_exp_i ??
                                                    constantSong?.dx_lev_exp ??
                                                    '',
                                            ) ?? sheet.internalLevelValue;
                                        break;
                                    case diffText[Difficulty.Master]:
                                        sheet.level =
                                            constantSong?.dx_lev_mas ??
                                            sheet.level;
                                        sheet.internalLevelValue =
                                            parseFloat(
                                                constantSong?.dx_lev_mas_i ??
                                                    constantSong?.dx_lev_mas ??
                                                    '',
                                            ) ?? sheet.internalLevelValue;
                                        break;
                                    case diffText[Difficulty.ReMaster]:
                                        sheet.level =
                                            constantSong?.dx_lev_remas ??
                                            sheet.level;
                                        sheet.internalLevelValue =
                                            parseFloat(
                                                constantSong?.dx_lev_remas_i ??
                                                    constantSong?.dx_lev_remas ??
                                                    '',
                                            ) ?? sheet.internalLevelValue;
                                        break;
                                }
                            } else if (sheet.type === 'std') {
                                switch (sheet.difficulty) {
                                    case diffText[Difficulty.Basic]:
                                        sheet.level =
                                            constantSong?.lev_bas ??
                                            sheet.level;
                                        sheet.internalLevelValue =
                                            parseFloat(
                                                constantSong?.lev_bas_i ??
                                                    constantSong?.lev_bas ??
                                                    '',
                                            ) ?? sheet.internalLevelValue;
                                        break;
                                    case diffText[Difficulty.Advanced]:
                                        sheet.level =
                                            constantSong?.lev_adv ??
                                            sheet.level;
                                        sheet.internalLevelValue =
                                            parseFloat(
                                                constantSong?.lev_adv_i ??
                                                    constantSong?.lev_adv ??
                                                    '',
                                            ) ?? sheet.internalLevelValue;
                                        break;
                                    case diffText[Difficulty.Expert]:
                                        sheet.level =
                                            constantSong?.lev_exp ??
                                            sheet.level;
                                        sheet.internalLevelValue =
                                            parseFloat(
                                                constantSong?.lev_exp_i ??
                                                    constantSong?.lev_exp ??
                                                    '',
                                            ) ?? sheet.internalLevelValue;
                                        break;
                                    case diffText[Difficulty.Master]:
                                        sheet.level =
                                            constantSong?.lev_mas ??
                                            sheet.level;
                                        sheet.internalLevelValue =
                                            parseFloat(
                                                constantSong?.lev_mas_i ??
                                                    constantSong?.lev_mas ??
                                                    '',
                                            ) ?? sheet.internalLevelValue;
                                        break;

                                    case diffText[Difficulty.ReMaster]:
                                        sheet.level =
                                            constantSong?.lev_remas ??
                                            sheet.level;
                                        sheet.internalLevelValue =
                                            parseFloat(
                                                constantSong?.lev_remas_i ??
                                                    constantSong?.lev_remas ??
                                                    '',
                                            ) ?? sheet.internalLevelValue;
                                        break;
                                }
                            }
                        });
                    });
                }
                fs.writeFileSync(this.filePath, JSON.stringify(data));
            }
        } catch (error) {
            console.error('Error fetching song data:', error);
        }
    }

    private getData(): any {
        let data = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(data);
    }

    search(query: string) {
        let data = this.getData();
        return data.songs
            .filter((item: any) =>
                item.title.toLowerCase().includes(query.toLowerCase()),
            )
            .map((item: any) => {
                return {
                    name: item.songId,
                    value: String(data.songs.indexOf(item)),
                };
            })
            .slice(0, 25);
    }

    getSong(index: number) {
        let data = this.getData();
        if (index < 0 || index >= data.songs.length) {
            throw new Error('Index out of bounds');
        }
        return data.songs[index];
    }
}

export default SongDataFetcher;
