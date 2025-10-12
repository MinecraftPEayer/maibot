export const debug = true;

import { Request, Response } from 'express';
import { Chart } from 'chart.js/auto';
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import { calculateB50, convertDXScoreToStar, FontStack, getRatingBaseImage, initializeFonts } from 'src/lib/Utils';
import { ComboType, Difficulty, SyncType, TitleType } from 'src/lib/CommonEnums';
import { ScoreData } from 'types/SongDatabase';
import { getImageBuffer, drawRoundRect } from 'src/lib/DrawImageUtils';

const TitleTypeName = {
    [TitleType.Normal]: 'Normal',
    [TitleType.Bronze]: 'Bronze',
    [TitleType.Silver]: 'Silver',
    [TitleType.Gold]: 'Gold',
    [TitleType.Rainbow]: 'Rainbow',
};

export async function GET(req: Request, res: Response) {
    initializeFonts();

    let data = JSON.parse(fs.readFileSync(`data/user/890571642139451433/latest.json`, 'utf-8'));

    let scores: {
        [key: string]: ScoreData[];
    } = {};

    for (let key in data.allScores) {
        scores[key] = data.allScores[key].map((score: any) => {
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

    const { B15Data, B35Data } = calculateB50(Object.values(scores).flat());

    const toDrawData = B35Data;

    const chart = createCanvas(1792, 844);
    new Chart(chart as any, {
        type: 'line',
        data: {
            labels: Array.from({ length: toDrawData.length }, (_, i) => i + 1),
            datasets: [
                {
                    label: 'Rating',
                    data: toDrawData.map((score) => score.rating),
                    borderWidth: 8,
                    borderColor: 'rgb(210, 162, 233)',
                },
            ],
        },
        options: {
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.5)',
                        lineWidth: 2,
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        font: {
                            size: 16,
                            family: FontStack,
                        },
                    },
                    title: {
                        display: true,
                        text: 'B35',
                        color: 'rgba(255, 255, 255, 1)',
                    },
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.5)',
                        lineWidth: 2,
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        font: {
                            size: 16,
                            family: FontStack,
                        },
                    },
                    title: {
                        display: true,
                        text: 'Rating',
                        color: 'rgba(255, 255, 255, 1)',
                    },
                },
            },
            plugins: {
                legend: {
                    labels: {
                        color: 'rgba(255, 255, 255, 1)',
                    },
                },
            },
        },
    });

    const playerData = data.playerData;

    const WIDTH = 1920,
        HEIGHT = 1080;

    const canvas = createCanvas(1920, 1080);
    const ctx = canvas.getContext('2d');

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
        await getImageBuffer(`https://chart.minecraftpeayer.me/api/proxy/img?url=${playerData.class}`),
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
    ctx.fillText(playerData.playerName, 180, 106 + 20);

    const courseImg = await loadImage(
        await getImageBuffer(`https://chart.minecraftpeayer.me/api/proxy/img?url=${playerData.course}`),
    );
    ctx.drawImage(courseImg, 341, 104, 71, 28);

    const titleBackImg = await loadImage(
        await getImageBuffer(
            `https://chart.minecraftpeayer.me/api/proxy/img?url=https://maimaidx-eng.com/maimai-mobile/img/trophy_${TitleTypeName[playerData.title.type as keyof typeof TitleTypeName].toLowerCase()}.png`,
        ),
    );

    ctx.drawImage(titleBackImg, 172, 138, 270, 25);

    ctx.font = `16px ${FontStack}`;
    ctx.fillStyle = 'white';
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'black';
    const MaxWidth = 256;
    let text = playerData.title.text.replace(/[\t\n]/g, '');
    if (ctx.measureText(text).width > MaxWidth) {
        while (ctx.measureText(text).width > MaxWidth && text.length > 0) {
            text = text.slice(0, -1);
        }
    }

    let measuredText = ctx.measureText(text);
    ctx.fillText(text, 178 + 128 - measuredText.width / 2, 141 + 16);
    ctx.strokeText(text, 178 + 128 - measuredText.width / 2, 141 + 16);

    ctx.fillStyle = 'white';
    ctx.font = `48px ${FontStack}`;
    ctx.fillText('B35', 478, 76 + 48);
    ctx.font = `36px ${FontStack}`;
    ctx.fillText(`Rating走向`, 478, 76 + 48 + 36);

    ctx.font = `16px ${FontStack}`;
    ctx.fillText(`RANGE`, 709, 100 + 16);
    ctx.fillText(`AVG`, 734, 136 + 16);

    ctx.font = `36px ${FontStack}`;
    ctx.fillText(`${toDrawData[0].rating} / ${toDrawData[toDrawData.length - 1].rating}`, 773, 100 + 16);
    ctx.fillText(
        `${(toDrawData.reduce((acc, score) => acc + score.rating, 0) / toDrawData.length).toFixed(0)}`,
        773,
        136 + 16,
    );

    ctx.drawImage(chart, 64, 172, 1792, 844);

    res.header('Content-Type', 'image/png').send(canvas.toBuffer('image/png'));
}
