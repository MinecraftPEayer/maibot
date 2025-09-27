import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from 'discord.js';
import JSONdb from 'simple-json-db';
import MaimaiDXNetFetcher from 'src/lib/maimaiDXNetFetcher';
import {
    calculateB50,
    convertDXScoreToStar,
    getChartTypeFromName,
    getDifficultyEmoji,
    getDifficultyIdFromName,
} from 'src/lib/Utils';
import { ComboType, Difficulty, ScoreType, SyncType } from 'src/lib/CommonEnums';
import { Emojis } from 'src/lib/constant/emojis';
import { ScoreData } from 'types/SongDatabase';
import fs from 'fs';
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

const TypeText = ['B15', 'B35'];

const scoreType = ScoreType.Achievement;

async function sendB50(
    interaction: ChatInputCommandInteraction,
    playerInfo: PlayerInfo,
    scores: {
        [key: string]: ScoreData[];
    },
) {
    const { B15Data, B35Data } = calculateB50(Object.values(scores).flat());
    let B50Data = [B15Data, B35Data];

    const rating =
        B15Data.map((item) => item.rating).reduce((a, b) => a + b, 0) +
        B35Data.map((item) => item.rating).reduce((a, b) => a + b, 0);

    let B15B35ActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('toggle_b15b35')
            .setLabel('Toggle B15/B35')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Primary),
    );

    let pageActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('previous_page')
            .setLabel('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId('next_page')
            .setLabel('▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(B15Data.length <= 10),
    );

    let page = 0;
    let currentType = 0;

    let owo = await interaction.editReply({
        content: '',
        embeds: [
            {
                title: playerInfo?.name || '',
                description: `Rating: ${rating}\n\n${B50Data[currentType]
                    .slice(page * 10, page * 10 + 10)
                    .map((data) => {
                        return [
                            `**#${B50Data[currentType].indexOf(data) + 1} ${data.title}**`,
                            `> ${data.type === 'STD' ? Emojis.STD : Emojis.DX} ${getDifficultyEmoji(data.difficulty)} ${data.level} (${data.constant.toFixed(1)})`,
                            `> ${Emojis[data.ranking]}- ${data.achievement.toFixed(4)}% - **${data.rating}**`,
                        ].join('\n');
                    })
                    .join('\n')}`,
                thumbnail: {
                    url: `https://chart.minecraftpeayer.me/api/proxy/img?url=${playerInfo?.avatar}`,
                },
                footer: {
                    text: `${TypeText[currentType]} Page ${page + 1} / ${Math.ceil(B50Data[currentType].length / 10)}`,
                },
            },
        ],
        components: [B15B35ActionRow, pageActionRow],
    });

    let filter = (i: any) => i.user.id === interaction.user.id;
    let collector = owo.createMessageComponentCollector({
        filter,
        max: Infinity,
    });

    const timeoutFunction = () => {
        collector.emit('end');
    };

    let timeout = setTimeout(timeoutFunction, 60000);

    collector.on('collect', async (actionInteraction: ButtonInteraction) => {
        clearTimeout(timeout);
        timeout = setTimeout(timeoutFunction, 60000);

        switch (actionInteraction.customId) {
            case 'toggle_b15b35':
                currentType = currentType === 0 ? 1 : 0;
                page = 0;
                break;

            case 'previous_page':
                if (page > 0) {
                    page--;
                }
                break;

            case 'next_page':
                if (page < Math.floor(B50Data[currentType].length / 10)) {
                    page++;
                }
                break;

            default:
                return;
        }

        if (page == 0) pageActionRow.components[0].setDisabled(true);
        else pageActionRow.components[0].setDisabled(false);

        if (page == Math.floor(B50Data[currentType].length / 10)) pageActionRow.components[1].setDisabled(true);
        else pageActionRow.components[1].setDisabled(false);

        await actionInteraction.update({
            embeds: [
                new EmbedBuilder({
                    title: playerInfo?.name,
                    description: `Rating: ${rating}\n\n${B50Data[currentType]
                        .slice(page * 10, page * 10 + 10)
                        .map((data) => {
                            return [
                                `**#${B50Data[currentType].indexOf(data) + 1} ${data.title}**`,
                                `> ${data.type === 'STD' ? Emojis.STD : Emojis.DX} ${getDifficultyEmoji(data.difficulty)} ${data.level} (${data.constant})`,
                                `> ${Emojis[data.ranking]}- ${data.achievement}% - **${data.rating}**`,
                            ].join('\n');
                        })
                        .join('\n')}`,
                    thumbnail: {
                        url: `https://chart.minecraftpeayer.me/api/proxy/img?url=${playerInfo?.avatar}`,
                    },
                    footer: {
                        text: `${TypeText[currentType]} Page ${page + 1} / ${Math.ceil(
                            B50Data[currentType].length / 10,
                        )}`,
                    },
                }),
            ],
            components: [B15B35ActionRow, pageActionRow],
        });
    });

    collector.on('end', async () => {
        try {
            await interaction.editReply({
                components: [],
            });
        } catch (e) {}
    });
}

const data = new SlashCommandBuilder()
    .setName('b50')
    .setDescription('獲取B50')
    .addUserOption((option) => option.setName('user').setDescription('要查詢的玩家').setRequired(false));

async function execute(interaction: ChatInputCommandInteraction) {
    let db = new JSONdb('data/linking.json');
    let optionUser = interaction.options.getUser('user');

    let scores: {
        [key: string]: ScoreData[];
    } = {};

    let playerInfo: PlayerInfo = {
        name: '',
        avatar: '',
        rating: '',
        title: '',
        titleType: '',
        course: '',
        classRank: '',
    };

    const fetcher = MaimaiDXNetFetcher.getInstance();

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

        sendB50(interaction, playerInfo, scores);
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
                        });
                        sendB50(interaction, playerInfo, scores);
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

                        sendB50(interaction, playerInfo, scores);
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
                    await interaction.editReply({
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

            sendB50(interaction, playerInfo, scores);
        }
    }
}

export { data, execute };
