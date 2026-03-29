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
import { calculateB50, convertDXScoreToStar, getDifficultyEmoji } from 'src/lib/Utils';
import { ChartType, ComboType, Difficulty, ScoreType, SyncType, TitleType } from 'src/lib/CommonEnums';
import { Emojis } from 'src/lib/constant/emojis';
import { ScoreData } from 'types/SongDatabase';
import { PlayerInfo } from 'types/main';
import fs from 'fs';
import { DifficultyDisplayName } from 'src/lib/constant/CommonConstant';
import PlayerDataService from 'src/lib/PlayerDataService';
import { send } from 'process';

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
                            `> ${data.type === ChartType.STD ? Emojis.STD : Emojis.DX} ${getDifficultyEmoji(data.difficulty)} ${data.level} (${data.constant.toFixed(1)})`,
                            `> ${Emojis[data.ranking]}- ${data.achievement.toFixed(4)}% - **${data.rating}**`,
                        ].join('\n');
                    })
                    .join('\n')}`,
                thumbnail: {
                    url: `https://chart.minecraftpeayer.com/api/proxy/img?url=${playerInfo?.avatar}`,
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
                                `> ${data.type === ChartType.STD ? Emojis.STD : Emojis.DX} ${getDifficultyEmoji(data.difficulty)} ${data.level} (${data.constant})`,
                                `> ${Emojis[data.ranking]}- ${data.achievement}% - **${data.rating}**`,
                            ].join('\n');
                        })
                        .join('\n')}`,
                    thumbnail: {
                        url: `https://chart.minecraftpeayer.com/api/proxy/img?url=${playerInfo?.avatar}`,
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
    let optionUser = interaction.options.getUser('user');

    const id = optionUser ? optionUser.id : interaction.user.id;
    const result = await PlayerDataService.getInstance().getPlayerData(interaction, id);

    if (!result) return await interaction.editReply('Failed to get player data');

    const { playerData, scoreData } = result;
    sendB50(interaction, playerData, scoreData);
}

export { data, execute };
