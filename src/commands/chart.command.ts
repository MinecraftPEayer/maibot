import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    ButtonStyle,
} from 'discord.js';
import { createCanvas, loadImage, registerFont, CanvasRenderingContext2D, Canvas } from 'canvas';
import JSONdb from 'simple-json-db';
import MaimaiDXNetFetcher from 'src/lib/maimaiDXNetFetcher';
import {
    calculateB50,
    convertDXScoreToStar,
    getChartTypeFromName,
    getDifficultyIdFromName,
    getRatingBaseImage,
} from 'src/lib/Utils';
import axios from 'axios';
import fs from 'fs';
import sharp from 'sharp';
import { ComboType, Difficulty, ScoreType, SyncType } from 'src/lib/CommonEnums';
import { B50Data, ScoreData } from 'types/SongDatabase';
import { DifficultyDisplayName } from 'src/lib/constant/CommonConstant';

type PlayerInfo = {
    name: string;
    avatar: string;
    rating: string;
    title: string;
    titleType: string;
    course: string;
    classRank: string;
};

let diffs = [Difficulty.Basic, Difficulty.Advanced, Difficulty.Expert, Difficulty.Master, Difficulty.ReMaster];

const diffTip = {
    10: '',
    4: 'assets/diff_rem.png',
    3: 'assets/diff_mas.png',
    2: 'assets/diff_exp.png',
    1: 'assets/diff_adv.png',
    0: 'assets/diff_bsc.png',
};

const RankingImage = {
    'SSS+': 'sssplus',
    SSS: 'sss',
    'SS+': 'ssplus',
    SS: 'ss',
    'S+': 'splus',
    S: 's',
    AAA: 'aaa',
    AA: 'aa',
    A: 'a',
    BBB: 'bbb',
    BB: 'bb',
    B: 'b',
    C: 'c',
    D: 'd',
};

function initializeFonts() {
    const fontPath = 'assets/fonts';

    registerFont(`${fontPath}/SEGAMaruGothicDB.ttf`, {
        family: 'SEGAMaruGothic',
        weight: 'normal',
    });

    registerFont(`${fontPath}/NotoSans-Regular.ttf`, {
        family: 'Noto Sans',
        weight: 'normal',
    });

    registerFont(`${fontPath}/NotoSans-Bold.ttf`, {
        family: 'Noto Sans',
        weight: 'bold',
    });

    registerFont(`${fontPath}/NotoSansJP-Regular.ttf`, {
        family: 'Noto Sans JP',
        weight: 'normal',
    });

    registerFont(`${fontPath}/NotoSansJP-Bold.ttf`, {
        family: 'Noto Sans JP',
        weight: 'bold',
    });
}

const FontStack = '"SEGAMaruGothic", "Noto Sans", "Noto Sans JP", sans-serif';

async function getImageBuffer(imageURL: string, cache?: boolean): Promise<Buffer> {
    if (cache === undefined) cache = false;
    try {
        let url = new URL(imageURL);
        if (fs.existsSync(`tmp/cache/image/${url.pathname.split('/').pop()}`) && cache) {
            const Buffer = fs.readFileSync(`tmp/cache/image/${url.pathname.split('/').pop()}`);
            return sharp(Buffer).png().toBuffer();
        } else {
            const response = await axios.get(imageURL, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
                },
                validateStatus: (status) => status < 500,
            });
            const buffer = Buffer.from(response.data);
            if (cache) {
                fs.writeFileSync(`tmp/cache/image/${url.pathname.split('/').pop()}`, buffer);
            }
            return await sharp(buffer).png().toBuffer();
        }
    } catch (error) {
        console.error(`Error fetching image from ${imageURL}:`, error);
        return Buffer.alloc(0);
    }
}

async function drawAndSendChart(
    interaction: ChatInputCommandInteraction,
    playerInfo: any,
    scores: {
        [key: string]: ScoreData[];
    },
) {
    initializeFonts();
    console.log('Drawing chart for player:', playerInfo?.name);
    const { B15Data, B35Data } = calculateB50(Object.values(scores).flat());

    await interaction.editReply(['Fetching player info... OK', 'Fetching scores... OK', 'Drawing...'].join('\n'));

    const canvas = createCanvas(1088, 1674);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bgImg = await loadImage('assets/background.png');
    ctx.drawImage(bgImg, 896, 0, 1088, 1620, 0, 0, 1088, 1674);

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.roundRect(16, 16, 314, 112, 16);
    ctx.fill();

    if (playerInfo?.avatar) {
        const avatarImg = await loadImage(
            await getImageBuffer(`https://chart.minecraftpeayer.me/api/proxy/img?url=${playerInfo?.avatar}`),
        );

        ctx.drawImage(avatarImg, 24, 24, 96, 96);
    }

    ctx.fillStyle = '#f7f7ff';
    ctx.beginPath();
    ctx.roundRect(128, 24, 194, 48, 6);
    ctx.fill();

    ctx.fillStyle = 'black';
    ctx.font = `20px ${FontStack}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(playerInfo?.name ?? '', 220, 48);

    const rating =
        B15Data.map((item) => item.rating).reduce((a, b) => a + b, 0) +
        B35Data.map((item) => item.rating).reduce((a, b) => a + b, 0);

    const ratingImg = await loadImage(
        await getImageBuffer(
            `https://maimaidx-eng.com/maimai-mobile/img/rating_base_${getRatingBaseImage(rating)}.png`,
        ),
    );

    ctx.drawImage(ratingImg, 0, 0, 296, 86, 128, 24 + 48 + 4, 165, 48);

    const parsedRating = `${' '.repeat('00000'.length - rating.toString().length)}${rating}`.split('');

    ctx.fillStyle = 'white';
    ctx.font = `bold 24px ${FontStack}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    drawBoldText(ctx, parsedRating[0], 206, 101, 0.5);
    drawBoldText(ctx, parsedRating[1], 224, 101, 0.5);
    drawBoldText(ctx, parsedRating[2], 241.5, 101, 0.5);
    drawBoldText(ctx, parsedRating[3], 258.5, 101, 0.5);
    drawBoldText(ctx, parsedRating[4], 276, 101, 0.5);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(16, 144, 1056, 1514, 16);
    ctx.fill();

    ctx.fillStyle = 'oklch(0.446 0.03 256.802)';
    ctx.font = `14px ${FontStack}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('B15', 32, 168);

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 5; j++) {
            const baseX = 32 + j * (192 + 16);
            const baseY = 176 + i * (128 + 16);

            ctx.fillStyle = '#444';
            ctx.beginPath();
            ctx.roundRect(baseX, baseY, 192, 128, 8);
            ctx.fill();

            let index = i * 5 + j;
            let chartInfo = B15Data[index];

            if (chartInfo) {
                const songImg = await loadImage(
                    await getImageBuffer(
                        `https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover-m/${chartInfo.backgroundImg}`,
                        true,
                    ),
                );
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(baseX, baseY, 192, 128, 8);
                ctx.clip();
                ctx.drawImage(songImg, 0, 31, 190, 128, baseX, baseY, 192, 128);
                ctx.restore();

                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.beginPath();
                ctx.roundRect(baseX, baseY, 192, 128, 8);
                ctx.fill();

                ctx.fillStyle = 'white';
                ctx.font = `16px ${FontStack}`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(`#${index + 1}`, baseX + 8, baseY + 20);

                const maxWidth = 176;
                let title = chartInfo.title;
                const currentFont = ctx.font;
                if (ctx.measureText(title).width > maxWidth) {
                    while (ctx.measureText(title + '...').width > maxWidth && title.length > 0) {
                        title = title.slice(0, -1);
                    }
                    title += '...';
                }
                ctx.fillText(title, baseX + 8, baseY + 40);
                ctx.font = currentFont;

                ctx.font = `12px ${FontStack}`;
                ctx.fillText(chartInfo.type, baseX + 8, baseY + 56);

                const difficultyImg = await loadImage(diffTip[chartInfo.difficulty]);
                ctx.save();

                ctx.beginPath();
                ctx.moveTo(baseX + 168, baseY);
                ctx.lineTo(baseX + 188, baseY);
                ctx.arcTo(baseX + 192, baseY, baseX + 192, baseY + 4, 8);
                ctx.lineTo(baseX + 192, baseY + 24);
                ctx.lineTo(baseX + 168, baseY + 24);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(difficultyImg, baseX + 168, baseY, 24, 24);
                ctx.restore();

                ctx.font = `12px ${FontStack}`;
                ctx.fillText(chartInfo.achievement.toFixed(4), baseX + 8, baseY + 92);
                ctx.font = `bold 24px ${FontStack}`;
                await drawRank(ctx, chartInfo.ranking, baseX + 8, baseY + 110);

                ctx.textAlign = 'right';
                ctx.font = `12px ${FontStack}`;
                ctx.fillText(chartInfo.constant.toFixed(1), baseX + 184, baseY + 88);
                ctx.font = `bold 32px ${FontStack}`;
                drawBoldText(ctx, chartInfo.rating.toString(), baseX + 184, baseY + 108, 1.5);
            }
        }

        ctx.strokeStyle = 'oklch(0.446 0.03 256.802)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(32, 176 + 3 * (128 + 16));
        ctx.lineTo(1056, 176 + 3 * (128 + 16));
        ctx.stroke();

        ctx.fillStyle = 'oklch(0.446 0.03 256.802)';
        ctx.font = `14px ${FontStack}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('B35', 32, 176 + 3 * (128 + 16) + 30);

        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < 5; j++) {
                const baseX = 32 + j * (192 + 16);
                const baseY = 650 + i * (128 + 16);

                ctx.fillStyle = '#444';
                ctx.beginPath();
                ctx.roundRect(baseX, baseY, 192, 128, 8);
                ctx.fill();

                let index = i * 5 + j;
                let chartInfo = B35Data[index];

                if (chartInfo) {
                    const songImg = await loadImage(
                        await getImageBuffer(
                            `https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover-m/${chartInfo.backgroundImg}`,
                            true,
                        ),
                    );

                    ctx.save();
                    ctx.beginPath();
                    ctx.roundRect(baseX, baseY, 192, 128, 8);
                    ctx.clip();
                    ctx.drawImage(songImg, 0, 31, 190, 128, baseX, baseY, 192, 128);
                    ctx.restore();

                    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                    ctx.beginPath();
                    ctx.roundRect(baseX, baseY, 192, 128, 8);
                    ctx.fill();

                    ctx.fillStyle = 'white';
                    ctx.font = `16px ${FontStack}`;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`#${index + 1}`, baseX + 8, baseY + 20);

                    const maxWidth = 176; // 192 - 16 for padding
                    let title = chartInfo.title;
                    const currentFont = ctx.font;
                    if (ctx.measureText(title).width > maxWidth) {
                        while (ctx.measureText(title + '...').width > maxWidth && title.length > 0) {
                            title = title.slice(0, -1);
                        }
                        title += '...';
                    }
                    ctx.fillText(title, baseX + 8, baseY + 40);
                    ctx.font = currentFont;

                    ctx.font = `12px ${FontStack}`;
                    ctx.fillText(chartInfo.type, baseX + 8, baseY + 56);

                    const difficultyImg = await loadImage(diffTip[chartInfo.difficulty]);
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(baseX + 168, baseY);
                    ctx.lineTo(baseX + 188, baseY);
                    ctx.arcTo(baseX + 192, baseY, baseX + 192, baseY + 4, 8);
                    ctx.lineTo(baseX + 192, baseY + 24);
                    ctx.lineTo(baseX + 168, baseY + 24);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(difficultyImg, baseX + 168, baseY, 24, 24);
                    ctx.restore();

                    ctx.font = `12px ${FontStack}`;
                    ctx.fillText(chartInfo.achievement.toFixed(4), baseX + 8, baseY + 92);
                    ctx.font = `bold 24px ${FontStack}`;
                    await drawRank(ctx, chartInfo.ranking, baseX + 8, baseY + 110);

                    ctx.textAlign = 'right';
                    ctx.font = `12px ${FontStack}`;
                    if (chartInfo.constant === null) console.log(chartInfo);
                    ctx.fillText(chartInfo.constant.toFixed(1), baseX + 184, baseY + 88);
                    ctx.font = `bold 32px ${FontStack}`;
                    drawBoldText(ctx, chartInfo.rating.toString(), baseX + 184, baseY + 108, 1.5);
                }
            }
        }
    }

    let attachment = canvas.toBuffer('image/png');
    await interaction.editReply({
        content: '',
        files: [attachment],
    });
}

const data = new SlashCommandBuilder()
    .setName('chart')
    .setDescription('生成Rating Chart')
    .addUserOption((option) => option.setName('user').setDescription('要查詢的玩家').setRequired(false));

const scoreType = ScoreType.Achievement;

async function drawRank(ctx: CanvasRenderingContext2D, ranking: string, posX: number, posY: number) {
    let image = await loadImage(`assets/ranking/${ranking.toLowerCase().replace(/[+]/g, 'plus')}.png`);
    ctx.drawImage(image, 0, 0, 200, 89, posX - 2, posY - 12, 54, 24);
}

function drawBoldText(ctx: CanvasRenderingContext2D, text: string, posX: number, posY: number, lineWidth?: number) {
    let originalStrokeStyle = ctx.strokeStyle,
        originalLineWidth = ctx.lineWidth;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = lineWidth || 1;
    ctx.strokeText(text, posX, posY);
    ctx.fillText(text, posX, posY);
    ctx.strokeStyle = originalStrokeStyle;
    ctx.lineWidth = originalLineWidth;
}

async function execute(interaction: ChatInputCommandInteraction) {
    let db = new JSONdb('data/linking.json');
    let optionUser = interaction.options.getUser('user');

    const fetcher = MaimaiDXNetFetcher.getInstance();

    let scores = {} as {
        [key: string]: ScoreData[];
    };

    let playerInfo: PlayerInfo = {
        name: '',
        avatar: '',
        rating: '',
        title: '',
        titleType: '',
        course: '',
        classRank: '',
    };

    if (fs.existsSync(`data/user/${optionUser?.id ? optionUser.id : interaction.user.id}/latest.json`)) {
        let latestData = JSON.parse(
            fs.readFileSync(`data/user/${optionUser?.id ? optionUser.id : interaction.user.id}/latest.json`, 'utf8'),
        );

        for (let key in latestData.allScores) {
            scores[key] = latestData.allScores[key].map((score: any) => {
                return {
                    title: score.name,
                    type: getChartTypeFromName(score.chartType),
                    difficulty: getDifficultyIdFromName(score.difficulty) || Difficulty.Basic,
                    achievement: parseFloat(score.achievement),
                    comboType: ComboType[score.comboType.replace(/[+]/g, 'p')] || ComboType.None,
                    syncType: SyncType[score.syncType.replace(/[+]/g, 'p')] || SyncType.None,
                    dxScore: parseInt(score.dxScore.split('/')[0].replace(/,/g, '')),
                    dxStar: convertDXScoreToStar(
                        parseInt(score.dxScore.split('/')[0].replace(/,/g, '')),
                        parseInt(score.dxScore.split('/')[1].replace(/,/g, '')),
                    ),
                };
            });
        }

        playerInfo = {
            name: latestData.playerData.playerName,
            rating: latestData.playerData.rating,
            avatar: latestData.playerData.avatar,
            title: latestData.playerData.title.text,
            titleType: latestData.playerData.title.type,
            course: latestData.playerData.course,
            classRank: latestData.playerData['class'],
        };

        await interaction.reply({
            content: 'Processing...',
        });

        drawAndSendChart(interaction, playerInfo, scores);
    } else {
        if (optionUser && !db.has(optionUser.id)) {
            return await interaction.reply(`${optionUser.username} 還沒綁定帳號`);
        }
        if (!db.has(interaction.user.id)) return await interaction.reply('你還沒綁定帳號');

        let id = optionUser ? optionUser.id : interaction.user.id;

        let friendCode = db.get(id);

        let cacheExists = fetcher.playerCacheDataExists(friendCode);
        let lastDataDate = fetcher.getLatestCacheDataDate(friendCode);
        if (cacheExists && lastDataDate && Date.now() - lastDataDate.getTime() <= 24 * 60 * 60 * 1000) {
            let actionRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(new ButtonBuilder().setLabel('Yes').setStyle(ButtonStyle.Success).setCustomId('yes'))
                .addComponents(new ButtonBuilder().setLabel('No').setStyle(ButtonStyle.Danger).setCustomId('no'));

            let reply = await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('We found cached score data. Would you like to use it or fetch new data?')
                        .setDescription(`Time: <t:${(lastDataDate.getTime() / 1000).toFixed()}:F>`),
                ],
                components: [actionRow],
            });

            let collector = reply.createMessageComponentCollector({
                max: 1,
                time: 60000,
                filter: (i) => i.user.id === interaction.user.id,
            });
            let btnUsed = false;
            collector.on('collect', async (btnI) => {
                btnUsed = true;
                switch (btnI.customId) {
                    case 'yes':
                        let data = fetcher.getPlayerCacheData(friendCode);
                        playerInfo = data.playerData;
                        scores = data.scoreData;
                        await interaction.editReply({
                            content: 'Processing...',
                            components: [],
                            embeds: [],
                        });
                        drawAndSendChart(interaction, playerInfo, scores);
                        break;
                    case 'no':
                        let message = 'Fetching player info...';
                        await interaction.editReply({ content: message, components: [], embeds: [] });

                        playerInfo = (await fetcher.getPlayer(friendCode)) ?? {
                            name: '',
                            avatar: '',
                            rating: '',
                            title: '',
                            titleType: '',
                            course: '',
                            classRank: '',
                        };

                        message += [' OK', 'Fetching scores...'].join('\n');
                        await interaction.editReply(message);

                        scores = {};
                        for (const [difficulty, diffName] of Object.entries(DifficultyDisplayName)) {
                            if (!diffs.includes(parseInt(difficulty))) continue;

                            message += `\n> Fetching ${diffName} scores...`;
                            await interaction.editReply(message);
                            let scoreData = await fetcher.getScores(scoreType, friendCode, parseInt(difficulty));
                            scores[diffName] = scoreData.data;
                            message += ' OK';
                        }

                        fetcher.savePlayerCacheData(friendCode, {
                            playerData: playerInfo,
                            scoreData: scores,
                        });

                        await interaction.editReply(
                            ['Fetching player info... OK', 'Fetching scores... OK', 'Calculating...'].join('\n'),
                        );

                        drawAndSendChart(interaction, playerInfo, scores);
                        break;

                    default:
                        btnI.reply({
                            content: 'how tf can you get here, go back right now bro',
                        });
                        break;
                }
            });
            collector.on('end', async () => {
                if (btnUsed) return;
                interaction.editReply({
                    components: [],
                });
            });
        } else {
            let message = 'Fetching player info...';
            await interaction.reply({ content: message });

            playerInfo = (await fetcher.getPlayer(friendCode)) ?? {
                name: '',
                avatar: '',
                rating: '',
                title: '',
                titleType: '',
                course: '',
                classRank: '',
            };

            message += [' OK', 'Fetching scores...'].join('\n');
            await interaction.editReply(message);

            scores = {};
            for (const [difficulty, diffName] of Object.entries(DifficultyDisplayName)) {
                if (!diffs.includes(parseInt(difficulty))) continue;

                message += `\n> Fetching ${diffName} scores...`;
                await interaction.editReply(message);
                let scoreData = await fetcher.getScores(scoreType, friendCode, parseInt(difficulty));
                scores[diffName] = scoreData.data;
                message += ' OK';
            }

            fetcher.savePlayerCacheData(friendCode, {
                playerData: playerInfo,
                scoreData: scores,
            });

            await interaction.editReply(
                ['Fetching player info... OK', 'Fetching scores... OK', 'Calculating...'].join('\n'),
            );

            await drawAndSendChart(interaction, playerInfo, scores);
        }
    }
}

export { data, execute };
