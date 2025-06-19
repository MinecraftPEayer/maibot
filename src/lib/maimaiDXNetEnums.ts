enum Difficulty {
    Basic = 0,
    Advanced = 1,
    Expert = 2,
    Master = 3,
    ReMaster = 4,
    UTAGE = 10,
}

enum ScoreType {
    DXScore = 1,
    Achievement = 2,
}

enum Genres {
    ALL = 99,
    POPS = 101,
    VOCALOID = 102,
    TOHO = 103,
    GAME = 104,
    MAIMAI = 105,
    GEKICHU = 106,
}

enum ChartType {
    STD = 0,
    DX = 1,
    UTAGE = 2,
}

enum SyncType {
    None = -1,
    FS = 0,
    FSp = 1,
    FDX = 2,
    FDXp = 3,
}

enum ComboType {
    None = -1,
    FC = 0,
    FCp = 1,
    AP = 2,
    APp = 3,
}

enum ConstantDBLevelName {
    Basic = 'bas',
    Advanced = 'adv',
    Expert = 'exp',
    Master = 'mas',
    ReMaster = 'remas',
}

export {
    Difficulty,
    ScoreType,
    Genres,
    ChartType,
    SyncType,
    ComboType,
    ConstantDBLevelName,
};
