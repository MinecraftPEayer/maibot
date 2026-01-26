import fs from 'fs';
import util from 'util';
import { B50Data, Sheet, Song, SongDatabase } from 'types/SongDatabase';
import exception from 'config/exception.json';
import { timezone } from 'config/config.json';
import { ChartType, ComboType, Difficulty, SyncType } from './CommonEnums';
import longSongs from 'config/longSong.json';
import { RatingBaseImageName, RankFactor } from './constant/CommonConstant';
import { Emojis } from './constant/emojis';
import { registerFont } from 'canvas';
import SongDataFetcher from './SongDataFetcher';

function convertAchievementToRank(achievement: number) {
    if (achievement >= 100.5) return 'SSS+';
    if (achievement >= 100.0) return 'SSS';
    if (achievement >= 99.5) return 'SS+';
    if (achievement >= 99.0) return 'SS';
    if (achievement >= 98) return 'S+';
    if (achievement >= 97) return 'S';
    if (achievement >= 94) return 'AAA';
    if (achievement >= 90) return 'AA';
    if (achievement >= 80) return 'A';
    if (achievement >= 75) return 'BBB';
    if (achievement >= 70) return 'BB';
    if (achievement >= 60) return 'B';
    if (achievement >= 50) return 'C';
    return 'D';
}

function calculateRating(achievement: number, constant: number, allPerfect: boolean = false): number {
    return (
        Math.floor(
            ((achievement > 100.5 ? 100.5 : achievement) / 100) *
                RankFactor[convertAchievementToRank(achievement)] *
                constant *
                100,
        ) + (allPerfect ? 1 : 0)
    );
}

function convertDXScoreToStar(dxScore: number, fullDXScore: number): number {
    let ratio = dxScore / fullDXScore;
    if (ratio >= 0.97) return 5;
    if (ratio >= 0.95) return 4;
    if (ratio >= 0.93) return 3;
    if (ratio >= 0.9) return 2;
    if (ratio >= 0.85) return 1;
    return 0;
}

function calculateB50(
    scoreData: {
        title: string;
        type: ChartType;
        difficulty: Difficulty;
        achievement: number;
        comboType: ComboType;
        syncType: SyncType;
    }[],
): {
    B15Data: B50Data[];
    B35Data: B50Data[];
} {
    let database = JSON.parse(fs.readFileSync('tmp/data.json').toString()) as SongDatabase;

    let B15Data: B50Data[] = [],
        B35Data: B50Data[] = [];
    for (const item of scoreData) {
        const song = database.songs.find((song: any) => song.songId === ((exception as any)[item.title] ?? item.title));
        if (song) {
            let sheet = song.sheets.find((sht) => sht.type === item.type && sht.difficulty === item.difficulty);
            if (sheet) {
                const constant = sheet.internalLevelValue,
                    rating = calculateRating(item.achievement, constant, item.comboType >= ComboType.AP),
                    imageURL = song.imageName;
                const version = (sheet.regionOverrides.intl.version as string) ?? sheet.version ?? song.version;
                (['PRiSM PLUS', 'CiRCLE'].includes(version) ? B15Data : B35Data).push({
                    type: item.type,
                    title: (exception as any)[item.title] ?? item.title,
                    achievement: item.achievement,
                    ranking: convertAchievementToRank(item.achievement),
                    backgroundImg: imageURL,
                    rating: rating,
                    constant: constant,
                    level: sheet.level,
                    difficulty: item.difficulty,
                    comboType: item.comboType,
                    syncType: item.syncType,
                });
            }
        }
    }

    B15Data = B15Data.sort((a, b) =>
        b.rating === a.rating ? b.achievement - a.achievement : b.rating - a.rating,
    ).slice(0, 15);
    B35Data = B35Data.sort((a, b) =>
        b.rating === a.rating ? b.achievement - a.achievement : b.rating - a.rating,
    ).slice(0, 35);

    return {
        B15Data,
        B35Data,
    };
}

function calculateScore(
    scoreData: {
        title: string;
        type: ChartType;
        difficulty: Difficulty;
        achievement: number;
        comboType: ComboType;
        syncType: SyncType;
    }[],
): {
    data: B50Data[];
} {
    let database = JSON.parse(fs.readFileSync('tmp/data.json').toString()) as SongDatabase;

    let data: B50Data[] = [];
    for (const item of scoreData) {
        const song = database.songs.find((song: any) => song.songId === ((exception as any)[item.title] ?? item.title));

        if (song) {
            let sheet = song.sheets.find(
                (sht) => sht.type === item.type && (sht.type === ChartType.UTAGE || sht.difficulty === item.difficulty),
            );
            if (sheet) {
                const constant = sheet.internalLevelValue,
                    rating = calculateRating(item.achievement, constant, item.comboType >= ComboType.AP),
                    imageURL = song.imageName;
                data.push({
                    type: item.type,
                    title: (exception as any)[item.title] ?? item.title,
                    achievement: item.achievement,
                    ranking: convertAchievementToRank(item.achievement),
                    backgroundImg: imageURL,
                    rating: rating,
                    constant: constant,
                    level: sheet.level,
                    difficulty: item.difficulty,
                    comboType: item.comboType,
                    syncType: item.syncType,
                });
            }
        }
    }

    return {
        data,
    };
}

function getRatingBaseImage(rating: number) {
    if (rating >= 15000) return RatingBaseImageName.rainbow;
    if (rating >= 14500) return RatingBaseImageName.platinum;
    if (rating >= 14000) return RatingBaseImageName.gold;
    if (rating >= 13000) return RatingBaseImageName.silver;
    if (rating >= 12000) return RatingBaseImageName.bronze;
    if (rating >= 10000) return RatingBaseImageName.purple;
    if (rating >= 7000) return RatingBaseImageName.red;
    if (rating >= 4000) return RatingBaseImageName.yellow;
    if (rating >= 2000) return RatingBaseImageName.green;
    if (rating >= 1000) return RatingBaseImageName.blue;
    return RatingBaseImageName.normal;
}

function getDifficultyIdFromName(name: string): Difficulty | string {
    switch (name.toLowerCase()) {
        case 'basic':
            return Difficulty.Basic;
        case 'advanced':
            return Difficulty.Advanced;
        case 'expert':
            return Difficulty.Expert;
        case 'master':
            return Difficulty.Master;
        case 'remaster':
            return Difficulty.ReMaster;
        case 'utage':
            return Difficulty.UTAGE;
        default:
            return name;
    }
}

function getChartTypeFromName(name: string): ChartType {
    switch (name.toLowerCase()) {
        case 'std':
            return ChartType.STD;
        case 'dx':
            return ChartType.DX;
        case 'utage':
            return ChartType.UTAGE;
        default:
            throw new Error(`Unknown chart type name: ${name}`);
    }
}

function getDifficultyEmoji(difficulty: Difficulty | string): string {
    switch (difficulty) {
        case Difficulty.Basic:
            return Emojis.Basic;
        case Difficulty.Advanced:
            return Emojis.Advanced;
        case Difficulty.Expert:
            return Emojis.Expert;
        case Difficulty.Master:
            return Emojis.Master;
        case Difficulty.ReMaster:
            return Emojis.ReMaster;
        case Difficulty.UTAGE:
            return Emojis.Utage;
        default:
            return difficulty;
    }
}

function initializeFonts() {
    const fontPath = 'assets/fonts';

    registerFont(`${fontPath}/SEGAMaruGothicDB.ttf`, {
        family: 'SEGAMaruGothic',
        weight: 'normal',
    });

    registerFont(`${fontPath}/NotoSans-Regular.ttf`, {
        family: 'Noto Sans',
        weight: 'normal',
    });

    registerFont(`${fontPath}/NotoSans-Bold.ttf`, {
        family: 'Noto Sans',
        weight: 'bold',
    });

    registerFont(`${fontPath}/NotoSansJP-Regular.ttf`, {
        family: 'Noto Sans JP',
        weight: 'normal',
    });

    registerFont(`${fontPath}/NotoSansJP-Bold.ttf`, {
        family: 'Noto Sans JP',
        weight: 'bold',
    });
}

function writeErrorToFile(error: any) {
    const time = new Date(Date.now() + timezone * 1000 * 60 * 60);
    let nowTime = [
        time.getUTCFullYear(),
        (time.getUTCMonth() + 1).toString().padStart(2, '0'),
        time.getUTCDate().toString().padStart(2, '0'),
        time.getUTCHours().toString().padStart(2, '0'),
        time.getUTCMinutes().toString().padStart(2, '0'),
        time.getUTCSeconds().toString().padStart(2, '0'),
    ];
    const fileName = `tmp/error_${nowTime[0]}${nowTime[1]}${nowTime[2]}_${nowTime[3]}${nowTime[4]}${nowTime[5]}.log`;
    const errorContent = `${util.inspect(error, { depth: null })}`;

    fs.writeFileSync(fileName, errorContent);
}

const Difficulties = SongDataFetcher.difficulties;
const Genres = SongDataFetcher.genres;
const Versions = SongDataFetcher.versions;
const Regions = SongDataFetcher.regions;
const Levels = [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '7+',
    '8',
    '8+',
    '9',
    '9+',
    '10',
    '10+',
    '11',
    '11+',
    '12',
    '12+',
    '13',
    '13+',
    '14',
    '14+',
    '15',
];

const DifficultyName = {
    [Difficulty.Basic]: 'basic',
    [Difficulty.Advanced]: 'advanced',
    [Difficulty.Expert]: 'expert',
    [Difficulty.Master]: 'master',
    [Difficulty.ReMaster]: 'remaster',
    [Difficulty.UTAGE]: 'utage',
};

function randomSong(
    count: number,
    filter: {
        maxLevel?: string;
        minLevel?: string;
        version?: string;
        region?: string;
        genre?: string;
        difficulty?: string | string[];
        type?: string;
        minConstant?: number;
        maxConstant?: number;
        allowLong?: boolean;
    },
    canDuplicate: boolean = false,
) {
    const rawData = SongDataFetcher.getInstance().getRawData();
    const filtered: { song: Song; sheet: Sheet }[] = [];
    rawData.songs.forEach((song) => {
        if (filter.genre && song.category !== filter.genre) return;
        if (filter.version && song.version !== filter.version) return;

        song.sheets.forEach((sheet) => {
            if (filter.type && sheet.type !== getChartTypeFromName(filter.type)) return;

            if (
                typeof filter.difficulty === 'string' &&
                filter.difficulty &&
                sheet.difficulty !== getDifficultyIdFromName(filter.difficulty)
            )
                return;
            if (
                typeof filter.difficulty === 'object' &&
                filter.difficulty.length > 0 &&
                !filter.difficulty.includes(DifficultyName[sheet.difficulty])
            )
                return;

            if (filter.maxLevel && Levels.indexOf(sheet.level) > Levels.indexOf(filter.maxLevel)) return;
            if (filter.minLevel && Levels.indexOf(sheet.level) < Levels.indexOf(filter.minLevel)) return;

            if (filter.minConstant && sheet.internalLevelValue < filter.minConstant) return;
            if (filter.maxConstant && sheet.internalLevelValue > filter.maxConstant) return;

            if (!filter.allowLong && longSongs.includes(song.title)) return;

            filtered.push({ song, sheet });
        });
    });

    const randomMax = filtered.length;
    const randomizedIndex: number[] = [];
    for (let i = 0; i < Math.min(count, randomMax); i++) {
        let rand = Math.floor(Math.random() * randomMax);
        while (!canDuplicate && randomizedIndex.includes(rand)) {
            rand = Math.floor(Math.random() * randomMax);
        }
        randomizedIndex.push(rand);
    }
    const randomized = randomizedIndex.map((index) => filtered[index]);
    return { filtered, randomized };
}

const FontStack = '"SEGAMaruGothic", "Noto Sans", "Noto Sans JP", sans-serif';

export {
    calculateB50,
    calculateScore,
    calculateRating,
    getDifficultyEmoji,
    convertAchievementToRank,
    convertDXScoreToStar,
    getRatingBaseImage,
    getDifficultyIdFromName,
    getChartTypeFromName,
    randomSong,
    initializeFonts,
    writeErrorToFile,
    FontStack,
};
