import { Difficulty, ChartType, TitleType } from '../CommonEnums';

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
    SSS_4999: 0.222,
    SSS: 0.216,
    'SS+_9999': 0.214,
    'SS+': 0.211,
    SS: 0.208,
    'S+_9999': 0.206,
    'S+': 0.203,
    S: 0.2,
    AAA_9999: 0.176,
    AAA: 0.168,
    AA: 0.152,
    A: 0.136,
    BBB_9999: 0.128,
    BBB: 0.12,
    BB: 0.112,
    B: 0.096,
    C: 0.08,
    D_40: 0.64,
    D_30: 0.48,
    D_20: 0.32,
    D_10: 0.16,
    D_0: 0,
};

export const TitleTypeName = {
    [TitleType.Normal]: 'Normal',
    [TitleType.Bronze]: 'Bronze',
    [TitleType.Silver]: 'Silver',
    [TitleType.Gold]: 'Gold',
    [TitleType.Rainbow]: 'Rainbow',
};

export const DifficultyColor = {
    [Difficulty.Basic]: ['#45c124', '#daf3d0'],
    [Difficulty.Advanced]: ['#ffba01', '#f3ecae'],
    [Difficulty.Expert]: ['#ff7b7b', '#f8e7e7'],
    [Difficulty.Master]: ['#9f51dc', '#efe7fa'],
    [Difficulty.ReMaster]: ['#dbaaff', '#501e89'],
    [Difficulty.UTAGE]: ['#ff6ffd', '#f8e8f6'],
};
