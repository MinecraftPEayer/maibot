import axios from 'axios';
import fs from 'fs';
import { MaiNoteManifest, MaiNoteSongData } from 'types/main';
import { Difficulty } from './CommonEnums';

const DifficultyReflect = {
    BASIC: Difficulty.Basic,
    ADVANCED: Difficulty.Advanced,
    EXPERT: Difficulty.Expert,
    MASTER: Difficulty.Master,
    'Re:MASTER': Difficulty.ReMaster,
};

class MaiNoteService {
    private dataURL = 'https://mai-notes.com/data/manifest.json';

    private songsMap = new Map<string, MaiNoteSongData>();

    static getInstance(): MaiNoteService {
        if (!MaiNoteService.instance) {
            MaiNoteService.instance = new MaiNoteService();
        }
        return MaiNoteService.instance;
    }

    private static instance: MaiNoteService;

    private constructor() {
        this.updateData();
    }

    private async updateData() {
        const response = await axios.get(this.dataURL);

        if (response.status !== 200) {
            throw new Error(`Failed to fetch data from ${this.dataURL}`);
        }

        const data = response.data as MaiNoteManifest;

        this.songsMap.clear();
        for (const song of Object.values(data.songs)) {
            this.songsMap.set(song.title, song);
        }

        fs.writeFileSync('./tmp/mai-notes_data.json', JSON.stringify(data, null, 2));
    }

    public getSongUUIDByTitle(title: string) {
        const song = this.songsMap.get(title);
        return song ? song.id : null;
    }

    public getSongChartUUIDsBySongID(songID: string) {
        const charts = new Map<Difficulty, string>();

        const data = JSON.parse(fs.readFileSync('./tmp/mai-notes_data.json', 'utf-8')) as MaiNoteManifest;

        for (const chart of data.charts) {
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
