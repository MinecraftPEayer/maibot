import * as cheerio from 'cheerio';
import fs from 'fs';
import axios, { AxiosInstance } from 'axios';
import { ChartType, ComboType, Difficulty, Genres, ScoreType, SyncType, TitleType } from './CommonEnums';
import { DifficultyDisplayName, DifficultyName } from './constant/CommonConstant';
import Logger from './logger';
import { writeErrorToFile, writeFileAtomic } from './Utils';
import { ScoreData } from 'types/SongDatabase';
import JSONdb from 'simple-json-db';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import { MaimaiDXNetMaintenanceError } from './errors';

const UserAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

class MaimaiDXNetFetcher {
    static instance: MaimaiDXNetFetcher | null = null;
    loginFinished: boolean = false;
    logger: Logger = new Logger('MaimaiDXNetFetcher');
    http: AxiosInstance;
    cookieJar: CookieJar;

    static getInstance() {
        if (!MaimaiDXNetFetcher.instance) {
            MaimaiDXNetFetcher.instance = new MaimaiDXNetFetcher();
        }
        return MaimaiDXNetFetcher.instance;
    }

    private constructor() {
        this.cookieJar = new CookieJar();
        this.http = wrapper(axios.create({ jar: this.cookieJar, headers: { 'User-Agent': UserAgent } }));

        this.http.interceptors.response.use(
            (response) => {
                if (typeof response.data === 'string' && this.isMaintenancePage(response.data)) {
                    throw new MaimaiDXNetMaintenanceError();
                }
                return response;
            },
            (error: unknown) => {
                if (
                    axios.isAxiosError(error) &&
                    typeof error.response?.data === 'string' &&
                    this.isMaintenancePage(error.response.data)
                ) {
                    throw new MaimaiDXNetMaintenanceError();
                }
                return Promise.reject(error);
            },
        );
    }

    private isMaintenancePage(data: string): boolean {
        const $ = cheerio.load(data);
        return $('.main_info_title').text().trim() === 'Sorry, servers are under maintenance.';
    }

    private async update() {
        const homeResponse = await this.http.get('https://maimaidx-eng.com/maimai-mobile/home');

        const $ = cheerio.load(homeResponse.data);
        if ($('title').text() !== 'maimai DX NET－Home－') {
            this.logger.warn('Session expired, re-logging in...');
            await this.login();
        }
    }

    public async login(): Promise<void> {
        this.cookieJar.removeAllCookiesSync();
        this.loginFinished = false;

        await this.http.get(
            'https://lng-tgk-aime-gw.am-all.net/common_auth/login?site_id=maimaidxex&redirect_url=https://maimaidx-eng.com/maimai-mobile/&back_url=https://maimai.sega.com/',
        );

        try {
            const loginResponse = await this.http.post(
                'https://lng-tgk-aime-gw.am-all.net/common_auth/login/sid',
                new URLSearchParams({
                    sid: process.env.SID ?? '',
                    password: process.env.SID_PASSWORD ?? '',
                    retention: '1',
                }),
            );

            const $ = cheerio.load(loginResponse.data);
            const errorMessage = $('#error-ui').text().trim();
            if (errorMessage) {
                this.logger.error(`Login failed: ${errorMessage}`);
                throw new Error(`Login failed: ${errorMessage}`);
            }

            if ($('title').text() !== 'maimai DX NET－Home－') {
                this.logger.error('Login failed: Unexpected response after login');
                throw new Error('Login failed: Unexpected response after login');
            }

            this.loginFinished = true;
            this.logger.log('Logged in successfully');
        } catch (error) {
            if (error instanceof MaimaiDXNetMaintenanceError) throw error;

            writeErrorToFile(error);
            this.logger.error('Error during login:', error);
            throw new Error('Error during login');
        }
    }

    async getFriendList(): Promise<any> {
        if (!this.loginFinished) {
            await this.login();
        }

        await this.update();

        try {
            let resp = await this.http.get('https://maimaidx-eng.com/maimai-mobile/friend', {
                maxRedirects: 0,
                validateStatus: (status) => status === 200 || status === 302,
            });

            let $ = cheerio.load(resp.data);

            if ($('title').text() !== "maimai DX NET－All Friend's－") {
                await this.login();
                resp = await this.http.get('https://maimaidx-eng.com/maimai-mobile/friend');

                $ = cheerio.load(resp.data);

                if ($('title').text() !== "maimai DX NET－All Friend's－") {
                    this.logger.error('Failed to fetch friend list after re-login');
                    throw new Error('Failed to fetch friend list after re-login');
                }
            }

            let output: {
                name: string | undefined;
                rating: string | undefined;
                idx: string | undefined;
            }[] = [];
            $('.see_through_block').each((i, el) => {
                const element = $(el);
                let name = element.find('.name_block')?.text();
                let rating = element.find('.rating_block')?.text();
                let idx = element.find('input[name="idx"]')?.attr('value');
                output.push({ name, rating, idx });
            });

            this.logger.log('Fetched friend list successfully');
            return output;
        } catch (error) {
            if (error instanceof MaimaiDXNetMaintenanceError) throw error;
            
            this.logger.error('Error fetching friend list:', error);
            writeErrorToFile(error);
            throw new Error('Error fetching friend list');
        }
    }

    async addFriend(friendCode: string) {
        if (!this.loginFinished) {
            await this.login();
        }

        await this.update();
        try {
            const inviteURL = 'https://maimaidx-eng.com/maimai-mobile/friend/search/invite';
            const cookies = await this.cookieJar.getCookies(inviteURL);
            let token = cookies.find((cookie) => cookie.key === '_t')?.value;

            if (!token) {
                await this.update();
                const updatedCookies = await this.cookieJar.getCookies(inviteURL);
                const updatedToken = updatedCookies.find((cookie) => cookie.key === '_t')?.value;
                if (!updatedToken) {
                    throw new Error('Failed to obtain token after update');
                }
                token = updatedToken;
            }

            await this.http.post(
                inviteURL,
                new URLSearchParams({
                    idx: friendCode,
                    token: token,
                }),
                {
                    headers: {
                        Referer: `https://maimaidx-eng.com/maimai-mobile/friend/search/searchUser/?friendCode=${friendCode}`,
                    },
                },
            );
        } catch (error) {
            if (error instanceof MaimaiDXNetMaintenanceError) throw error;

            this.logger.error('Error adding friend:', error);
            writeErrorToFile(error);
            throw new Error('Error adding friend');
        }
    }

    async getPlayer(friendCode: string): Promise<{
        name: string;
        avatar: string;
        rating: number;
        title: string;
        titleType: TitleType;
        course: string;
        classRank: string;
    } | null> {
        if (!this.loginFinished) {
            await this.login();
        }

        await this.update();
        try {
            let resp = await this.http.get(
                `https://maimaidx-eng.com/maimai-mobile/friend/friendDetail/?idx=${friendCode}`,
                {
                    headers: {
                        Referer: `https://maimaidx-eng.com/maimai-mobile/friend`,
                    },
                },
            );
            let data = resp.data;

            let $ = cheerio.load(data);

            if ($('title').text() !== "maimai DX NET－Friend's Details－") {
                await this.update();
                resp = await this.http.get(
                    `https://maimaidx-eng.com/maimai-mobile/friend/friendDetail/?idx=${friendCode}`,
                    {
                        headers: {
                            Referer: `https://maimaidx-eng.com/maimai-mobile/friend`,
                        },
                    },
                );

                $ = cheerio.load(resp.data);

                if ($('title').text() !== "maimai DX NET－Friend's Details－") {
                    this.logger.error('Failed to fetch player info after re-login');
                    throw new Error('Failed to fetch player info after re-login');
                }
            }
            let name = $('.name_block').text() ?? '';
            let rating = parseInt($('.rating_block').first().text() ?? '0');
            let avatar = $('.basic_block > img').attr('src') ?? '';

            let title =
                $('.trophy_inner_block')
                    .text()
                    .replace(/[\t\n]/g, '') ?? '';
            let titleType;
            if ($('.trophy_Normal').length > 0) titleType = TitleType.Normal;
            else if ($('.trophy_Bronze').length > 0) titleType = TitleType.Bronze;
            else if ($('.trophy_Silver').length > 0) titleType = TitleType.Silver;
            else if ($('.trophy_Gold').length > 0) titleType = TitleType.Gold;
            else if ($('.trophy_Rainbow').length > 0) titleType = TitleType.Rainbow;
            else titleType = TitleType.Normal;

            let course = $('.h_35.f_l').eq(0).attr('src') ?? '';
            let classRank = $('.h_35.f_l').eq(1).attr('src') ?? '';

            this.logger.log(`Fetched player info (code: ${friendCode}) successfully: ${name}`);
            return {
                name,
                rating,
                avatar,
                title,
                titleType,
                course,
                classRank,
            };
        } catch (error) {
            if (error instanceof MaimaiDXNetMaintenanceError) throw error;

            this.logger.error('Error getting player:', error);
            writeErrorToFile(error);
            throw new Error('Error getting player');
        }
    }

    async getScores(
        scoreType: ScoreType,
        friendCode: string,
        difficulty: Difficulty,
    ): Promise<{
        data: ScoreData[];
    }> {
        this.logger.log(`Fetching ${DifficultyDisplayName[difficulty]} scores for player:`, friendCode);

        if (!this.loginFinished) {
            await this.update();
        }

        let resp = await this.http.get(
            `https://maimaidx-eng.com/maimai-mobile/friend/friendGenreVs/battleStart/?scoreType=${scoreType}&genre=${Genres.ALL}&diff=${difficulty}&idx=${friendCode}`,
        );
        let output: ScoreData[] = [];
        let data = resp.data;
        let $ = cheerio.load(data);

        if ($('title').text() !== 'maimai DX NET－Friends VS－') {
            await this.update();
            resp = await this.http.get(
                `https://maimaidx-eng.com/maimai-mobile/friend/friendGenreVs/battleStart/?scoreType=${scoreType}&genre=${Genres.ALL}&diff=${difficulty}&idx=${friendCode}`,
            );

            $ = cheerio.load(resp.data);

            if ($('title').text() !== 'maimai DX NET－Friends VS－') {
                this.logger.error('Failed to fetch scores after re-login');
                throw new Error('Failed to fetch scores after re-login');
            }
        }

        let allScore = $(`.music_${DifficultyName[difficulty]}_score_back`);
        allScore.each((i, score) => {
            const $score = $(score);
            let kind;
            if (difficulty === Difficulty.UTAGE) kind = $score.find('.music_kind_icon_utage_text').text() ?? undefined;

            let achievement, dxStar, dxScore;
            if (scoreType === ScoreType.Achievement) {
                achievement = $score.find(`.p_r.${DifficultyName[difficulty]}_score_label.w_120.f_b`).eq(1);
            } else {
                dxScore = $score.find(`.p_r.${DifficultyName[difficulty]}_score_label.w_120.f_b`).eq(1);
                switch (
                    $score
                        .find(`.p_r.${DifficultyName[difficulty]}_score_label.w_120.f_b`)
                        .eq(1)
                        .find('img')
                        .attr('src')
                        ?.split('/')
                        .pop()
                        ?.replace('.png', '')
                ) {
                    case 'music_icon_dxstar_1':
                        dxStar = 1;
                        break;
                    case 'music_icon_dxstar_2':
                        dxStar = 2;
                        break;
                    case 'music_icon_dxstar_3':
                        dxStar = 3;
                        break;
                    case 'music_icon_dxstar_4':
                        dxStar = 4;
                        break;
                    case 'music_icon_dxstar_5':
                        dxStar = 5;
                        break;
                    default:
                        dxStar = 0;
                        break;
                }
            }
            let status = [];
            let icons = $score.find('.t_r.f_0').eq(0).find('img');
            switch (icons.eq(1).attr('src')?.split('?')[0].split('/').pop()?.replace('.png', '')) {
                case 'music_icon_fc':
                    status.push(ComboType.FC);
                    break;
                case 'music_icon_fcp':
                    status.push(ComboType.FCp);
                    break;
                case 'music_icon_ap':
                    status.push(ComboType.AP);
                    break;
                case 'music_icon_app':
                    status.push(ComboType.APp);
                    break;
                default:
                    status.push(-1);
                    break;
            }
            switch (icons.eq(0).attr('src')?.split('?')[0].split('/').pop()?.replace('.png', '')) {
                case 'music_icon_fs':
                    status.push(SyncType.FS);
                    break;
                case 'music_icon_fsp':
                    status.push(SyncType.FSp);
                    break;
                case 'music_icon_fdx':
                    status.push(SyncType.FDX);
                    break;
                case 'music_icon_fdxp':
                    status.push(SyncType.FDXp);
                    break;
                default:
                    status.push(-1);
                    break;
            }
            if (scoreType === ScoreType.Achievement && achievement?.text()?.includes('―')) return;
            if (scoreType === ScoreType.DXScore && dxScore?.text()?.includes('―')) return;

            let type_block = $score
                .find('.music_kind_icon')
                .attr('src')
                ?.split('?')[0]
                .split('/')
                .pop()
                ?.replace('.png', '');
            output.push({
                title: $score.find('.music_name_block').text() ?? '',
                type:
                    type_block === 'music_dx'
                        ? ChartType.DX
                        : type_block === 'music_standard'
                          ? ChartType.STD
                          : ChartType.UTAGE,
                difficulty: difficulty,
                utageKind: kind,
                achievement: parseFloat(achievement?.text() ?? '0%'),
                comboType: status[0],
                syncType: status[1],
                dxScore: parseInt(dxScore?.text()?.replace(/,/g, '') ?? '0'),
                dxStar: dxStar,
            });
        });

        return { data: output };
    }

    getLatestCacheDataDate(friendCode: string): Date | null {
        const dataPath = `data/playerData/${friendCode}/latest.json`;
        if (fs.existsSync(dataPath)) {
            const latestData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            return new Date(parseInt(latestData.date.replace(/,/g, '')));
        }
        return null;
    }

    playerCacheDataExists(friendCode: string): boolean {
        const dataPath = `data/playerData/${friendCode}/latest.json`;
        return fs.existsSync(dataPath);
    }

    savePlayerCacheData(
        friendCode: string,
        data: {
            playerData: {
                name: string;
                avatar: string;
                rating: number;
                title: string;
                titleType: TitleType;
                course: string;
                classRank: string;
            };
            scoreData: {
                [key: string]: {
                    title: string;
                    type: ChartType;
                    difficulty: Difficulty;
                    utageKind?: string;
                    achievement: number;
                    comboType: ComboType;
                    syncType: SyncType;
                    dxScore?: number;
                    dxStar?: number;
                }[];
            };
        },
    ): void {
        if (!fs.existsSync(`data/playerData/${friendCode}`)) fs.mkdirSync(`data/playerData/${friendCode}`);
        writeFileAtomic(
            `data/playerData/${friendCode}/latest.json`,
            JSON.stringify(
                {
                    date: Date.now().toLocaleString(),
                    data: data,
                },
                null,
                2,
            ),
        );
        new Date().toDateString();
    }

    getPlayerCacheData(friendCode: string): {
        playerData: {
            name: string;
            avatar: string;
            rating: number;
            title: string;
            titleType: TitleType;
            course: string;
            classRank: string;
        };
        scoreData: {
            [key: string]: {
                title: string;
                type: ChartType;
                difficulty: Difficulty;
                utageKind?: string;
                achievement: number;
                comboType: ComboType;
                syncType: SyncType;
                dxScore?: number;
                dxStar?: number;
            }[];
        };
        date: Date;
    } {
        let json = fs.readFileSync(`data/playerData/${friendCode}/latest.json`, 'utf8');
        let data = JSON.parse(json);
        return {
            playerData: data.data.playerData,
            scoreData: data.data.scoreData,
            date: new Date(parseInt(data.date.replace(/[,]/g, ''))),
        };
    }

    getFriendCodeByDiscordId(userId: string): string | null {
        const db = new JSONdb('data/linking.json');
        const friendCode = db.get(userId);
        return friendCode ?? null;
    }
}

export default MaimaiDXNetFetcher;
