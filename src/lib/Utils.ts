import fs from 'fs';
import { B50Data, SongDatabase } from 'types/SongDatabase';
import exception from 'config/exception.json';
import { ChartType, ComboType, Difficulty, SyncType } from './CommonEnums';
import { RatingBaseImageName, RankFactor, ChartTypeName } from './constant/CommonConstant';
import { Emojis } from './constant/emojis';
import { registerFont } from 'canvas';

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

function calculateRating(achievement: number, constant: number) {
    return Math.floor(
        ((achievement > 100.5 ? 100.5 : achievement) / 100) *
            RankFactor[convertAchievementToRank(achievement)] *
            constant *
            100,
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
                    rating = calculateRating(item.achievement, constant),
                    imageURL = song.imageName;
                ((sheet.regionOverrides.intl.version ?? sheet.version ?? song.version) === 'PRiSM PLUS'
                    ? B15Data
                    : B35Data
                ).push({
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
    const diffLabel = database.difficulties.map((diff) => diff.difficulty);

    let data: B50Data[] = [];
    for (const item of scoreData) {
        const song = database.songs.find((song: any) => song.songId === ((exception as any)[item.title] ?? item.title));
        if (song) {
            let sheet = song.sheets.find(
                (sht) =>
                    sht.type === item.type &&
                    (sht.type === ChartType.UTAGE || sht.difficulty === diffLabel[item.difficulty]),
            );
            if (sheet) {
                const constant = sheet.internalLevelValue,
                    rating = calculateRating(item.achievement, constant),
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
    initializeFonts,
    FontStack,
};
