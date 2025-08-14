import cookieParser, { Cookie } from 'set-cookie-parser';
import { JSDOM } from 'jsdom';
import fs, { stat } from 'fs';
import axios from 'axios';
import { ChartType, ComboType, Difficulty, Genres, ScoreType, SyncType } from './CommonEnums';
import { DifficultyDisplayName, DifficultyName } from './constant/CommonConstant';

const UserAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

class MaimaiDXNetFetcher {
    static instance: MaimaiDXNetFetcher | null = null;
    cookies: Cookie[] = [];
    loginFinished: boolean = false;

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
            console.log('Logged in successfully');
        } catch (error) {
            Promise.reject('Error fetching user info');
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
            });

            let dom = new JSDOM(resp.data);

            if (dom.window.document.title === 'maimai DX NET－Error－') {
                await this.login();
                resp = await axios.get('https://maimaidx-eng.com/maimai-mobile/friend', {
                    headers: {
                        'User-Agent': UserAgent,
                        Cookie: this.cookies.map((c) => `${c.name}=${c.value}`).join('; '),
                    },
                });

                dom = new JSDOM(resp.data);
            }

            let list = dom.window.document.querySelectorAll('.see_through_block');
            let output = [];
            for (let element of list) {
                let name = element.querySelector('.name_block')?.textContent;
                let rating = element.querySelector('.rating_block')?.textContent;
                let idx = element.querySelector('input[name="idx"]')?.getAttribute('value');
                output.push({ name, rating, idx });
            }

            console.log('Fetched friend list successfully');
            return output;
        } catch (error) {
            console.error('Error fetching friend list:', error);
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
            console.error('Error adding friend:', error);
            return null;
        }
    }

    async getPlayer(friendCode: string): Promise<{
        name: string;
        avatar: string;
        rating: string;
        title: string;
        titleType: string;
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
            let dom = new JSDOM(data);

            if (dom.window.document.title === 'maimai DX NET－Error－' || resp.status === 302 || resp.data === '') {
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

                dom = new JSDOM(resp.data);
            }
            let name = dom.window.document.querySelector('.name_block')?.textContent ?? '';
            let rating = dom.window.document.querySelector('.rating_block')?.textContent ?? '';
            let avatar = dom.window.document.querySelector('.basic_block > img')?.getAttribute('src') ?? '';

            let title =
                dom.window.document.querySelector('.trophy_inner_block')?.textContent.replace(/[\t\n]/g, '') ?? '';
            let titleType;
            if (dom.window.document.querySelector('.trophy_Normal')) titleType = 'Normal';
            else if (dom.window.document.querySelector('.trophy_Bronze')) titleType = 'Bronze';
            else if (dom.window.document.querySelector('.trophy_Silver')) titleType = 'Silver';
            else if (dom.window.document.querySelector('.trophy_Gold')) titleType = 'Gold';
            else if (dom.window.document.querySelector('.trophy_Rainbow')) titleType = 'Rainbow';
            else titleType = 'None';

            let course = dom.window.document.querySelectorAll('.h_35.f_l')[0]?.getAttribute('src') ?? '';
            let classRank = dom.window.document.querySelectorAll('.h_35.f_l')[1]?.getAttribute('src') ?? '';

            console.log(`Fetched player info (code: ${friendCode}) successfully: ${name}`);
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
            console.error('Error adding friend:', error);
            return null;
        }
    }

    async getScores(
        scoreType: ScoreType,
        friendCode: string,
        difficulty: Difficulty,
    ): Promise<{
        data: {
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
    }> {
        console.log(`Fetching ${DifficultyDisplayName[difficulty]} scores for player:`, friendCode);

        let resp = await axios.get(
            `https://maimaidx-eng.com/maimai-mobile/friend/friendGenreVs/battleStart/?scoreType=${scoreType}&genre=${Genres.ALL}&diff=${difficulty}&idx=${friendCode}`,
            {
                headers: {
                    Cookie: this.cookies.map((c) => `${c.name}=${c.value}`).join('; '),
                    'User-Agent': UserAgent,
                },
            },
        );
        let output = [];
        let data = resp.data;
        let dom = new JSDOM(data);

        if (dom.window.document.title === 'maimai DX NET－Error－') {
            await this.login();
            resp = await axios.get('https://maimaidx-eng.com/maimai-mobile/friend', {
                headers: {
                    'User-Agent': UserAgent,
                    Cookie: this.cookies.map((c) => `${c.name}=${c.value}`).join('; '),
                },
            });

            dom = new JSDOM(resp.data);
        }
        if (dom.window.document.title === 'maimai DX NET－Error－') {
            let time = Date.now();
            fs.writeFileSync(`tmp/dxnet_error_${time}.html`, data);
            console.error(`Error while fetching scores, response was saved to tmp/dxnet_error_${time}.html`);
        }

        let allScore = dom.window.document.querySelectorAll(`.music_${DifficultyName[difficulty]}_score_back`);
        for (let score of allScore) {
            let kind;
            if (difficulty === Difficulty.UTAGE)
                kind = score.querySelector('.music_kind_icon_utage_text')?.textContent ?? undefined;

            let achievement, dxStar, dxScore;
            if (scoreType === ScoreType.Achievement) {
                achievement = score.querySelectorAll(`.p_r.${DifficultyName[difficulty]}_score_label.w_120.f_b`)[1];
            } else {
                dxScore = score.querySelectorAll(`.p_r.${DifficultyName[difficulty]}_score_label.w_120.f_b`)[1];
                switch (
                    score
                        .querySelectorAll(`.p_r.${DifficultyName[difficulty]}_score_label.w_120.f_b`)[1]
                        .querySelector('img')
                        ?.getAttribute('src')
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
            let icons = score.querySelectorAll('.t_r.f_0')[0].querySelectorAll('img');
            switch (icons[1]?.getAttribute('src')?.split('?')[0].split('/').pop()?.replace('.png', '')) {
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
            switch (icons[0]?.getAttribute('src')?.split('?')[0].split('/').pop()?.replace('.png', '')) {
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
            if (scoreType === ScoreType.Achievement && achievement?.textContent?.includes('―')) continue;
            if (scoreType === ScoreType.DXScore && dxScore?.textContent?.includes('―')) continue;

            let type_block = score
                .querySelector('.music_kind_icon')
                ?.getAttribute('src')
                ?.split('?')[0]
                .split('/')
                .pop()
                ?.replace('.png', '');
            output.push({
                title: score.querySelector('.music_name_block')?.textContent ?? '',
                type:
                    type_block === 'music_dx'
                        ? ChartType.DX
                        : type_block === 'music_standard'
                          ? ChartType.STD
                          : ChartType.UTAGE,
                difficulty: difficulty,
                utageKind: kind,
                achievement: parseFloat(achievement?.textContent ?? '0%'),
                comboType: status[0],
                syncType: status[1],
                dxScore: parseInt(dxScore?.textContent?.replace(/,/g, '') ?? '0'),
                dxStar: dxStar,
            });
        }

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
                rating: string;
                title: string;
                titleType: string;
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
            rating: string;
            title: string;
            titleType: string;
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
    } {
        let json = fs.readFileSync(`data/playerData/${friendCode}/latest.json`, 'utf8');
        return JSON.parse(json).data;
    }
}

export default MaimaiDXNetFetcher;
