import axios from 'axios';
import fs from 'fs';
import OpenCC from 'opencc-js';
import {
    ConstantDatabase,
    ConstantSource,
    CourseData,
    DxrCatalog,
    DxrSheet,
    DxrSong,
    Sheet,
    Song,
    SongDatabase,
    SongDatabaseDifficulties,
    SongDatabaseRegions,
    SongDatabaseVersions,
} from 'types/SongDatabase';
import { writeFileAtomic, aliasTitle } from './Utils';
import yaml from 'js-yaml';
import { CurrentVersion } from './constant/CommonConstant';
import Logger from './logger';
import { ChartType, Difficulty } from './CommonEnums';

const RAW_DXR_PATH = 'tmp/dxrating_data.json',
    RAW_OTOGE_PATH = 'tmp/constant.json',
    DXR_ETAG_PATH = 'tmp/dxrating_data.etag',
    OTOGE_ETAG_PATH = 'tmp/constant.etag';

const toSimplified = OpenCC.Converter({ from: 'tw', to: 'cn' });
const normalize = (s: string) => toSimplified(s.normalize('NFKC').toLowerCase());

function loadFromFile(filePath: string): any {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
}

async function conditionalFetch(
    url: string,
    filePath: string,
    eTagPath: string,
    validate: (body: unknown) => void,
): Promise<boolean> {
    const hasRAWFile = fs.existsSync(filePath);
    const etag = hasRAWFile && fs.existsSync(eTagPath) ? fs.readFileSync(eTagPath, 'utf-8').trim() : null;
    const response = await axios.get(url, {
        headers: etag
            ? {
                  'If-None-Match': etag,
              }
            : {},
        validateStatus: (status) => status === 200 || status === 304,
    });

    if (response.status === 304) return false;

    validate(response.data);
    writeFileAtomic(filePath, JSON.stringify(response.data));
    const newEtag = response.headers['etag'] || null;
    if (typeof newEtag === 'string') writeFileAtomic(eTagPath, newEtag);
    else fs.rmSync(eTagPath, { force: true });
    return true;
}

function assertCatalog(body: unknown) {
    const c = body as DxrCatalog;
    if (c?.schemaVersion !== 1 || !Array.isArray(c.songs)) throw new Error('Unexpected DXRating payload');
}

function assertOtoge(body: unknown) {
    if (!Array.isArray(body)) throw new Error('Unexpected otoge-db payload');
}

const TYPE_ID: Record<string, ChartType> = {
    std: ChartType.STD,
    dx: ChartType.DX,
    utage: ChartType.UTAGE,
    utage2p: ChartType.UTAGE,
};
const DIFF_ID: Record<string, Difficulty> = {
    basic: Difficulty.Basic,
    advanced: Difficulty.Advanced,
    expert: Difficulty.Expert,
    master: Difficulty.Master,
    remaster: Difficulty.ReMaster,
};
const OTOGE_DIFF_KEY: Record<string, string> = {
    basic: 'bas',
    advanced: 'adv',
    expert: 'exp',
    master: 'mas',
    remaster: 'remas',
};

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const item of items) {
        const k = key(item);
        map.set(k, [...(map.get(k) ?? []), item]);
    }
    return map;
}

function lookupOtoge(idx: Map<string, ConstantDatabase[]>, song: DxrSong, sheet: DxrSheet): number | undefined {
    if (sheet.type !== 'dx' && sheet.type !== 'std') return undefined;
    const rows = idx.get(song.title) ?? [];
    const row = rows.find((r) => r.catcode === song.category) ?? (rows.length === 1 ? rows[0] : undefined);
    const key =
        `${sheet.type === 'dx' ? 'dx_' : ''}lev_${OTOGE_DIFF_KEY[sheet.difficulty]}_i` as keyof ConstantDatabase;
    const value = parseFloat((row?.[key] as string | undefined) ?? '');
    return Number.isFinite(value) ? value : undefined;
}

function resolveIntlConstant(sheet: DxrSheet, otoge: number | undefined): { value: number; source: ConstantSource } {
    const multiver = sheet.multiverInternalLevelValue?.[CurrentVersion];
    if (multiver !== undefined) return { value: multiver, source: 'multiver' };
    if (otoge !== undefined) return { value: otoge, source: 'otoge-intl' };
    const intlLevelValue = sheet.serverOverrides?.intl?.levelValue;
    if (intlLevelValue !== undefined) return { value: intlLevelValue, source: 'intl-level' };
    return { value: sheet.internalLevelValue, source: 'jp' };
}

function resolveIntlVersion(sheet: DxrSheet, versionOrder: string[]): string {
    const override = sheet.serverOverrides?.intl?.version;
    if (override) return override;
    const current = versionOrder.indexOf(CurrentVersion);
    if (current >= 0 && versionOrder.indexOf(sheet.version) > current) return CurrentVersion;
    return sheet.version;
}

// 1–7. 單張譜面
function buildSheet(
    song: DxrSong,
    sheet: DxrSheet,
    otoge: Map<string, ConstantDatabase[]>,
    versionOrder: string[],
): Sheet | null {
    const isUtage = sheet.type === 'utage' || sheet.type === 'utage2p';
    const type = TYPE_ID[sheet.type];
    const difficulty = isUtage ? Difficulty.UTAGE : DIFF_ID[sheet.difficulty];
    if (type === undefined || difficulty === undefined) return null;

    const { value, source } = resolveIntlConstant(sheet, lookupOtoge(otoge, song, sheet));
    const n = sheet.noteCounts;
    return {
        id: sheet.id,
        type,
        difficulty,
        utageType: isUtage ? sheet.difficulty : undefined,
        isBuddy: sheet.type === 'utage2p',
        level: sheet.serverOverrides?.intl?.level ?? sheet.level,
        internalLevelValue: value,
        constantSource: source,
        jpInternalLevelValue: sheet.internalLevelValue,
        multiverInternalLevelValue: sheet.multiverInternalLevelValue,
        noteDesigner: sheet.noteDesigner ?? null,
        noteCounts: {
            tap: n.tap ?? null,
            hold: n.hold ?? null,
            slide: n.slide ?? null,
            touch: n.touch ?? null,
            break: n.break ?? null,
            total: n.total ?? null,
        },
        regions: {
            jp: sheet.serverIds.includes('jp'),
            intl: sheet.serverIds.includes('intl'),
            usa: sheet.serverIds.includes('usa'),
            cn: sheet.serverIds.includes('cn'),
        },
        intlVersion: resolveIntlVersion(sheet, versionOrder),
        version: sheet.version,
        isSpecial: sheet.isSpecial,
        internalId: sheet.internalId ?? null,
        releaseDate: sheet.releaseDate ?? null,
    };
}

// 9. 重複標題加後綴
function assignSongIds(songs: Song[]) {
    for (const group of groupBy(songs, (s) => s.title).values()) {
        for (const song of group) {
            if (group.length === 1) song.songId = song.title;
            else if (song.sheets.every((s) => s.type === ChartType.UTAGE))
                song.songId = `${song.title} (Lv ${song.sheets[0]?.level})`;
            else song.songId = `${song.title} (${song.category})`;
        }
    }
}

// 主函式
function buildSongDatabase(catalog: DxrCatalog, otogeRows: ConstantDatabase[]): SongDatabase {
    const otoge = groupBy(otogeRows, (r) => aliasTitle(r.title));
    const versionOrder = catalog.versions.map((v) => v.version);

    const songs: Song[] = catalog.songs.map((song) => ({
        id: song.id,
        songId: song.title, // 之後由 assignSongIds 改寫
        title: song.title,
        artist: song.artist,
        category: song.category,
        bpm: song.bpm ?? null,
        imageName: song.imageName,
        version: song.version,
        isNew: song.isNew,
        isLocked: song.isLocked,
        comment: song.sheets.find((s) => s.comment)?.comment ?? null,
        searchAcronyms: song.searchAcronyms ?? [],
        sheets: song.sheets
            .map((sheet) => buildSheet(song, sheet, otoge, versionOrder))
            .filter((s): s is Sheet => s !== null),
    }));
    assignSongIds(songs);

    return {
        updatedAt: catalog.updatedAt,
        songs,
        categories: catalog.categories,
        versions: catalog.versions,
        types: catalog.types,
        difficulties: catalog.difficulties,
        regions: catalog.servers.map((s) => ({ region: s.id, name: s.name })),
        aliases: catalog.aliases.map((a) => ({ songId: a.song_id, name: a.name })),
    };
}

class SongDataFetcher {
    private static instance: SongDataFetcher;
    private logger: Logger = new Logger('SongDataFetcher');

    private data: SongDatabase | null = null;

    private byId: Map<string, Song> = new Map();
    private byTitle: Map<string, Song[]> = new Map();
    private byTitleLower: Map<string, Song[]> = new Map();

    static genres: string[] = [];
    static difficulties: SongDatabaseDifficulties[] = [];
    static versions: SongDatabaseVersions[] = [];
    static regions: SongDatabaseRegions[] = [];

    private searchIndex: Map<string, { title: string; songId: string; keys: string[] }> = new Map();

    private constructor() {
        this.loadFromDisk();
    }

    public static getInstance(): SongDataFetcher {
        if (!SongDataFetcher.instance) {
            SongDataFetcher.instance = new SongDataFetcher();
        }
        return SongDataFetcher.instance;
    }

    static coverUrl(imageName: string): string {
        return `https://shama.dxrating.net/images/cover/v2/${imageName}.jpg`;
    }

    async fetchData(): Promise<void> {
        let dxratingUpdated = false,
            otogeUpdated = false;
        try {
            // DXRating
            dxratingUpdated = await conditionalFetch(
                'https://miruku.dxrating.net/api/v1/dxdata',
                RAW_DXR_PATH,
                DXR_ETAG_PATH,
                assertCatalog,
            );
        } catch (error) {
            this.logger.error('Error fetching song data:', error);
        }

        try {
            // otoge-db
            otogeUpdated = await conditionalFetch(
                'https://raw.githubusercontent.com/zvuc/otoge-db/refs/heads/main/maimai/data/music-ex-intl.json',
                RAW_OTOGE_PATH,
                OTOGE_ETAG_PATH,
                assertOtoge,
            );
        } catch (error) {
            this.logger.error('Error fetching otoge data:', error);
        }

        if (dxratingUpdated || otogeUpdated) this.loadFromDisk();
    }

    loadFromDisk(): void {
        if (!fs.existsSync(RAW_DXR_PATH)) return;

        const catalog = loadFromFile(RAW_DXR_PATH) as DxrCatalog;
        const otogeRows = fs.existsSync(RAW_OTOGE_PATH) ? (loadFromFile(RAW_OTOGE_PATH) as ConstantDatabase[]) : [];

        this.applyData(buildSongDatabase(catalog, otogeRows));
    }

    applyData(db: SongDatabase): void {
        this.data = db;

        this.byId = new Map(db.songs.map((s) => [s.id, s]));
        this.byTitle = groupBy(db.songs, (s) => s.title);
        this.byTitleLower = groupBy(db.songs, (s) => s.title.toLowerCase());

        const aliasesById = groupBy(db.aliases, (a) => a.songId);
        this.searchIndex = new Map(
            db.songs.map((s) => [
                s.id,
                {
                    title: normalize(s.title),
                    songId: normalize(s.songId),
                    keys: [...s.searchAcronyms, ...(aliasesById.get(s.id) ?? []).map((a) => a.name)].map(normalize),
                },
            ]),
        );

        SongDataFetcher.genres = db.categories.map((c) => c.category);
        SongDataFetcher.versions = db.versions;
        SongDataFetcher.difficulties = db.difficulties;
        SongDataFetcher.regions = db.regions;
    }

    async fetchCourseData() {
        try {
            const response = await axios.get('https://dp4p6x0xfi5o9.cloudfront.net/maimai/gallery.yaml');
            if (response.status === 200) {
                writeFileAtomic('tmp/course.yaml', response.data);
                const yamlProcessed = yaml.load(response.data);
                writeFileAtomic('tmp/course.json', JSON.stringify(yamlProcessed));
            }
        } catch (error) {
            console.error('Error fetching course data:', error);
        }
    }

    async getCourseData(): Promise<CourseData[]> {
        let data = fs.readFileSync('tmp/course.json', 'utf-8');
        return JSON.parse(data);
    }

    getData(): SongDatabase {
        if (!this.data) throw new Error('Song data not loaded');
        return this.data;
    }

    search(query: string) {
        let data = this.getData();
        const q = normalize(query.trim());

        const matches: { song: Song; rank: number }[] = [];
        for (let song of data.songs) {
            const idx = this.searchIndex.get(song.id)!;
            let rank: number | null = null;
            if (idx.title === q) rank = 0;
            else if (idx.keys.includes(q)) rank = 1;
            else if (idx.title.includes(q)) rank = 2;
            else if (idx.songId.includes(q)) rank = 3;
            else if (idx.keys.some((k) => k.includes(q))) rank = 4;

            if (rank !== null) matches.push({ song, rank });
        }
        return matches
            .sort((a, b) => a.rank - b.rank)
            .map(({ song }) => {
                return {
                    name: song.songId.length > 100 ? song.songId.slice(0, 97) + '...' : song.songId,
                    value: song.id,
                };
            })
            .slice(0, 25);
    }

    getSongById(id: string): Song {
        this.getData();
        const song = this.byId.get(id);
        if (!song) {
            throw new Error('Song not found');
        }
        return song;
    }

    getSongByTitle(title: string): Song[] {
        this.getData();
        return this.byTitle.get(title) ?? this.byTitleLower.get(title.toLowerCase()) ?? [];
    }

    getSongByName(name: string): Song {
        let song = this.getSongByTitle(name);
        if (song.length === 0) {
            throw new Error('Song not found');
        }
        return song[0];
    }

    getRawData(): SongDatabase {
        let data = this.getData();
        return data;
    }

    findSheet(score: {
        title: string;
        type: ChartType;
        difficulty: Difficulty;
        level?: string;
    }): { song: Song; sheet: Sheet } | null {
        const candidates = this.getSongByTitle(aliasTitle(score.title)).flatMap((song) =>
            song.sheets
                .filter((sheet) => sheet.type === score.type && sheet.difficulty === score.difficulty)
                .map((sheet) => ({ song, sheet })),
        );
        return (
            candidates.find((c) => score.level !== undefined && c.sheet.level === score.level) ?? candidates[0] ?? null
        );
    }
}

export default SongDataFetcher;
