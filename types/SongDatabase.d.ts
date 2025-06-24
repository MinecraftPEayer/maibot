import { Difficulty as DifficultyEnum, ComboType, SyncType } from 'src/lib/maimaiDXNetEnums';

interface SongDatabase {
    songs: Song[];
    categories: { category: string }[];
    versions: {
        version: string;
        abbr: string;
    }[];
    types: {
        type: SheetType;
        name: string;
        abbr: string;
        iconUrl?: string;
        iconHeight?: number;
    };
    difficulties: {
        difficulty: Difficulty;
        name: string;
        color: string;
    }[];
    regions: {
        region: 'jp' | 'intl' | 'cn';
        name: string;
    }[];
    updateTime: string;
    constant: {
        sort: string;
        title: string;
        title_kana: string;
        artist: string;
        catcode: string;
        version: Version;
        bpm: string;
        image_url: string;
        release: string;
        lev_bas?: string;
        lev_adv?: string;
        lev_exp?: string;
        lev_mas?: string;
        lev_remas?: string;
        lev_bas_i?: string;
        lev_bas_notes?: string;
        lev_bas_notes_tap?: string;
        lev_bas_notes_hold?: string;
        lev_bas_notes_slide?: string;
        lev_bas_notes_break?: string;
        lev_adv_i?: string;
        lev_adv_notes?: string;
        lev_adv_notes_tap?: string;
        lev_adv_notes_hold?: string;
        lev_adv_notes_slide?: string;
        lev_adv_notes_break?: string;
        lev_exp_i?: string;
        lev_exp_notes?: string;
        lev_exp_notes_tap?: string;
        lev_exp_notes_hold?: string;
        lev_exp_notes_slide?: string;
        lev_exp_notes_break?: string;
        lev_exp_designer?: string;
        lev_mas_i?: string;
        lev_mas_notes?: string;
        lev_mas_notes_tap?: string;
        lev_mas_notes_hold?: string;
        lev_mas_notes_slide?: string;
        lev_mas_notes_break?: string;
        lev_mas_designer?: string;
        lev_remas_i?: string;
        lev_remas_notes?: string;
        lev_remas_notes_tap?: string;
        lev_remas_notes_hold?: string;
        lev_remas_notes_slide?: string;
        lev_remas_notes_break?: string;
        lev_remas_designer?: string;
        dx_lev_bas?: string;
        dx_lev_adv?: string;
        dx_lev_exp?: string;
        dx_lev_mas?: string;
        dx_lev_remas?: string;
        dx_lev_adv?: string;
        dx_lev_exp?: string;
        dx_lev_mas?: string;
        dx_lev_bas_i?: string;
        dx_lev_bas_notes?: string;
        dx_lev_bas_notes_tap?: string;
        dx_lev_bas_notes_hold?: string;
        dx_lev_bas_notes_slide?: string;
        dx_lev_bas_notes_break?: string;
        dx_lev_adv_i?: string;
        dx_lev_adv_notes?: string;
        dx_lev_adv_notes_tap?: string;
        dx_lev_adv_notes_hold?: string;
        dx_lev_adv_notes_slide?: string;
        dx_lev_adv_notes_break?: string;
        dx_lev_exp_i?: string;
        dx_lev_exp_notes?: string;
        dx_lev_exp_notes_tap?: string;
        dx_lev_exp_notes_hold?: string;
        dx_lev_exp_notes_slide?: string;
        dx_lev_exp_notes_break?: string;
        dx_lev_exp_designer?: string;
        dx_lev_mas_i?: string;
        dx_lev_mas_notes?: string;
        dx_lev_mas_notes_tap?: string;
        dx_lev_mas_notes_hold?: string;
        dx_lev_mas_notes_slide?: string;
        dx_lev_mas_notes_break?: string;
        dx_lev_mas_designer?: string;
        dx_lev_remas_i?: string;
        dx_lev_remas_notes?: string;
        dx_lev_remas_notes_tap?: string;
        dx_lev_remas_notes_hold?: string;
        dx_lev_remas_notes_slide?: string;
        dx_lev_remas_notes_break?: string;
        dx_lev_remas_designer?: string;
        wiki_url: string;
        intl: string;
        date_added: string;
        date_intl_added: string;
    }[];
}

type Song = {
    category: string;
    title: string;
    artist: string;
    bpm: number;
    imageName: string;
    version: string;
    releaseDate: string;
    isNew: boolean;
    isLocked: boolean;
    comment: string | null;
    sheets: Sheet[];
};

type Sheet = {
    type: SheetType;
    difficulty: Difficulty;
    level: string;
    levelValue: number;
    internalLevel: string | null;
    internalLevelValue: number;
    noteDesigner: string;
    noteCounts: NoteCount;
    regions: Region;
    regionOverrides: RegionOverrides;
    isSpecial: boolean;
    version: string;
};

type SheetType = 'dx' | 'std' | 'utage';

type Difficulty = 'basic' | 'advanced' | 'expert' | 'master' | 'remaster' | string;

type NoteCount = {
    tap: number | null;
    hold: number | null;
    slide: number | null;
    touch: number | null;
    break: number | null;
    total: number | null;
};

type Region = {
    jp: boolean;
    intl: boolean;
    cn: boolean;
};

type RegionOverrides = {
    intl: Record<string, unknown>;
};

type Version =
    | '10000'
    | '11000'
    | '12000'
    | '13000'
    | '14000'
    | '15000'
    | '16000'
    | '17000'
    | '18000'
    | '18500'
    | '19000'
    | '19500'
    | '19900'
    | '20000'
    | '20500'
    | '21000'
    | '21500'
    | '22000'
    | '22500'
    | '23000'
    | '23500'
    | '24000'
    | '24500'
    | '25000'
    | '25500';

type B50Data = {
    type: 'STD' | 'DX' | 'UTAGE';
    title: string;
    achievement: number;
    ranking: 'SSS+' | 'SSS' | 'SS+' | 'SS' | 'S+' | 'S' | 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'C' | 'D';
    backgroundImg: string;
    rating: number;
    constant: number;
    level: string;
    difficulty: 0 | 1 | 2 | 3 | 4 | 10;
    comboType: ComboType;
    syncType: SyncType;
};

type ScoreData = {
    title: string;
    type: ChartType;
    difficulty: DifficultyEnum;
    utageKind?: string;
    achievement: number;
    comboType: ComboType;
    syncType: SyncType;
    dxStar?: number;
    dxScore?: number;
};

export {
    SongDatabase,
    Song,
    Sheet,
    SheetType,
    Difficulty,
    NoteCount,
    Region,
    RegionOverrides,
    Version,
    B50Data,
    ScoreData,
};
