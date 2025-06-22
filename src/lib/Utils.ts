import fs from 'fs';
import { B50Data, SongDatabase } from 'types/SongDatabase';
import exception from 'config/exception.json';
import { ChartType, ComboType, Difficulty, SyncType } from './maimaiDXNetEnums';

const chartType: { [key: number]: 'STD' | 'DX' | 'UTAGE' } = {
    0: 'STD',
    1: 'DX',
    2: 'UTAGE',
};

const RankFactor = {
    'SSS+': 0.224,
    SSS: 0.216,
    'SS+': 0.211,
    SS: 0.208,
    'S+': 0.203,
    S: 0.2,
    AAA: 0.168,
    AA: 0.152,
    A: 0.136,
    BBB: 0.12,
    BB: 0.112,
    B: 0.096,
    C: 0.08,
    D: 0.05,
};

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
    let database = JSON.parse(
        fs.readFileSync('tmp/data.json').toString(),
    ) as SongDatabase;
    const diffLabel = database.difficulties.map((diff) => diff.difficulty);

    let B15Data: B50Data[] = [],
        B35Data: B50Data[] = [];
    for (const item of scoreData) {
        const song = database.songs.find(
            (song: any) =>
                song.songId === ((exception as any)[item.title] ?? item.title),
        );
        if (song) {
            let sheet = song.sheets.find(
                (sht) =>
                    sht.type.toUpperCase() === chartType[item.type] &&
                    sht.difficulty === diffLabel[item.difficulty],
            );
            if (sheet) {
                const constant = sheet.internalLevelValue,
                    rating = calculateRating(item.achievement, constant),
                    imageURL = song.imageName;
                ((sheet.regionOverrides.intl.version ??
                    sheet.version ??
                    song.version) === 'PRiSM'
                    ? B15Data
                    : B35Data
                ).push({
                    type: chartType[item.type],
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
        b.rating === a.rating
            ? a.title.localeCompare(b.title)
            : b.rating - a.rating,
    ).slice(0, 15);
    B35Data = B35Data.sort((a, b) =>
        b.rating === a.rating
            ? a.title.localeCompare(b.title)
            : b.rating - a.rating,
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
    let database = JSON.parse(
        fs.readFileSync('tmp/data.json').toString(),
    ) as SongDatabase;
    const diffLabel = database.difficulties.map((diff) => diff.difficulty);

    let data: B50Data[] = [];
    for (const item of scoreData) {
        const song = database.songs.find(
            (song: any) =>
                song.songId === ((exception as any)[item.title] ?? item.title),
        );
        if (song) {
            let sheet = song.sheets.find(
                (sht) =>
                    sht.type.toUpperCase() === chartType[item.type] &&
                    (sht.type === 'utage' ||
                        sht.difficulty === diffLabel[item.difficulty]),
            );
            if (sheet) {
                const constant = sheet.internalLevelValue,
                    rating = calculateRating(item.achievement, constant),
                    imageURL = song.imageName;
                data.push({
                    type: chartType[item.type],
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

export {
    calculateB50,
    chartType,
    calculateScore,
    calculateRating,
    RankFactor,
    convertAchievementToRank,
};
