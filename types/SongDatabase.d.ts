import { Difficulty, ComboType, SyncType, ChartType } from 'src/lib/CommonEnums';

interface SongDatabase {
    songs: Song[];
    categories: SongDatabaseCategories[];
    versions: SongDatabaseVersions[];
    types: SongDatabaseTypes[];
    difficulties: SongDatabaseDifficulties[];
    regions: SongDatabaseRegions[];
    updateTime: string;
}

type SongDatabaseCategories = {
    category: string;
};

type SongDatabaseVersions = {
    version: string;
    abbr: string;
    iconUrl?: string;
};

type SongDatabaseTypes = {
    type: SheetType;
    name: string;
    abbr: string;
    iconUrl?: string;
    iconHeight?: number;
};

type SongDatabaseDifficulties = {
    difficulty: string;
    name: string;
    color: string;
};

type SongDatabaseRegions = {
    region: 'jp' | 'intl' | 'usa' | 'cn';
    name: string;
};

type ConstantDatabase = {
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
};

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
    type: ChartType;
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
    utageType?: string;
};

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
    usa: boolean;
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

type Rank = 'SSS+' | 'SSS' | 'SS+' | 'SS' | 'S+' | 'S' | 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'C' | 'D';

type B50Data = {
    type: ChartType;
    title: string;
    achievement: number;
    ranking: Rank;
    backgroundImg: string;
    rating: number;
    constant: number;
    level: string;
    difficulty: Difficulty;
    comboType: ComboType;
    syncType: SyncType;
};

type ScoreData = {
    title: string;
    type: ChartType;
    difficulty: Difficulty;
    utageKind?: string;
    achievement: number;
    comboType: ComboType;
    syncType: SyncType;
    dxStar?: number;
    dxScore?: number;
};

export {
    SongDatabase,
    SongDatabaseCategories,
    SongDatabaseVersions,
    SongDatabaseTypes,
    SongDatabaseDifficulties,
    SongDatabaseRegions,
    ConstantDatabase,
    Song,
    Sheet,
    Difficulty,
    NoteCount,
    Region,
    RegionOverrides,
    Version,
    Rank,
    B50Data,
    ScoreData,
};
