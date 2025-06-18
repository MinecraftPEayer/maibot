import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { createCanvas, Image, loadImage, registerFont } from 'canvas';
import JSONdb from 'simple-json-db';
import MaimaiDXNetFetcher from 'src/lib/maimaiDXNetFetcher';
import { calculateB50 } from 'src/lib/Utils';
import axios from 'axios';
import fs from 'fs';

const diffTip = {
    10: '',
    4: 'assets/diff_rem.png',
    3: 'assets/diff_mas.png',
    2: 'assets/diff_exp.png',
    1: 'assets/diff_adv.png',
    0: 'assets/diff_bsc.png',
};

function initializeFonts() {
    const fontPath = 'assets/fonts';

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

const FontStack = '"Noto Sans", "Noto Sans JP", sans-serif';

const ratingBaseImage = {
    normal: 'normal',
    blue: 'blue',
    green: 'green',
    yellow: 'orange',
    red: 'red',
    purple: 'purple',
    bronze: 'bronze',
    silver: 'silver',
    gold: 'gold',
    platinum: 'platinum',
    rainbow: 'rainbow',
};

function getRatingBaseImage(rating: number) {
    if (rating >= 15000) return ratingBaseImage.rainbow;
    if (rating >= 14500) return ratingBaseImage.platinum;
    if (rating >= 14000) return ratingBaseImage.gold;
    if (rating >= 13000) return ratingBaseImage.silver;
    if (rating >= 12000) return ratingBaseImage.bronze;
    if (rating >= 10000) return ratingBaseImage.purple;
    if (rating >= 7000) return ratingBaseImage.red;
    if (rating >= 4000) return ratingBaseImage.yellow;
    if (rating >= 2000) return ratingBaseImage.green;
    if (rating >= 1000) return ratingBaseImage.blue;
    return ratingBaseImage.normal;
}

import sharp from 'sharp';
import { Difficulty } from 'src/lib/maimaiDXNetEnums';

async function getImageBuffer(imageURL: string): Promise<Buffer> {
    try {
        const response = await axios.get(imageURL, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
            },
            validateStatus: (status) => status < 500,
        });
        const buffer = Buffer.from(response.data);
        return await sharp(buffer).png().toBuffer();
    } catch (error) {
        console.error(`Error fetching image from ${imageURL}:`, error);
        return Buffer.alloc(0);
    }
}

const data = new SlashCommandBuilder()
    .setName('chart')
    .setDescription('生成Rating Chart');

async function execute(interaction: ChatInputCommandInteraction) {
    let db = new JSONdb('data/linking.json');
    if (!db.has(interaction.user.id))
        return await interaction.reply('你還沒綁定帳號');

    let message = 'Fetching player info...'

    await interaction.reply(message);

    let friendCode = db.get(interaction.user.id);
    let playerInfo =
        await MaimaiDXNetFetcher.getInstance().getPlayer(friendCode);

    message += [' COMPLETED',
        'Fetching scores...',
        '> Fetching BASIC scores...'
    ].join('\n');
    await interaction.editReply(message);
    let basicScoreData = await MaimaiDXNetFetcher.getInstance().getScores(
        friendCode,
        Difficulty.Basic,
    );
    message += [' COMPLETED',
        '> Fetching ADVANCED scores...'].join('\n');
    await interaction.editReply(message);
    let advancedScoreData = await MaimaiDXNetFetcher.getInstance().getScores(
        friendCode,
        Difficulty.Advanced,
    );
    message += [' COMPLETED',
        '> Fetching EXPERT scores...'].join('\n');
    await interaction.editReply(message);
    let expertScoreData = await MaimaiDXNetFetcher.getInstance().getScores(
        friendCode,
        Difficulty.Expert,
    );
    message += [' COMPLETED',
        '> Fetching MASTER scores...'].join('\n');
    await interaction.editReply(message);
    let masterScoreData = await MaimaiDXNetFetcher.getInstance().getScores(
        friendCode,
        Difficulty.Master,
    );
    message += [' COMPLETED',
        '> Fetching Re:MASTER scores...'].join('\n');
    await interaction.editReply(message);
    let remasterScoreData = await MaimaiDXNetFetcher.getInstance().getScores(
        friendCode,
        Difficulty.ReMaster,
    );
    await interaction.editReply(
        [
            'Fetching player info... COMPLETED',
            'Fetching scores... COMPLETED',
            'Drawing...'
        ].join('\n'),
    );

    const { B15Data, B35Data } = calculateB50([
        ...basicScoreData.data,
        ...advancedScoreData.data,
        ...expertScoreData.data,
        ...masterScoreData.data,
        ...remasterScoreData.data,
    ]);

    initializeFonts();
    console.log('Drawing chart for player:', playerInfo?.name);

    const canvas = createCanvas(1088, 1674);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bgImg = await loadImage('assets/background.png');
    ctx.drawImage(bgImg, 896, 0, 1088, 1620, 0, 0, 1088, 1674);
    ctx.drawImage(bgImg, 896, 0, 1088, 1620, 0, 0, 1088, 1674);

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.roundRect(16, 16, 314, 112, 16);
    ctx.fill();

    const avatarImg = await loadImage(await getImageBuffer(`https://chart.minecraftpeayer.me/api/proxy/img?url=${playerInfo?.avatar}`));

    ctx.drawImage(avatarImg, 24, 24, 96, 96);

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

    const parsedRating =
        `${' '.repeat('00000'.length - rating.toString().length)}${rating}`.split(
            '',
        );

    ctx.fillStyle = 'white';
    ctx.font = `bold 24px ${FontStack}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(parsedRating[0], 206, 102);
    ctx.fillText(parsedRating[1], 224, 102);
    ctx.fillText(parsedRating[2], 241.5, 102);
    ctx.fillText(parsedRating[3], 258.5, 102);
    ctx.fillText(parsedRating[4], 276, 102);

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
                    while (
                        ctx.measureText(title + '...').width > maxWidth &&
                        title.length > 0
                    ) {
                        title = title.slice(0, -1);
                    }
                    title += '...';
                }
                ctx.fillText(title, baseX + 8, baseY + 40);
                ctx.font = currentFont;

                ctx.font = `12px ${FontStack}`;
                ctx.fillText(chartInfo.type, baseX + 8, baseY + 56);

                const difficultyImg = await loadImage(
                    diffTip[chartInfo.difficulty],
                );
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
                ctx.fillText(
                    chartInfo.achievement.toFixed(4),
                    baseX + 8,
                    baseY + 92,
                );
                ctx.font = `bold 24px ${FontStack}`;
                ctx.fillText(chartInfo.ranking, baseX + 8, baseY + 110);

                ctx.textAlign = 'right';
                ctx.font = `12px ${FontStack}`;
                ctx.fillText(
                    chartInfo.constant.toFixed(1),
                    baseX + 184,
                    baseY + 88,
                );
                ctx.font = `bold 32px ${FontStack}`;
                ctx.fillText(
                    chartInfo.rating.toString(),
                    baseX + 184,
                    baseY + 108,
                );
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
                        ),
                    );

                    ctx.save();
                    ctx.beginPath();
                    ctx.roundRect(baseX, baseY, 192, 128, 8);
                    ctx.clip();
                    ctx.drawImage(
                        songImg,
                        0,
                        31,
                        190,
                        128,
                        baseX,
                        baseY,
                        192,
                        128,
                    );
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
                        while (
                            ctx.measureText(title + '...').width > maxWidth &&
                            title.length > 0
                        ) {
                            title = title.slice(0, -1);
                        }
                        title += '...';
                    }
                    ctx.fillText(title, baseX + 8, baseY + 40);
                    ctx.font = currentFont;

                    ctx.font = `12px ${FontStack}`;
                    ctx.fillText(chartInfo.type, baseX + 8, baseY + 56);

                    const difficultyImg = await loadImage(
                        diffTip[chartInfo.difficulty],
                    );
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
                    ctx.fillText(
                        chartInfo.achievement.toFixed(4),
                        baseX + 8,
                        baseY + 92,
                    );
                    ctx.font = `bold 24px ${FontStack}`;
                    ctx.fillText(chartInfo.ranking, baseX + 8, baseY + 110);

                    ctx.textAlign = 'right';
                    ctx.font = `12px ${FontStack}`;
                    ctx.fillText(
                        chartInfo.constant.toFixed(1),
                        baseX + 184,
                        baseY + 88,
                    );
                    ctx.font = `bold 32px ${FontStack}`;
                    ctx.fillText(
                        chartInfo.rating.toString(),
                        baseX + 184,
                        baseY + 108,
                    );
                }
            }
        }
    }

    let attachment = canvas.toBuffer('image/png');
    await interaction.editReply({
        files: [attachment],
    });
}

export { data, execute };
