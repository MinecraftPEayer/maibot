import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Canvas, CanvasRenderingContext2D } from 'skia-canvas';
import JSONdb from 'simple-json-db';
import { calculateB50, getRatingBaseImage, initializeFonts, FontStack } from 'src/lib/Utils';
import fs from 'fs';
import { ChartType, ComboType, Difficulty, ScoreType, SyncType, TitleType } from 'src/lib/CommonEnums';
import { B50Data, Rank, ScoreData } from 'types/SongDatabase';
import { DifficultyColor, VersionColor, NewSongVersion } from 'src/lib/constant/CommonConstant';
import Logger from 'src/lib/logger';
import { PlayerInfo } from 'types/main';
import { drawRoundRect, drawCustomRoundRect, createBlurredBackground } from 'src/lib/DrawImageUtils';
import PlayerDataService from 'src/lib/PlayerDataService';
import RatingChartUtils from 'src/lib/RatingChartUtils';
import ImageHelper from 'src/lib/ImageHelper';

const TitleTypeName = {
    [TitleType.Normal]: 'Normal',
    [TitleType.Bronze]: 'Bronze',
    [TitleType.Silver]: 'Silver',
    [TitleType.Gold]: 'Gold',
    [TitleType.Rainbow]: 'Rainbow',
};

const SyncTypeImageName = {
    [SyncType.SYNC]: 'SYNC',
    [SyncType.FS]: 'FS',
    [SyncType.FSp]: 'FSp',
    [SyncType.FDX]: 'FDX',
    [SyncType.FDXp]: 'FDXp',
};

const ComboTypeImageName = {
    [ComboType.FC]: 'FC',
    [ComboType.FCp]: 'FCp',
    [ComboType.AP]: 'AP',
    [ComboType.APp]: 'APp',
};

const RCUtils = RatingChartUtils.getInstance();

const { loadImage } = ImageHelper.getInstance();

let logger: Logger;

function drawChartType(ctx: CanvasRenderingContext2D, x: number, y: number, chartType: ChartType) {
    let originalFillStyle = ctx.fillStyle,
        originalFont = ctx.font;
    ctx.drawCanvas(RatingChartUtils.ChartTypeCanvas[chartType as ChartType.DX | ChartType.STD], x - 10, y);
    ctx.font = originalFont;
    ctx.fillStyle = originalFillStyle;
}

// style format: { background: ["color", "percentage"], text: "color"}
function drawVersion(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    version: string,
    songBoxDim: { width: number; height: number },
    style: {
        background: Array<[string, number]> | string;
        text: string;
    },
) {
    const width = songBoxDim.width,
        height = 16;

    const originalTextAlign = ctx.textAlign,
        originalTextBaseline = ctx.textBaseline;

    let gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    if (Array.isArray(style.background)) {
        for (let stylePoint of style.background) {
            gradient.addColorStop(stylePoint[1], stylePoint[0]);
        }
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = style.background;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y);
    ctx.fill();

    ctx.fillStyle = style.text;
    ctx.font = `12px ${FontStack}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(version, x + width / 2, y + height / 2);

    ctx.textAlign = originalTextAlign;
    ctx.textBaseline = originalTextBaseline;
}

/**
 *
 * @param ctx CanvasRenderingContext2D
 * @param x Base position X
 * @param y Base position Y
 * @param options Render option
 *
 * @returns Rendered Box Width
 */
async function drawRankCountBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    options: {
        row: number;
        column: number;
        boxConfig: {
            imagePath: string;
            count: number;
        }[];
        radius: {
            topLeft: number;
            topRight: number;
            bottomLeft: number;
            bottomRight: number;
        };
    },
): Promise<number> {
    if (options.boxConfig.length !== options.row * options.column)
        throw new Error('boxConfig length does not match row * column');

    const offset = {
        x: 0,
        y: 0,
    };

    const TotalWidth = options.column * 57 + (options.column - 1) * 2;

    for (let i = 0; i < options.row; i++) {
        for (let j = 0; j < options.column; j++) {
            const box = options.boxConfig[i * options.column + j];
            if (!box) continue;
            drawCustomRoundRect({
                ctx,
                x: x + offset.x + j * (57 + 2), // gap 2px
                y: y + offset.y + i * (53 + 2), // gap 2px
                width: 57,
                height: 26.5,
                radius: {
                    topLeft: i === 0 && j === 0 ? options.radius.topLeft : 2,
                    topRight: i === 0 && j === options.column - 1 ? options.radius.topRight : 2,
                    bottomLeft: 0,
                    bottomRight: 0,
                },
                fillStyle: 'rgba(255, 255, 255, 0.75)',
            });

            drawCustomRoundRect({
                ctx,
                x: x + offset.x + j * (57 + 2), // gap 2px
                y: y + offset.y + i * (53 + 2) + 26.5, // gap 2px
                width: 57,
                height: 26.5,
                radius: {
                    topLeft: 0,
                    topRight: 0,
                    bottomLeft: i === options.row - 1 && j === 0 ? options.radius.bottomLeft : 2,
                    bottomRight: i === options.row - 1 && j === options.column - 1 ? options.radius.bottomRight : 2,
                },
                fillStyle: 'rgba(183, 183, 183, 0.45)',
            });

            ctx.font = `16px ${FontStack}`;
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.fillText(
                box.count.toString(),
                x + offset.x + j * (57 + 2) + 28.5,
                y + offset.y + i * (53 + 2) + 26.5 + 17.25,
            );
            ctx.textAlign = 'left';

            const iconImg = await RCUtils.getAsset(box.imagePath);
            if (!iconImg) {
                logger.warn(`Icon image not found for path: ${box.imagePath}`);
                continue;
            }
            ctx.drawImage(iconImg, x + offset.x + j * (57 + 2) + 7.71, y + offset.y + i * (53 + 2) + 4, 41.57, 18.5);
        }
    }

    return TotalWidth;
}

async function drawSongBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    song: B50Data,
    songBoxDim: { width: number; height: number },
    index: number,
    options?: {
        drawSyncAndCombo?: boolean;
        drawVersion?: boolean;
    },
) {
    const score = song,
        X = x,
        Y = y;

    if (!score) return;

    let songBackgroundImg = await loadImage(
        `https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover-m/${score.backgroundImg}`,
    );

    const scaleWidth = songBoxDim.width / songBackgroundImg.width;
    const scaleHeight = songBoxDim.height / songBackgroundImg.height;
    const scale = Math.max(scaleWidth, scaleHeight);

    const scaledWidth = songBackgroundImg.width * scale;
    const scaledHeight = songBackgroundImg.height * scale;
    const xOffset = (songBoxDim.width - scaledWidth) / 2;
    const yOffset = (songBoxDim.height - scaledHeight) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(X, Y, songBoxDim.width, songBoxDim.height, 8);
    ctx.clip();

    const orignalCtxFilter = ctx.filter;
    ctx.filter = 'blur(4px)';

    ctx.drawImage(songBackgroundImg, X + xOffset, Y + yOffset, scaledWidth, scaledHeight);
    ctx.restore();

    ctx.filter = orignalCtxFilter;

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
        const rainbowColors = ['#FF0000', '#F6FF00', '#7BFF0F', '#00EEFF', '#8B3EF7'];
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

    const chartDiffAndTypeBoxY = options?.drawVersion ? Y + 28 + 16 : Y + 28;

    if (options?.drawVersion) {
        drawVersion(ctx, X, Y + 28, score.version, songBoxDim, {
            background: VersionColor[score.version as keyof typeof VersionColor] as Array<[string, number]>,
            text: 'black',
        });
    }

    ctx.beginPath();
    ctx.moveTo(X, chartDiffAndTypeBoxY);
    ctx.lineTo(X, chartDiffAndTypeBoxY + 28);
    ctx.lineTo(X + (106 - 64), chartDiffAndTypeBoxY + 28);
    ctx.lineTo(X + (120 - 64), chartDiffAndTypeBoxY);
    ctx.lineTo(X, chartDiffAndTypeBoxY);
    ctx.closePath();
    ctx.fillStyle = DifficultyColor[score.difficulty as Difficulty][0];
    ctx.fill();

    ctx.font = `20px ${FontStack}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = DifficultyColor[score.difficulty as Difficulty][1];
    drawBoldText(ctx, score.constant.toString().split('.')[0], X + 3 + 26, chartDiffAndTypeBoxY + 6 + 16, 0.5);
    ctx.textAlign = 'left';

    ctx.font = `12px ${FontStack}`;
    drawBoldText(
        ctx,
        '.' + (score.constant.toString().split('.')[1] ?? '0'),
        X + 30,
        chartDiffAndTypeBoxY + 11 + 10.5,
        0.5,
    );

    if (parseInt(score.constant.toString().split('.')[1]) > 5) {
        ctx.fillText('+', X + 30, chartDiffAndTypeBoxY + 2 + 8);
    }

    drawChartType(ctx, X + 56, chartDiffAndTypeBoxY, score.type);

    ctx.fillStyle = 'white';
    ctx.font = `12px ${FontStack}`;
    ctx.fillText(`${score.achievement.toFixed(4)}%`, X + 6, Y + songBoxDim.height - 6 - 2);

    let RankImg = await RCUtils.getAsset(`assets/ranking/${score.ranking.toLowerCase().replace(/[+]/g, 'plus')}.png`);
    if (!RankImg)
        RankImg = await loadImage(`assets/ranking/${score.ranking.toLowerCase().replace(/[+]/g, 'plus')}.png`);
    ctx.drawImage(RankImg, X + 6, Y + songBoxDim.height - 16 - 20 - 2, 45, 20);

    if (options?.drawSyncAndCombo) {
        let toDraw = [];
        if (score.comboType !== ComboType.None) toDraw.push(ComboTypeImageName[score.comboType]);
        if (score.syncType !== SyncType.None) toDraw.push(SyncTypeImageName[score.syncType]);
        for (let i = 0; i < toDraw.length; i++) {
            const iconImg = await loadImage(`assets/icons/${toDraw[i]}.png`);
            ctx.drawImage(iconImg, X + 49 + 16 * i, Y + 118, 16, 16);
        }
    }

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
    drawIcons?: boolean,
    calculateVersion?: string,
) {
    initializeFonts();
    logger.log('Drawing chart for player:', playerData?.name);
    const { B15Data, B35Data } = calculateB50(Object.values(scores).flat(), calculateVersion);

    const B15RankMapped = B15Data.map((score) => score.ranking);
    const B35RankMapped = B35Data.map((score) => score.ranking);

    const B15RankCounts = B15RankMapped.reduce(
        (acc, rank) => {
            acc[rank] = (acc[rank] || 0) + 1;
            return acc;
        },
        {} as Record<Rank, number>,
    );

    const B35RankCounts = B35RankMapped.reduce(
        (acc, rank) => {
            acc[rank] = (acc[rank] || 0) + 1;
            return acc;
        },
        {} as Record<Rank, number>,
    );

    const RankCategories: Rank[][] = [
        ['SSS+', 'SSS', 'SS+', 'SS', 'S+', 'S'],
        ['AAA', 'AA', 'A', 'BBB', 'BB', 'B'],
        ['C', 'D'],
    ];
    const containCategory = RankCategories.map((category: Rank[]) =>
        category.some((rank) => B15RankMapped.includes(rank) || B35RankMapped.includes(rank)),
    );

    const time1 = Date.now();

    const canvas = new Canvas(WIDTH, HEIGHT);
    if (!canvas) return;

    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    const bgImg = await loadImage('assets/background.png');

    ctx.drawImage(bgImg, 0, 0, WIDTH, HEIGHT);

    if (!fs.existsSync('tmp/bg_blurred.png')) {
        await createBlurredBackground(WIDTH, HEIGHT, bgImg);
    }

    const bgBlur = await loadImage('tmp/bg_blurred.png');
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(30, 30, WIDTH - 60, HEIGHT - 60, 54);
    ctx.clip();
    ctx.drawImage(bgBlur, 30, 30, WIDTH - 60, HEIGHT - 60);
    ctx.restore();

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
    ctx.drawImage(logoImg, 1627, 64, 229, 109);

    drawCustomRoundRect({
        ctx,
        x: 64,
        y: 64,
        width: 390,
        height: 108,
        radius: {
            topLeft: 8,
            topRight: 2,
            bottomLeft: 8,
            bottomRight: 2,
        },
        fillStyle: 'rgba(183, 183, 183, 0.45)',
    });

    const avatarImg = await loadImage(`https://chart.minecraftpeayer.com/api/proxy/img?url=${playerData.avatar}`);
    ctx.drawImage(avatarImg, 72, 72, 92, 92);

    const ratingImg = await loadImage(
        `https://chart.minecraftpeayer.com/api/proxy/img?url=https://maimaidx-eng.com/maimai-mobile/img/rating_base_${getRatingBaseImage(playerData.rating)}.png`,
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

    const classImg = await loadImage(`https://chart.minecraftpeayer.com/api/proxy/img?url=${playerData.classRank}`);
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

    const courseImg = await loadImage(`https://chart.minecraftpeayer.com/api/proxy/img?url=${playerData.course}`);
    ctx.drawImage(courseImg, 341, 104, 71, 28);

    const titleBackImg = await loadImage(
        `https://chart.minecraftpeayer.com/api/proxy/img?url=https://maimaidx-eng.com/maimai-mobile/img/trophy_${TitleTypeName[playerData.titleType].toLowerCase()}.png`,
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

    drawCustomRoundRect({
        ctx,
        x: 456,
        y: 64,
        width: 205,
        height: 108,
        radius: {
            topLeft: 2,
            topRight: 8,
            bottomLeft: 2,
            bottomRight: 8,
        },
        fillStyle: 'rgba(183, 183, 183, 0.45)',
    });

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
        ctx.fillText(
            `(${playerData.rating > B35Total + B15Total ? '-' : '+'}${playerData.rating - (B35Total + B15Total)})`,
            612,
            149 + 16,
        );
    }

    let renderRadius = [];
    let RankCountBoxBaseX = 669,
        RankCountBoxBaseY = 64;
    if (containCategory[0]) {
        let toPush = [8];
        if (containCategory[1] || containCategory[2]) toPush.push(4);
        else toPush.push(8);
        renderRadius.push(toPush);

        const boxWidth = await drawRankCountBox(ctx, RankCountBoxBaseX, RankCountBoxBaseY, {
            row: 2,
            column: 3,
            radius: {
                topLeft: renderRadius[0][0],
                topRight: renderRadius[0][1],
                bottomLeft: renderRadius[0][0],
                bottomRight: renderRadius[0][1],
            },
            boxConfig: [
                {
                    imagePath: 'assets/rank_center/sssplus.png',
                    count: (B35RankCounts['SSS+'] || 0) + (B15RankCounts['SSS+'] || 0),
                },
                {
                    imagePath: 'assets/rank_center/sss.png',
                    count: (B35RankCounts['SSS'] || 0) + (B15RankCounts['SSS'] || 0),
                },
                {
                    imagePath: 'assets/rank_center/ssplus.png',
                    count: (B35RankCounts['SS+'] || 0) + (B15RankCounts['SS+'] || 0),
                },
                {
                    imagePath: 'assets/rank_center/ss.png',
                    count: (B35RankCounts['SS'] || 0) + (B15RankCounts['SS'] || 0),
                },
                {
                    imagePath: 'assets/rank_center/splus.png',
                    count: (B35RankCounts['S+'] || 0) + (B15RankCounts['S+'] || 0),
                },
                {
                    imagePath: 'assets/rank_center/s.png',
                    count: (B35RankCounts['S'] || 0) + (B15RankCounts['S'] || 0),
                },
            ],
        });

        RankCountBoxBaseX += boxWidth + 4;
    }

    if (containCategory[1]) {
        let toPush = [];
        if (containCategory[0]) toPush.push(4);
        else toPush.push(8);
        if (containCategory[2]) toPush.push(4);
        else toPush.push(8);
        renderRadius.push(toPush);

        const boxWidth = await drawRankCountBox(ctx, RankCountBoxBaseX, RankCountBoxBaseY, {
            row: 2,
            column: 3,
            radius: {
                topLeft: renderRadius[1][0],
                topRight: renderRadius[1][1],
                bottomLeft: renderRadius[1][0],
                bottomRight: renderRadius[1][1],
            },
            boxConfig: [
                {
                    imagePath: 'assets/rank_center/aaa.png',
                    count: (B35RankCounts['AAA'] || 0) + (B15RankCounts['AAA'] || 0),
                },
                {
                    imagePath: 'assets/rank_center/aa.png',
                    count: (B35RankCounts['AA'] || 0) + (B15RankCounts['AA'] || 0),
                },
                {
                    imagePath: 'assets/rank_center/a.png',
                    count: (B35RankCounts['A'] || 0) + (B15RankCounts['A'] || 0),
                },
                {
                    imagePath: 'assets/rank_center/bbb.png',
                    count: (B35RankCounts['BBB'] || 0) + (B15RankCounts['BBB'] || 0),
                },
                {
                    imagePath: 'assets/rank_center/bb.png',
                    count: (B35RankCounts['BB'] || 0) + (B15RankCounts['BB'] || 0),
                },
                {
                    imagePath: 'assets/rank_center/b.png',
                    count: (B35RankCounts['B'] || 0) + (B15RankCounts['B'] || 0),
                },
            ],
        });

        RankCountBoxBaseX += boxWidth + 4;
    }

    if (containCategory[2]) {
        let toPush = [];
        if (containCategory[1]) toPush.push(4);
        else toPush.push(8);
        toPush.push(8);
        renderRadius.push(toPush);

        const boxWidth = await drawRankCountBox(ctx, RankCountBoxBaseX, RankCountBoxBaseY, {
            row: 2,
            column: 1,
            radius: {
                topLeft: renderRadius[renderRadius.length - 1][0],
                topRight: renderRadius[renderRadius.length - 1][1],
                bottomLeft: renderRadius[renderRadius.length - 1][0],
                bottomRight: renderRadius[renderRadius.length - 1][1],
            },
            boxConfig: [
                {
                    imagePath: 'assets/rank_center/c.png',
                    count: (B35RankCounts['C'] || 0) + (B15RankCounts['C'] || 0),
                },
                {
                    imagePath: 'assets/rank_center/d.png',
                    count: (B35RankCounts['D'] || 0) + (B15RankCounts['D'] || 0),
                },
            ],
        });

        RankCountBoxBaseX += boxWidth + 4;
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

    const b35Tasks = B35Data.map((score, index) => {
        const i = Math.floor(index / 7);
        const j = index % 7;

        const X = B35BaseX + j * (songBoxDim.width + Gap);
        const Y = B35BaseY + i * (songBoxDim.height + Gap);

        return drawSongBox(ctx, X, Y, score, songBoxDim, index, {
            drawSyncAndCombo: drawIcons,
        });
    });

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

    const b15Tasks = B15Data.map((score, index) => {
        const i = Math.floor(index / 3);
        const j = index % 3;

        const X = B15BaseX + j * (songBoxDim.width + Gap);
        const Y = B15BaseY + i * (songBoxDim.height + Gap);

        return drawSongBox(ctx, X, Y, score, songBoxDim, index, {
            drawSyncAndCombo: drawIcons,
            drawVersion: true,
        });
    });

    await Promise.all(b35Tasks);
    await Promise.all(b15Tasks);

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

    let attachment = await canvas.toBuffer('png');
    try {
        await interaction.editReply({
            content: `Image drawing took ${Date.now() - time1}ms`,
            files: [attachment],
        });
    } catch (error) {
        logger.error('Error sending chart image:', error);
    }
}

const data = new SlashCommandBuilder()
    .setName('chart')
    .setDescription('生成Rating Chart')
    .addUserOption((option) => option.setName('user').setDescription('要查詢的玩家').setRequired(false))
    .addBooleanOption((option) =>
        option.setName('draw_icons').setDescription('是否繪製SYNC/FC/AP圖標 (預設為否)').setRequired(false),
    )
    .addStringOption((option) =>
        option
            .setName('version')
            .setDescription('版本')
            .addChoices(
                Object.keys(NewSongVersion).map((item) => {
                    return { name: item, value: item };
                }),
            )
            .setRequired(false),
    );

const scoreType = ScoreType.Achievement;

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
    logger = new Logger('ChartCommand');
    let db = new JSONdb('data/linking.json');
    let optionUser = interaction.options.getUser('user');
    let optionDrawIcons = interaction.options.getBoolean('draw_icons') ?? false;
    let optionVersion = interaction.options.getString('version') ?? 'CiRCLE';

    if (optionUser && !db.has(optionUser.id)) {
        return await interaction.reply(`${optionUser.username} 還沒綁定帳號`);
    }
    if (!db.has(interaction.user.id)) return await interaction.reply('你還沒綁定帳號');

    let id = optionUser ? optionUser.id : interaction.user.id;

    const result = await PlayerDataService.getInstance().getPlayerData(interaction, id);
    if (!result) return await interaction.editReply('Failed to get player data');

    const { playerData, scoreData } = result;

    await interaction.editReply({ content: 'All done!\nDrawing...', embeds: [], components: [] });
    await drawAndSendChart(interaction, new Date(), playerData, scoreData, optionDrawIcons, optionVersion);
}

export { data, execute };
