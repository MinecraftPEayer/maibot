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
import { getImageBuffer, drawRoundRect } from 'src/lib/DrawImageUtils';
import { Canvas, createCanvas, loadImage } from 'canvas';
import { DifficultyDisplayName, TitleTypeName } from 'src/lib/constant/CommonConstant';
import Chart from 'chart.js/auto';
import MaimaiDXNetFetcher from 'src/lib/maimaiDXNetFetcher';

let logger;

const WIDTH = 1920,
    HEIGHT = 1080;

const scoreType = ScoreType.Achievement;
const diffs = [Difficulty.Basic, Difficulty.Advanced, Difficulty.Expert, Difficulty.Master, Difficulty.ReMaster];

const DrawChart: {
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

async function drawAndSendChart(
    interaction: ChatInputCommandInteraction,
    updateTime: Date,
    playerData: PlayerInfo,
    scores: { [key: string]: ScoreData[] },
    chartType: keyof typeof DrawChart,
) {
    initializeFonts();
    const { B15Data, B35Data } = calculateB50(Object.values(scores).flat());

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
            `https://chart.minecraftpeayer.me/api/proxy/img?url=https://maimaidx-eng.com/maimai-mobile/img/trophy_${TitleTypeName[playerData.titleType as keyof typeof TitleTypeName].toLowerCase()}.png`,
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

    await DrawChart[chartType](canvas, {
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
    .setName('analyze')
    .setDescription('Analyzing something')
    .addStringOption((option) =>
        option
            .setName('type')
            .setDescription('Chart type you want to draw')
            .addChoices(Object.keys(DrawChart).map((key) => ({ name: key, value: key })))
            .setRequired(true),
    )
    .addUserOption((option) => option.setName('user').setDescription('The user to analyze').setRequired(false));

async function execute(interaction: ChatInputCommandInteraction) {
    logger = interaction.client.logger;
    const user = interaction.options.getUser('user') || interaction.user;
    const type = interaction.options.getString('type') as keyof typeof DrawChart;
    const db = new JSONdb(`data/linking.json`);

    const fetcher = MaimaiDXNetFetcher.getInstance();

    let scores: {
        [key: string]: ScoreData[];
    } = {};

    let playerInfo: PlayerInfo = {
        name: ' ',
        avatar: 'https://maimaidx-eng.com/maimai-mobile/img/Icon/34f0363f4ce86d07.png',
        rating: 0,
        title: ' ',
        titleType: TitleType.Normal,
        course: 'https://maimaidx-eng.com/maimai-mobile/img/course/course_rank_00T7GHJvGe.png',
        classRank: 'https://maimaidx-eng.com/maimai-mobile/img/class/class_rank_s_00ZqZmdpb8.png',
    };

    if (fs.existsSync(`data/user/${user.id}/latest.json`)) {
        let latestData = JSON.parse(fs.readFileSync(`data/user/${user.id}/latest.json`, 'utf-8'));

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

        await drawAndSendChart(interaction, updateTime, playerInfo, scores, type);
    } else {
        if (user && !db.has(user.id)) {
            return await interaction.reply(`${user.username} 還沒綁定帳號`);
        }
        if (!db.has(interaction.user.id)) return await interaction.reply('你還沒綁定帳號');

        let id = user ? user.id : interaction.user.id;

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
                        drawAndSendChart(interaction, data.date, playerInfo, scores, type);
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

                        drawAndSendChart(interaction, new Date(), playerInfo, scores, type);
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

            await drawAndSendChart(interaction, new Date(), playerInfo, scores, type);
        }
    }
}

export { data, execute };
