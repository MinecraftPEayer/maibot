import axios from 'axios';
import { MaiNoteChartData, MaiNoteManifest, MaiNoteSongData } from 'types/main';
import { Difficulty } from './CommonEnums';
import Logger from './logger';

const DifficultyReflect = {
    BASIC: Difficulty.Basic,
    ADVANCED: Difficulty.Advanced,
    EXPERT: Difficulty.Expert,
    MASTER: Difficulty.Master,
    'Re:MASTER': Difficulty.ReMaster,
};

class MaiNoteService {
    private dataURL = 'https://mai-notes.com/data/manifest.json';

    private logger = new Logger('MaiNoteService');
    private songsMap = new Map<string, MaiNoteSongData>();
    private charts: MaiNoteChartData[] = [];

    static getInstance(): MaiNoteService {
        if (!MaiNoteService.instance) {
            MaiNoteService.instance = new MaiNoteService();
        }
        return MaiNoteService.instance;
    }

    private static instance: MaiNoteService;

    private constructor() {
        this.updateData().catch((error) => {
            this.logger.error('Failed to update mai-notes data:', error);
        });
    }

    private async updateData() {
        const response = await axios.get(this.dataURL);

        const data = response.data as MaiNoteManifest;

        this.songsMap.clear();
        for (const song of Object.values(data.songs)) {
            this.songsMap.set(song.title, song);
        }

        this.charts = data.charts;
    }

    public getSongUUIDByTitle(title: string) {
        const song = this.songsMap.get(title);
        return song ? song.id : null;
    }

    public getSongChartUUIDsBySongID(songID: string) {
        const charts = new Map<Difficulty, string>();

        for (const chart of this.charts) {
            if (chart.song_id === songID && chart.has_chart_data) {
                charts.set(DifficultyReflect[chart.difficulty], chart.id);
            }
        }

        return charts;
    }

    public getSongChartUUIDsByTitle(title: string) {
        const songID = this.getSongUUIDByTitle(title);
        if (!songID) return null;
        return this.getSongChartUUIDsBySongID(songID);
    }
}

export default MaiNoteService;
