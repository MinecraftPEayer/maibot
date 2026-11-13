import { Difficulty, ComboType, SyncType, ChartType } from 'src/lib/CommonEnums';

type DxrServerId = 'jp' | 'intl' | 'usa' | 'cn';

type DxrSheet = {
    id: string; // dsht_…
    type: 'dx' | 'std' | 'utage' | 'utage2p';
    difficulty: string;
    level: string;
    internalLevelValue: number; // JP version
    noteDesigner?: string;
    noteCounts: Partial<Record<'tap' | 'hold' | 'slide' | 'touch' | 'break' | 'total', number>>;
    serverIds: DxrServerId[];
    serverOverrides?: Partial<Record<DxrServerId, { level?: string; levelValue?: number; version?: string }>>;
    isSpecial: boolean;
    version: string;
    internalId?: number;
    releaseDate?: string;
    multiverInternalLevelValue?: Record<string, number>;
    comment?: string;
};

type DxrSong = {
    id: string; // dsng_…
    category: string;
    title: string;
    artist: string;
    bpm?: number;
    imageName: string;
    version: string;
    isNew: boolean;
    isLocked: boolean;
    searchAcronyms: string[];
    sheets: DxrSheet[];
};

type DxrCatalog = {
    schemaVersion: number;
    updatedAt: string;
    songs: DxrSong[];
    categories: SongDatabaseCategories[];
    versions: SongDatabaseVersions[];
    types: SongDatabaseTypes[];
    difficulties: SongDatabaseDifficulties[];
    servers: { id: DxrServerId; name: string }[];
    aliases: { song_id: string; name: string }[];
};

interface SongDatabase {
    songs: Song[];
    categories: SongDatabaseCategories[];
    versions: SongDatabaseVersions[];
    types: SongDatabaseTypes[];
    difficulties: SongDatabaseDifficulties[];
    regions: SongDatabaseRegions[];
    aliases: { songId: string; name: string }[]; // songId = dsng_…
    updatedAt: string;
}

type SongDatabaseCategories = { category: string };
type SongDatabaseVersions = { version: string; abbr: string; releaseDate?: string; iconUrl?: string };
type SongDatabaseTypes = {
    type: 'dx' | 'std' | 'utage' | 'utage2p';
    name: string;
    abbr: string;
    iconUrl?: string;
    iconHeight?: number;
};
type SongDatabaseDifficulties = { difficulty: string; name: string; color?: string };
type SongDatabaseRegions = { region: 'jp' | 'intl' | 'usa' | 'cn'; name: string };

type Song = {
    id: string; // dsng_…
    songId: string; // specfic usage for display, never duplicate
    title: string; // original title
    artist: string;
    category: string;
    bpm: number | null;
    imageName: string; // hash without extension name
    version: string; // JP song version
    isNew: boolean;
    isLocked: boolean;
    comment: string | null; // utage comment
    searchAcronyms: string[];
    sheets: Sheet[];
};

type ConstantSource = 'multiver' | 'otoge-intl' | 'intl-level' | 'jp';

type Sheet = {
    id: string; // dsht_…
    type: ChartType; // utage and utage2p both use ChartType.UTAGE
    difficulty: Difficulty; // UTAGE use Difficulty.UTAGE
    utageType?: string; // '【協】'
    isBuddy: boolean; // utage2p
    level: string; // serverOverrides.intl.level ?? level
    internalLevelValue: number; // the only constant value
    constantSource: ConstantSource; // for debugging
    jpInternalLevelValue: number; // JP version, only used for reference
    multiverInternalLevelValue?: Record<string, number>; // keep for calculateB50(calculateVersion)
    noteDesigner: string | null;
    noteCounts: NoteCount;
    regions: Region;
    intlVersion: string; // version used in B15/B35 calculation
    version: string; // JP sheet version
    isSpecial: boolean;
    internalId: number | null;
    releaseDate: string | null;
};

type NoteCount = {
    tap: number | null;
    hold: number | null;
    slide: number | null;
    touch: number | null;
    break: number | null;
    total: number | null;
};

type Region = { jp: boolean; intl: boolean; usa: boolean; cn: boolean };

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
    version: string;
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

type CourseData = {
    title: string;
    id: string;
    sections: CourseSection[];
};

type CourseSection = {
    title: string;
    description: string;
    sheets: string[];
    sheetDescriptions?: string[];
};

export {
    DxrCatalog,
    DxrSong,
    DxrSheet,
    DxrServerId,
    ConstantSource,
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
    Version,
    Rank,
    B50Data,
    ScoreData,
    CourseData,
    CourseSection,
};
