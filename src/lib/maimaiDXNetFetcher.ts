import cookieParser, { Cookie } from 'set-cookie-parser';
import * as cheerio from 'cheerio';
import fs from 'fs';
import axios from 'axios';
import { ChartType, ComboType, Difficulty, Genres, ScoreType, SyncType, TitleType } from './CommonEnums';
import { DifficultyDisplayName, DifficultyName } from './constant/CommonConstant';
import Logger from './logger';
import { writeErrorToFile } from './Utils';
import { ScoreData } from 'types/SongDatabase';
import JSONdb from 'simple-json-db';

const UserAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

class MaimaiDXNetFetcher {
    static instance: MaimaiDXNetFetcher | null = null;
    cookies: Cookie[] = [];
    loginFinished: boolean = false;
    logger: Logger = new Logger('MaimaiDXNetFetcher');

    static getInstance() {
        if (!MaimaiDXNetFetcher.instance) {
            MaimaiDXNetFetcher.instance = new MaimaiDXNetFetcher();
        }
        return MaimaiDXNetFetcher.instance;
    }

    private constructor() {}

    private async update() {
        let resp = await axios.get('https://maimaidx-eng.com/maimai-mobile/home', {
            headers: {
                Cookie: this.cookies.map((c) => `${c.name}=${c.value}`).join('; '),
                'User-Agent': UserAgent,
            },
        });

        if (resp.headers['set-cookie']) {
            let newCookies = cookieParser
                .parse(cookieParser.splitCookiesString(resp.headers['set-cookie']))
                .filter((c) => c.value !== 'deleted');

            newCookies.forEach((newCookie) => {
                const index = this.cookies.findIndex((c) => c.name === newCookie.name);
                if (index !== -1) {
                    this.cookies[index] = newCookie;
                } else {
                    this.cookies.push(newCookie);
                }
            });
        }
    }

    public async login(): Promise<void> {
        this.cookies = [];

        let jsessionIdResponse = await axios.get(
            'https://lng-tgk-aime-gw.am-all.net/common_auth/login?site_id=maimaidxex&redirect_url=https://maimaidx-eng.com/maimai-mobile/&back_url=https://maimai.sega.com/',
        );
        let cookies = jsessionIdResponse.headers['set-cookie'];

        try {
            let loginResponse = await axios.post(
                'https://lng-tgk-aime-gw.am-all.net/common_auth/login/sid/',
                new URLSearchParams({
                    sid: process.env.SID ?? '',
                    password: process.env.SID_PASSWORD ?? '',
                    retention: '1',
                }),
                {
                    headers: {
                        ...(cookies ? { Cookie: cookies.join('; ') } : {}),
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': UserAgent,
                    },
                    maxRedirects: 0,
                    validateStatus: (status) => status === 302,
                },
            );

            let dxNetResponse = await axios.get(loginResponse.headers.location, {
                headers: {
                    ...(cookies ? { Cookie: cookies.join('; ') } : {}),
                    'User-Agent': UserAgent,
                },
                maxRedirects: 0,
                validateStatus: (status) => status === 302,
            });

            let dxNetCookies = dxNetResponse.headers['set-cookie'];
            if (dxNetCookies) {
                let parsing = cookieParser.splitCookiesString(dxNetCookies);
                this.cookies.push(...cookieParser.parse(parsing).filter((c) => c.value !== 'deleted'));
            }

            let homeResp = await axios.get('https://maimaidx-eng.com/maimai-mobile/home', {
                headers: {
                    Cookie: this.cookies.map((c) => `${c.name}=${c.value}`).join('; '),
                    'User-Agent': UserAgent,
                },
            });

            this.loginFinished = true;
            this.logger.log('Logged in successfully');
        } catch (error) {
            Promise.reject('Error fetching user info');
            writeErrorToFile(error);
        }
    }

    async getFriendList(): Promise<any> {
        if (!this.loginFinished) {
            await this.login();
        }

        await this.update();

        try {
            let resp = await axios.get('https://maimaidx-eng.com/maimai-mobile/friend', {
                headers: {
                    'User-Agent': UserAgent,
                    Cookie: this.cookies.map((c) => `${c.name}=${c.value}`).join('; '),
                },
                maxRedirects: 0,
                validateStatus: (status) => status === 200 || status === 302,
            });

            let $ = cheerio.load(resp.data);

            if ($('title').text() === 'maimai DX NET－Error－' || resp.status === 302 || resp.data === '') {
                await this.login();
                resp = await axios.get('https://maimaidx-eng.com/maimai-mobile/friend', {
                    headers: {
                        'User-Agent': UserAgent,
                        Cookie: this.cookies.map((c) => `${c.name}=${c.value}`).join('; '),
                    },
                });

                $ = cheerio.load(resp.data);
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
            this.logger.error('Error fetching friend list:', error);
            writeErrorToFile(error);
        }
    }

    async addFriend(friendCode: string) {
        if (!this.loginFinished) {
            await this.login();
        }

        await this.update();
        try {
            let resp = await axios.post(
                'https://maimaidx-eng.com/maimai-mobile/friend/search/invite',
                new URLSearchParams({
                    idx: friendCode,
                    token: this.cookies.find((c) => c.name === '_t')?.value ?? '',
                }),
                {
                    headers: {
                        Cookie: this.cookies.map((c) => `${c.name}=${c.value}`).join('; '),
                        'User-Agent': UserAgent,
                        Referer: `https://maimaidx-eng.com/maimai-mobile/friend/search/searchUser/?friendCode=${friendCode}`,
                    },
                    maxRedirects: 0,
                    validateStatus: (status) => status === 200 || status === 302,
                },
            );
        } catch (error) {
            this.logger.error('Error adding friend:', error);
            writeErrorToFile(error);
            return null;
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
            let resp = await axios.get(
                `https://maimaidx-eng.com/maimai-mobile/friend/friendDetail/?idx=${friendCode}`,
                {
                    headers: {
                        Cookie: this.cookies.map((c) => `${c.name}=${c.value}`).join('; '),
                        'User-Agent': UserAgent,
                        Referer: `https://maimaidx-eng.com/maimai-mobile/friend`,
                    },
                    maxRedirects: 0,
                    validateStatus: (status) => status === 200 || status === 302,
                },
            );
            let data = resp.data;

            let $ = cheerio.load(data);

            if ($('title').text() === 'maimai DX NET－Error－' || resp.status === 302 || resp.data === '') {
                await this.login();
                resp = await axios.get(
                    `https://maimaidx-eng.com/maimai-mobile/friend/friendDetail/?idx=${friendCode}`,
                    {
                        headers: {
                            'User-Agent': UserAgent,
                            Cookie: this.cookies.map((c) => `${c.name}=${c.value}`).join('; '),
                        },
                    },
                );

                $ = cheerio.load(resp.data);
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
            this.logger.error('Error getting player:', error);
            writeErrorToFile(error);
            return null;
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

        let resp = await axios.get(
            `https://maimaidx-eng.com/maimai-mobile/friend/friendGenreVs/battleStart/?scoreType=${scoreType}&genre=${Genres.ALL}&diff=${difficulty}&idx=${friendCode}`,
            {
                headers: {
                    Cookie: this.cookies.map((c) => `${c.name}=${c.value}`).join('; '),
                    'User-Agent': UserAgent,
                },
            },
        );
        let output: ScoreData[] = [];
        let data = resp.data;
        let $ = cheerio.load(data);

        if ($('title').text() === 'maimai DX NET－Error－' || resp.status === 302 || resp.data === '') {
            await this.login();
            resp = await axios.get(
                `https://maimaidx-eng.com/maimai-mobile/friend/friendGenreVs/battleStart/?scoreType=${scoreType}&genre=${Genres.ALL}&diff=${difficulty}&idx=${friendCode}`,
                {
                    headers: {
                        'User-Agent': UserAgent,
                        Cookie: this.cookies.map((c) => `${c.name}=${c.value}`).join('; '),
                    },
                },
            );

            $ = cheerio.load(resp.data);
        }
        if ($('title').text() === 'maimai DX NET－Error－') {
            let time = Date.now();
            fs.writeFileSync(`tmp/dxnet_error_${time}.html`, data);
            this.logger.error(`Error while fetching scores, response was saved to tmp/dxnet_error_${time}.html`);
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
        fs.writeFileSync(
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
