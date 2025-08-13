import { Difficulty, ChartType } from '../CommonEnums';

export const ChartTypeName: {
    [key in ChartType | string]: 'STD' | 'DX' | 'UTAGE';
} = {
    [ChartType.STD]: 'STD',
    [ChartType.DX]: 'DX',
    [ChartType.UTAGE]: 'UTAGE',
    STD: 'STD',
    DX: 'DX',
    UTAGE: 'UTAGE',
};

export const RatingBaseImageName = {
    normal: 'normal',
    blue: 'blue',
    green: 'green',
    yellow: 'orange',
    red: 'red',
    purple: 'purple',
    bronze: 'bronze',
    silver: 'silver',
    gold: 'gold',
    platinum: 'platinum',
    rainbow: 'rainbow',
};

export const DifficultyDisplayName = {
    [Difficulty.Basic]: 'BASIC',
    [Difficulty.Advanced]: 'ADVANCED',
    [Difficulty.Expert]: 'EXPERT',
    [Difficulty.Master]: 'MASTER',
    [Difficulty.ReMaster]: 'Re:MASTER',
    [Difficulty.UTAGE]: 'UTAGE',
};

export const DifficultyName = {
    [Difficulty.Basic]: 'basic',
    [Difficulty.Advanced]: 'advanced',
    [Difficulty.Expert]: 'expert',
    [Difficulty.Master]: 'master',
    [Difficulty.ReMaster]: 'remaster',
    [Difficulty.UTAGE]: 'utage',
};

export const RankFactor = {
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
