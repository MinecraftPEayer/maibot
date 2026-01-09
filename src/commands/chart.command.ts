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
import { calculateB50, convertDXScoreToStar, getRatingBaseImage, initializeFonts, FontStack } from 'src/lib/Utils';
import fs from 'fs';
import { ChartType, ComboType, Difficulty, ScoreType, SyncType, TitleType } from 'src/lib/CommonEnums';
import { B50Data, ScoreData } from 'types/SongDatabase';
import { DifficultyDisplayName } from 'src/lib/constant/CommonConstant';
import * as StackBlur from 'stackblur-canvas';
import Logger from 'src/lib/logger';
import { PlayerInfo } from 'types/main';
import { getImageBuffer, drawRoundRect, drawCustomRoundRect } from 'src/lib/DrawImageUtils';

const TitleTypeName = {
    [TitleType.Normal]: 'Normal',
    [TitleType.Bronze]: 'Bronze',
    [TitleType.Silver]: 'Silver',
    [TitleType.Gold]: 'Gold',
    [TitleType.Rainbow]: 'Rainbow',
};

let diffs = [Difficulty.Basic, Difficulty.Advanced, Difficulty.Expert, Difficulty.Master, Difficulty.ReMaster];

const DifficultyColor = {
    [Difficulty.Basic]: ['#45c124', '#daf3d0'],
    [Difficulty.Advanced]: ['#ffba01', '#f3ecae'],
    [Difficulty.Expert]: ['#ff7b7b', '#f8e7e7'],
    [Difficulty.Master]: ['#9f51dc', '#efe7fa'],
    [Difficulty.ReMaster]: ['#dbaaff', '#501e89'],
    [Difficulty.UTAGE]: ['#ff6ffd', '#f8e8f6'],
};

let logger: Logger;

function drawChartType(ctx: CanvasRenderingContext2D, x: number, y: number, chartType: ChartType) {
    let originalFillStyle = ctx.fillStyle,
        originalFont = ctx.font;
    switch (chartType) {
        case ChartType.DX:
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 10, y + 20);
            ctx.lineTo(x - 10 + 61, y + 20);
            ctx.lineTo(x + 61, y);
            ctx.lineTo(x, y);
            ctx.fill();

            const TextColor = ['#FF1C00', '#FFAB00', '#FFEB00', '#A4FF00', '#0081FF'];
            const Text = 'でらっくす';
            ctx.font = `10px ${FontStack}`;
            for (let i = 0; i < 50; i += 10) {
                ctx.fillStyle = TextColor[i / 10];
                ctx.lineWidth = 0.5;
                ctx.strokeStyle = TextColor[i / 10];
                ctx.strokeText(Text[i / 10], x + 1 + i, y + 5 + 8);
                ctx.fillText(Text[i / 10], x + 1 + i, y + 5 + 8);
            }
            ctx.save();
            break;
        case ChartType.STD:
            ctx.fillStyle = '#73ADF8';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 10, y + 20);
            ctx.lineTo(x - 10 + 75, y + 20);
            ctx.lineTo(x + 75, y);
            ctx.lineTo(x, y);
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = `10px ${FontStack}`;
            ctx.lineWidth = 0.5;
            ctx.strokeStyle = 'white';
            ctx.strokeText('スタンダード', x + 3, y + 5 + 8);
            ctx.fillText('スタンダード', x + 3, y + 5 + 8);
            ctx.save();
            break;
    }
    ctx.font = originalFont;
    ctx.fillStyle = originalFillStyle;
}

async function drawSongBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    song: B50Data,
    songBoxDim: { width: number; height: number },
    index: number,
) {
    const score = song,
        X = x,
        Y = y;

    if (!score) return;

    let songBackgroundImg = await loadImage(
        await getImageBuffer(`https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover-m/${score.backgroundImg}`, true),
    );
    let bgImgCanvas = createCanvas(songBoxDim.width, songBoxDim.height);
    let bgImgCtx = bgImgCanvas.getContext('2d');
    bgImgCtx.save();
    bgImgCtx.beginPath();
    bgImgCtx.roundRect(0, 0, songBoxDim.width, songBoxDim.height, 8);
    bgImgCtx.clip();

    const scaleWidth = songBoxDim.width / songBackgroundImg.width;
    const scaleHeight = songBoxDim.height / songBackgroundImg.height;
    const scale = Math.max(scaleWidth, scaleHeight);

    const scaledWidth = songBackgroundImg.width * scale;
    const scaledHeight = songBackgroundImg.height * scale;
    const xOffset = (songBoxDim.width - scaledWidth) / 2;
    const yOffset = (songBoxDim.height - scaledHeight) / 2;

    bgImgCtx.drawImage(songBackgroundImg, xOffset, yOffset, scaledWidth, scaledHeight);
    bgImgCtx.restore();

    StackBlur.canvasRGBA(bgImgCanvas as unknown as HTMLCanvasElement, 0, 0, songBoxDim.width, songBoxDim.height, 4);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(X, Y, songBoxDim.width, songBoxDim.height, 8);
    ctx.clip();
    ctx.drawImage(bgImgCanvas, X, Y, songBoxDim.width, songBoxDim.height);
    ctx.restore();

    drawRoundRect({
        ctx,
        x: X,
        y: Y,
        width: songBoxDim.width,
        height: songBoxDim.height,
        radius: 8,
        fillStyle: 'rgba(0, 0, 0, 0.5)',
    });

    drawCustomRoundRect({
        ctx,
        x: X,
        y: Y,
        width: songBoxDim.width,
        height: 28,
        radius: {
            topLeft: 8,
            topRight: 8,
            bottomLeft: 0,
            bottomRight: 0,
        },
        fillStyle: '#D9D9D9',
    });

    if (score.rating >= 300) {
        const rainbowColors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#00f7ff', '#4B0082', '#9400D3'];
        const colorCount = rainbowColors.length;

        let gradient = ctx.createLinearGradient(X + 18, Y, X + 18 + songBoxDim.width - 18, Y + 24);
        for (let i = 0; i < colorCount; i++) {
            gradient.addColorStop(i / (colorCount - 1), rainbowColors[i]);
        }

        drawCustomRoundRect({
            ctx,
            x: X + 18,
            y: Y,
            width: songBoxDim.width - 18,
            height: 24,
            radius: {
                topRight: 8,
                bottomLeft: 4,
            },
            fillStyle: gradient,
        });
    }

    drawCustomRoundRect({
        ctx,
        x: X + 18,
        y: Y,
        width: songBoxDim.width - 18,
        height: 24,
        radius: {
            topRight: 8,
            bottomLeft: 4,
        },
        fillStyle: 'rgba(255, 255, 255, 0.6)',
    });

    ctx.font = `6px ${FontStack}`;
    ctx.fillStyle = 'black';
    ctx.fillText('#', X + 2, Y + 20 + 6, songBoxDim.width - 20);

    ctx.font = `8px ${FontStack}`;
    ctx.fillText(`${index + 1}`.length === 1 ? `0${index + 1}` : `${index + 1}`, X + 6, Y + 18 + 8);

    ctx.font = `14px ${FontStack}`;
    const MaxWidth = 142;
    let text = score.title;
    if (ctx.measureText(text).width > MaxWidth) {
        while (ctx.measureText(text + '...').width > MaxWidth && text.length > 0) {
            text = text.slice(0, -1);
        }
        text += '...';
    }
    ctx.fillText(text, X + 22, Y + 4 + 14);

    ctx.beginPath();
    ctx.moveTo(X, Y + 28);
    ctx.lineTo(X, Y + 28 + 28);
    ctx.lineTo(X + (106 - 64), Y + 28 + 28);
    ctx.lineTo(X + (120 - 64), Y + 28);
    ctx.lineTo(X, Y + 28);
    ctx.closePath();
    ctx.fillStyle = DifficultyColor[score.difficulty as Difficulty][0];
    ctx.fill();

    ctx.font = `20px ${FontStack}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = DifficultyColor[score.difficulty as Difficulty][1];
    drawBoldText(ctx, score.constant.toString().split('.')[0], X + 3 + 26, Y + 28 + 6 + 16, 0.5);
    ctx.textAlign = 'left';

    ctx.font = `12px ${FontStack}`;
    drawBoldText(ctx, '.' + (score.constant.toString().split('.')[1] ?? '0'), X + 30, Y + 28 + 11 + 10.5, 0.5);

    if (parseInt(score.constant.toString().split('.')[1]) > 5) {
        ctx.fillText('+', X + 30, Y + 28 + 2 + 8);
    }

    drawChartType(ctx, X + (120 - 64), Y + 28, score.type);

    ctx.fillStyle = 'white';
    ctx.font = `12px ${FontStack}`;
    ctx.fillText(`${score.achievement.toFixed(4)}%`, X + 6, Y + songBoxDim.height - 6 - 2);

    const RankImg = await loadImage(`assets/ranking/${score.ranking.toLowerCase().replace(/[+]/g, 'plus')}.png`);
    ctx.drawImage(RankImg, X + 6, Y + songBoxDim.height - 16 - 20 - 2, 45, 20);

    ctx.font = `28px ${FontStack}`;
    ctx.save();
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'white';
    ctx.fillText(score.rating.toString(), X + songBoxDim.width - 55 - 4 - 2, Y + songBoxDim.height - 2 - 4 - 2);
    ctx.strokeText(score.rating.toString(), X + songBoxDim.width - 55 - 4 - 2, Y + songBoxDim.height - 2 - 4 - 2);
}

const WIDTH = 1920,
    HEIGHT = 1080;

async function drawAndSendChart(
    interaction: ChatInputCommandInteraction,
    updateTime: Date,
    playerData: PlayerInfo,
    scores: {
        [key: string]: ScoreData[];
    },
) {
    initializeFonts();
    logger.log('Drawing chart for player:', playerData?.name);
    const { B15Data, B35Data } = calculateB50(Object.values(scores).flat());

    await interaction.editReply(['Fetching player info... OK', 'Fetching scores... OK', 'Drawing...'].join('\n'));

    const canvas = createCanvas(WIDTH, HEIGHT);
    if (!canvas) return;

    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    const bgImg = await loadImage('assets/background.png');

    ctx.drawImage(bgImg, 0, 0, WIDTH, HEIGHT);

    drawRoundRect({
        ctx,
        x: 30,
        y: 30,
        width: WIDTH - 60,
        height: HEIGHT - 60,
        radius: 54,
        fillStyle: 'rgba(0, 0, 0, 0.5)',
    });

    const logoImg = await loadImage('assets/logo.png');
    ctx.drawImage(logoImg, 1558, 64, 298, 108);

    drawRoundRect({
        ctx,
        x: 64,
        y: 64,
        width: 390,
        height: 108,
        radius: 8,
        fillStyle: 'rgba(183, 183, 183, 0.45)',
    });

    const avatarImg = await loadImage(
        await getImageBuffer(`https://chart.minecraftpeayer.me/api/proxy/img?url=${playerData.avatar}`),
    );
    ctx.drawImage(avatarImg, 72, 72, 92, 92);

    const ratingImg = await loadImage(
        await getImageBuffer(
            `https://chart.minecraftpeayer.me/api/proxy/img?url=https://maimaidx-eng.com/maimai-mobile/img/rating_base_${getRatingBaseImage(playerData.rating)}.png`,
        ),
    );
    ctx.drawImage(ratingImg, 172, 70, 104, 30);
    ctx.font = `14px ${FontStack}`;
    ctx.fillStyle = 'white';
    let baseX = 217;
    let rating = String(playerData.rating);
    let ratingArray = [];
    for (let i = 0; i < 5 - rating.length; i++) {
        ratingArray.push(' ');
    }
    ratingArray.push(...rating.split(''));
    ctx.fillText(ratingArray[0], baseX, 90);
    ctx.fillText(ratingArray[1], baseX + 10.5, 90);
    ctx.fillText(ratingArray[2], baseX + 21.5, 90);
    ctx.fillText(ratingArray[3], baseX + 32.5, 90);
    ctx.fillText(ratingArray[4], baseX + 43.5, 90);

    const classImg = await loadImage(
        await getImageBuffer(`https://chart.minecraftpeayer.me/api/proxy/img?url=${playerData.classRank}`),
    );
    ctx.drawImage(classImg, 276, 68, 58, 32);

    drawRoundRect({
        ctx,
        x: 172,
        y: 100,
        width: 244,
        height: 36,
        radius: 4,
        fillStyle: 'white',
    });
    ctx.font = `20px ${FontStack}`;
    ctx.fillStyle = 'black';
    ctx.fillText(playerData.name, 180, 106 + 20);

    const courseImg = await loadImage(
        await getImageBuffer(`https://chart.minecraftpeayer.me/api/proxy/img?url=${playerData.course}`),
    );
    ctx.drawImage(courseImg, 341, 104, 71, 28);

    const titleBackImg = await loadImage(
        await getImageBuffer(
            `https://chart.minecraftpeayer.me/api/proxy/img?url=https://maimaidx-eng.com/maimai-mobile/img/trophy_${TitleTypeName[playerData.titleType].toLowerCase()}.png`,
        ),
    );

    ctx.drawImage(titleBackImg, 172, 138, 270, 25);

    ctx.font = `16px ${FontStack}`;
    ctx.fillStyle = 'white';
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'black';
    const MaxWidth = 256;
    let text = playerData.title.replace(/[\t\n]/g, '');
    if (ctx.measureText(text).width > MaxWidth) {
        while (ctx.measureText(text).width > MaxWidth && text.length > 0) {
            text = text.slice(0, -1);
        }
    }

    let measuredText = ctx.measureText(text);
    ctx.fillText(text, 178 + 128 - measuredText.width / 2, 141 + 16);
    ctx.strokeText(text, 178 + 128 - measuredText.width / 2, 141 + 16);

    let B35Total = 0;
    B35Data.forEach((b35) => (B35Total += b35.rating));
    let B15Total = 0;
    B15Data.forEach((b15) => (B15Total += b15.rating));

    ctx.font = `12px ${FontStack}`;
    ctx.fillStyle = 'white';
    ctx.fillText('REAL', 471, 119 + 12);
    ctx.fillText('CALC', 470, 152 + 12);
    
    ctx.font = `32px ${FontStack}`;
    ctx.fillText(playerData.rating.toString(), 507, 101 + 32);
    ctx.fillText(String(B35Total + B15Total), 507, 134 + 32);

    if (playerData.rating !== B35Total + B15Total) {
        ctx.font = `16px ${FontStack}`;
        ctx.fillText(`(${playerData.rating > (B35Total + B15Total) ? '-' : '+'}${playerData.rating - (B35Total + B15Total)})`, 612, 149 + 16);
    }

    drawRoundRect({
        ctx,
        x: 64,
        y: 187,
        width: 100,
        height: 20,
        radius: 10,
        fillStyle: '#73ADF8',
    });

    ctx.font = `12px ${FontStack}`;
    ctx.fillStyle = 'white';
    ctx.fillText('OLD CHART', 74, 192 + 10);

    const B35BaseX = 64,
        B35BaseY = 216,
        Gap = 10;

    const songBoxDim = {
        width: 168,
        height: 152,
    };

    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 7; j++) {
            const X = B35BaseX + j * (songBoxDim.width + Gap),
                Y = B35BaseY + i * (songBoxDim.height + Gap);

            const index = i * 7 + j;
            const score = B35Data[index];

            await drawSongBox(ctx, X, Y, score, songBoxDim, index);
        }
    }

    ctx.fillStyle = 'white';
    ctx.font = `8px ${FontStack}`;
    ctx.fillText('B35', B35BaseX + 116, B35BaseY - 8 - 2);
    ctx.font = `20px ${FontStack}`;
    ctx.fillText(B35Total.toString(), B35BaseX + 134, B35BaseY - 8 - 2);

    ctx.font = `8px ${FontStack}`;
    ctx.fillText('AVG', B35BaseX + 215, B35BaseY - 8 - 2);
    ctx.font = `20px ${FontStack}`;
    ctx.fillText(Math.floor(B35Total / B35Data.length).toString(), B35BaseX + 236, B35BaseY - 8 - 2);

    ctx.font = `8px ${FontStack}`;
    ctx.fillText('RANGE', B35BaseX + 300, B35BaseY - 8 - 2);
    ctx.font = `20px ${FontStack}`;
    ctx.fillText(`${B35Data[0].rating} / ${B35Data[B35Data.length - 1].rating}`, B35BaseX + 334, B35BaseY - 8 - 2);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(1316, 173);
    ctx.lineTo(1316, 1015);
    ctx.lineTo(1316 + 1, 1015);
    ctx.closePath();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    const B15BaseX = 1332,
        B15BaseY = 216;

    ctx.fillStyle = 'white';
    ctx.roundRect(B15BaseX, B15BaseY - 8 - 20, 100, 20, 10);
    ctx.fill();

    ctx.fillStyle = 'black';
    ctx.font = `12px ${FontStack}`;
    ctx.fillText('NEW', B15BaseX + 10, B15BaseY - 8 - 20 + 15);

    let chartText = 'CHART';
    const TextColor = ['#FF1C00', '#FFAB00', '#FFEB00', '#A4FF00', '#0081FF'];

    for (let i = 0; i < 10 * 5; i += 10) {
        ctx.fillStyle = TextColor[i / 10];
        ctx.fillText(chartText[i / 10], B15BaseX + 42 + i, B15BaseY - 8 - 20 + 15);
    }

    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 3; j++) {
            const X = B15BaseX + j * (songBoxDim.width + Gap),
                Y = B15BaseY + i * (songBoxDim.height + Gap);

            const index = i * 3 + j;
            const score = B15Data[index];

            await drawSongBox(ctx, X, Y, score, songBoxDim, index);
        }
    }

    ctx.fillStyle = 'white';
    ctx.font = `8px ${FontStack}`;
    ctx.fillText('B15', B15BaseX + 116, B15BaseY - 8 - 2);
    ctx.font = `20px ${FontStack}`;
    ctx.fillText(B15Total.toString(), B15BaseX + 134, B15BaseY - 8 - 2);

    ctx.font = `8px ${FontStack}`;
    ctx.fillText('AVG', B15BaseX + 215, B15BaseY - 8 - 2);
    ctx.font = `20px ${FontStack}`;
    ctx.fillText(Math.floor(B15Total / B15Data.length).toString(), B15BaseX + 236, B15BaseY - 8 - 2);

    ctx.font = `8px ${FontStack}`;
    ctx.fillText('RANGE', B15BaseX + 300, B15BaseY - 8 - 2);
    ctx.font = `20px ${FontStack}`;
    ctx.fillText(`${B15Data[0].rating} / ${B15Data[B15Data.length - 1].rating}`, B15BaseX + 334, B15BaseY - 8 - 2);

    ctx.font = `12px ${FontStack}`;
    ctx.fillText(`Generated by maibot#3684 (${process.BuildVersion})`, 80, HEIGHT - 42);

    ctx.font = `8px ${FontStack}`;
    ctx.textAlign = 'right';
    let date = new Date();
    let dateGMT8 = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    ctx.fillText(
        `Image generated at ${dateGMT8.getUTCFullYear()}/${(dateGMT8.getUTCMonth() + 1).toString().padStart(2, '0')}/${dateGMT8.getUTCDate().toString().padStart(2, '0')} ${dateGMT8.getUTCHours().toString().padStart(2, '0')}:${dateGMT8.getUTCMinutes().toString().padStart(2, '0')}:${dateGMT8.getUTCSeconds().toString().padStart(2, '0')} (GMT+8)`,
        WIDTH - 80,
        HEIGHT - 47,
    );
    let updateTimeGMT8 = new Date(updateTime.getTime() + 8 * 60 * 60 * 1000);
    ctx.fillText(
        `Data updated at ${updateTimeGMT8.getUTCFullYear()}/${(updateTimeGMT8.getUTCMonth() + 1).toString().padStart(2, '0')}/${updateTimeGMT8.getUTCDate().toString().padStart(2, '0')} ${updateTimeGMT8.getUTCHours().toString().padStart(2, '0')}:${updateTimeGMT8.getUTCMinutes().toString().padStart(2, '0')}:${updateTimeGMT8.getUTCSeconds().toString().padStart(2, '0')} (GMT+8)`,
        WIDTH - 80,
        HEIGHT - 39,
    );

    let attachment = canvas.toBuffer('image/png');
    try {
        await interaction.editReply({
            content: '',
            files: [attachment],
        });
    } catch (error) {
        logger.error('Error sending chart image:', error);
    }
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
    logger = interaction.client.logger;
    let db = new JSONdb('data/linking.json');
    let optionUser = interaction.options.getUser('user');

    const fetcher = MaimaiDXNetFetcher.getInstance();

    let scores = {} as {
        [key: string]: ScoreData[];
    };

    let playerInfo: PlayerInfo = {
        name: ' ',
        avatar: 'https://maimaidx-eng.com/maimai-mobile/img/Icon/34f0363f4ce86d07.png',
        rating: 0,
        title: ' ',
        titleType: TitleType.Normal,
        course: 'https://maimaidx-eng.com/maimai-mobile/img/course/course_rank_00T7GHJvGe.png',
        classRank: 'https://maimaidx-eng.com/maimai-mobile/img/class/class_rank_s_00ZqZmdpb8.png',
    };

    if (fs.existsSync(`data/user/${optionUser?.id ? optionUser.id : interaction.user.id}/latest.json`)) {
        let latestData = JSON.parse(
            fs.readFileSync(`data/user/${optionUser?.id ? optionUser.id : interaction.user.id}/latest.json`, 'utf8'),
        );

        for (let key in latestData.allScores) {
            scores[key] = latestData.allScores[key].map((score: any) => {
                return {
                    title: score.name,
                    type: score.chartType,
                    difficulty: score.difficulty || Difficulty.Basic,
                    achievement: parseFloat(score.achievement),
                    comboType: score.comboType || ComboType.None,
                    syncType: score.syncType || SyncType.None,
                    dxScore: parseInt(score.dxScore[0]),
                    dxStar: convertDXScoreToStar(score.dxScore[0], score.dxScore[1]),
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

        let updateTime = new Date(latestData.date ? latestData.date : Date.now());

        await interaction.reply({
            content: 'Processing...',
        });

        drawAndSendChart(interaction, updateTime, playerInfo, scores);
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
                        drawAndSendChart(interaction, data.date, playerInfo, scores);
                        break;
                    case 'no':
                        let message = 'Fetching player info...';
                        await interaction.editReply({ content: message, components: [], embeds: [] });

                        playerInfo = (await fetcher.getPlayer(friendCode)) ?? {
                            name: '',
                            avatar: '',
                            rating: 0,
                            title: '',
                            titleType: TitleType.Normal,
                            course: '',
                            classRank: '',
                        };

                        message += [' OK', 'Fetching scores...'].join('\n');
                        await interaction.editReply(message);

                        scores = {};
                        let delay = 1000;
                        const fetchFunction = async (difficulty: string, diffName: string, delay: number) => {
                            await new Promise((resolve) => setTimeout(resolve, delay));
                            let scoreData = await fetcher.getScores(scoreType, friendCode, parseInt(difficulty));
                            scores[diffName] = scoreData.data;
                        };

                        await Promise.all(
                            Object.entries(DifficultyDisplayName)
                                .filter(([Difficulty, diffName]) => diffName !== 'UTAGE')
                                .map(([difficulty, diffName], index) =>
                                    fetchFunction(difficulty, diffName, delay * index),
                                ),
                        );

                        fetcher.savePlayerCacheData(friendCode, {
                            playerData: playerInfo,
                            scoreData: scores,
                        });

                        await interaction.editReply(
                            ['Fetching player info... OK', 'Fetching scores... OK', 'Calculating...'].join('\n'),
                        );

                        drawAndSendChart(interaction, new Date(), playerInfo, scores);
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
                try {
                    interaction.editReply({
                        components: [],
                    });
                } catch (error) {}
            });
        } else {
            let message = 'Fetching player info...';
            await interaction.reply({ content: message });

            playerInfo = (await fetcher.getPlayer(friendCode)) ?? {
                name: '',
                avatar: '',
                rating: 0,
                title: '',
                titleType: TitleType.Normal,
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

            await drawAndSendChart(interaction, new Date(), playerInfo, scores);
        }
    }
}

export { data, execute };
