import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from 'discord.js';
import JSONdb from 'simple-json-db';
import { ComboType, Difficulty, ScoreType, SyncType, TitleType } from 'src/lib/CommonEnums';
import { PlayerInfo } from 'types/main';
import { B50Data, ScoreData } from 'types/SongDatabase';
import fs from 'fs';
import { calculateB50, convertDXScoreToStar, FontStack, getRatingBaseImage, initializeFonts } from 'src/lib/Utils';
import { getImageBuffer, drawRoundRect, createBlurredBackground } from 'src/lib/DrawImageUtils';
import { Canvas, createCanvas, loadImage } from 'canvas';
import { DifficultyDisplayName, TitleTypeName } from 'src/lib/constant/CommonConstant';
import Chart from 'chart.js/auto';
import MaimaiDXNetFetcher from 'src/lib/maimaiDXNetFetcher';
import PlayerDataService from 'src/lib/PlayerDataService';

let logger;

const WIDTH = 1920,
    HEIGHT = 1080;

const scoreType = ScoreType.Achievement;
const diffs = [Difficulty.Basic, Difficulty.Advanced, Difficulty.Expert, Difficulty.Master, Difficulty.ReMaster];

const DrawGraph: {
    [name: string]: (canvas: Canvas, ...args: any[]) => Promise<void>;
} = {
    B15: async (
        canvas: Canvas,
        drawingData: {
            B15: B50Data[];
            B35: B50Data[];
        },
    ) => {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.font = `48px ${FontStack}`;
        ctx.fillText('B15', 478, 76 + 48);
        ctx.font = `36px ${FontStack}`;
        ctx.fillText(`Rating走向`, 478, 76 + 48 + 36);

        ctx.font = `16px ${FontStack}`;
        ctx.fillText(`RANGE`, 709, 100 + 16);
        ctx.fillText(`AVG`, 734, 136 + 16);

        ctx.font = `36px ${FontStack}`;
        ctx.fillText(
            `${drawingData.B15[0].rating} / ${drawingData.B15[drawingData.B15.length - 1].rating}`,
            773,
            100 + 16,
        );
        ctx.fillText(
            `${(drawingData.B15.reduce((acc, score) => acc + score.rating, 0) / drawingData.B15.length).toFixed(0)}`,
            773,
            136 + 16,
        );

        const chart = createCanvas(1792, 844);
        new Chart(chart as any, {
            type: 'line',
            data: {
                labels: Array.from({ length: drawingData.B15.length }, (_, i) => i + 1),
                datasets: [
                    {
                        label: 'Rating',
                        data: drawingData.B15.map((score) => score.rating),
                        borderWidth: 8,
                        borderColor: 'rgb(128, 196, 228)',
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
                            text: 'B15',
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

        ctx.drawImage(chart, 64, 172, 1792, 844);
    },
    B35: async (
        canvas: Canvas,
        drawingData: {
            B15: B50Data[];
            B35: B50Data[];
        },
    ) => {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.font = `48px ${FontStack}`;
        ctx.fillText('B35', 478, 76 + 48);
        ctx.font = `36px ${FontStack}`;
        ctx.fillText(`Rating走向`, 478, 76 + 48 + 36);

        ctx.font = `16px ${FontStack}`;
        ctx.fillText(`RANGE`, 709, 100 + 16);
        ctx.fillText(`AVG`, 734, 136 + 16);

        ctx.font = `36px ${FontStack}`;
        ctx.fillText(
            `${drawingData.B35[0].rating} / ${drawingData.B35[drawingData.B35.length - 1].rating}`,
            773,
            100 + 16,
        );
        ctx.fillText(
            `${(drawingData.B35.reduce((acc, score) => acc + score.rating, 0) / drawingData.B35.length).toFixed(0)}`,
            773,
            136 + 16,
        );

        const chart = createCanvas(1792, 844);
        new Chart(chart as any, {
            type: 'line',
            data: {
                labels: Array.from({ length: drawingData.B35.length }, (_, i) => i + 1),
                datasets: [
                    {
                        label: 'Rating',
                        data: drawingData.B35.map((score) => score.rating),
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

        ctx.drawImage(chart, 64, 172, 1792, 844);
    },
};

async function drawAndSendGraph(
    interaction: ChatInputCommandInteraction,
    updateTime: Date,
    playerData: PlayerInfo,
    scores: { [key: string]: ScoreData[] },
    graphType: keyof typeof DrawGraph,
) {
    initializeFonts();
    const { B15Data, B35Data } = calculateB50(Object.values(scores).flat(), 'CiRCLE');

    const canvas = createCanvas(1920, 1080);
    const ctx = canvas.getContext('2d');

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
        await getImageBuffer(`https://chart.minecraftpeayer.com/api/proxy/img?url=${playerData.avatar}`),
    );
    ctx.drawImage(avatarImg, 72, 72, 92, 92);

    const ratingImg = await loadImage(
        await getImageBuffer(
            `https://chart.minecraftpeayer.com/api/proxy/img?url=https://maimaidx-eng.com/maimai-mobile/img/rating_base_${getRatingBaseImage(playerData.rating)}.png`,
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
        await getImageBuffer(`https://chart.minecraftpeayer.com/api/proxy/img?url=${playerData.classRank}`),
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
        await getImageBuffer(`https://chart.minecraftpeayer.com/api/proxy/img?url=${playerData.course}`),
    );
    ctx.drawImage(courseImg, 341, 104, 71, 28);

    const titleBackImg = await loadImage(
        await getImageBuffer(
            `https://chart.minecraftpeayer.com/api/proxy/img?url=https://maimaidx-eng.com/maimai-mobile/img/trophy_${TitleTypeName[playerData.titleType as keyof typeof TitleTypeName].toLowerCase()}.png`,
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

    await DrawGraph[graphType](canvas, {
        B35: B35Data,
        B15: B15Data,
    });

    await interaction.editReply({
        content: '',
        files: [
            {
                attachment: canvas.toBuffer('image/png'),
                name: 'image.png',
            },
        ],
    });
}

const data = new SlashCommandBuilder()
    .setName('graph')
    .setDescription('Draw some graph')
    .addStringOption((option) =>
        option
            .setName('type')
            .setDescription('Graph type you want to draw')
            .addChoices(Object.keys(DrawGraph).map((key) => ({ name: key, value: key })))
            .setRequired(true),
    )
    .addUserOption((option) => option.setName('user').setDescription('The user to draw').setRequired(false));

async function execute(interaction: ChatInputCommandInteraction) {
    logger = interaction.client.logger;
    const user = interaction.options.getUser('user') || interaction.user;
    const type = interaction.options.getString('type') as keyof typeof DrawGraph;

    const result = await PlayerDataService.getInstance().getPlayerData(interaction, user.id);

    if (!result) return await interaction.editReply('Failed to get player data');

    const { playerData, scoreData } = result;

    await interaction.editReply({ content: 'Drawing...', embeds: [], components: [] });

    await drawAndSendGraph(interaction, new Date(), playerData, scoreData, type);
}

export { data, execute };
