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
import { calculateB50 } from 'src/lib/Utils';
import { Difficulty } from 'src/lib/maimaiDXNetEnums';
import { Emojis } from 'src/lib/constant/emojis';

const diffText = {
    [Difficulty.Basic]: 'basic',
    [Difficulty.Advanced]: 'advanced',
    [Difficulty.Expert]: 'expert',
    [Difficulty.Master]: 'master',
    [Difficulty.ReMaster]: 'remaster',
    [Difficulty.UTAGE]: 'utage',
};

const TypeText = ['B15', 'B35'];

const data = new SlashCommandBuilder().setName('b50').setDescription('獲取B50');

async function execute(interaction: ChatInputCommandInteraction) {
    let db = new JSONdb('data/linking.json');
    if (!db.has(interaction.user.id))
        return await interaction.reply('你還沒綁定帳號');

    let message = 'Fetching player info...';

    await interaction.reply(message);

    let friendCode = db.get(interaction.user.id);
    let playerInfo =
        await MaimaiDXNetFetcher.getInstance().getPlayer(friendCode);

    message += [
        ' COMPLETED',
        'Fetching scores...',
        '> Fetching BASIC scores...',
    ].join('\n');
    await interaction.editReply(message);
    let basicScoreData = await MaimaiDXNetFetcher.getInstance().getScores(
        friendCode,
        Difficulty.Basic,
    );
    message += [' COMPLETED', '> Fetching ADVANCED scores...'].join('\n');
    await interaction.editReply(message);
    let advancedScoreData = await MaimaiDXNetFetcher.getInstance().getScores(
        friendCode,
        Difficulty.Advanced,
    );
    message += [' COMPLETED', '> Fetching EXPERT scores...'].join('\n');
    await interaction.editReply(message);
    let expertScoreData = await MaimaiDXNetFetcher.getInstance().getScores(
        friendCode,
        Difficulty.Expert,
    );
    message += [' COMPLETED', '> Fetching MASTER scores...'].join('\n');
    await interaction.editReply(message);
    let masterScoreData = await MaimaiDXNetFetcher.getInstance().getScores(
        friendCode,
        Difficulty.Master,
    );
    message += [' COMPLETED', '> Fetching Re:MASTER scores...'].join('\n');
    await interaction.editReply(message);
    let remasterScoreData = await MaimaiDXNetFetcher.getInstance().getScores(
        friendCode,
        Difficulty.ReMaster,
    );
    await interaction.editReply(
        [
            'Fetching player info... COMPLETED',
            'Fetching scores... COMPLETED',
            'Calculating...',
        ].join('\n'),
    );

    const { B15Data, B35Data } = calculateB50([
        ...basicScoreData.data,
        ...advancedScoreData.data,
        ...expertScoreData.data,
        ...masterScoreData.data,
        ...remasterScoreData.data,
    ]);
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
                            `> ${data.type === 'STD' ? Emojis.STD : Emojis.DX} ${diffText[data.difficulty].toUpperCase()} ${data.level} (${data.constant.toFixed(1)})`,
                            `> ${Emojis[data.ranking]}- **${data.rating}**`,
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

        if (page == Math.floor(B50Data[currentType].length / 10))
            pageActionRow.components[1].setDisabled(true);
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
                                `> ${data.type === 'STD' ? Emojis.STD : Emojis.DX} ${diffText[data.difficulty].toUpperCase()} ${data.level} (${data.constant})`,
                                `> ${Emojis[data.ranking]}- **${data.rating}**`,
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
        await interaction.editReply({
            components: [],
        });
    });
}

export { data, execute };
