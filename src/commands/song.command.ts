import {
    ActionRowBuilder,
    AutocompleteInteraction,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    Colors,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
} from 'discord.js';
import SongDataFetcher from 'src/lib/SongDataFetcher';
import exception from 'config/exception.json';
import { Emojis } from 'src/lib/constant/emojis';
import JSONdb from 'simple-json-db';
import MaimaiDXNetFetcher from 'src/lib/maimaiDXNetFetcher';
import { Difficulty } from 'src/lib/maimaiDXNetEnums';
import { calculateRating, calculateScore } from 'src/lib/Utils';

const chart_type = {
    std: 0,
    dx: 1,
    utage: 2,
};

const DXNetFetcher = MaimaiDXNetFetcher.getInstance();

const data = new SlashCommandBuilder()
    .setName('song')
    .setDescription('song')
    .addStringOption((option) =>
        option
            .setName('name')
            .setDescription('The name of the song')
            .setAutocomplete(true)
            .setRequired(true),
    );

async function execute(interaction: ChatInputCommandInteraction) {
    let songId = interaction.options.getString('name');

    const toggle_dx_std = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('toggle_dx_std')
            .setLabel('DX/STD Switch')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔄'),
    );

    const detailSelector =
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('detail_selector')
                .setPlaceholder('Select difficulty'),
        );

    const myRecord = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('my_record')
            .setLabel('My Record')
            .setStyle(ButtonStyle.Success),
    );

    let song = SongDataFetcher.getInstance().getSong(parseInt(songId || '0'));

    if (!song) {
        return await interaction.reply({
            embeds: [
                {
                    title: '❌ Song Not Found',
                    description: 'The song you requested could not be found.',
                    color: Colors.Red,
                },
            ],
        });
    }

    let components = [];
    if (
        !song.sheets.some((sheet: any) => sheet.type === 'utage') &&
        song.sheets.some((s) => s.type === 'std') &&
        song.sheets.some((s) => s.type === 'dx')
    )
        components.push(toggle_dx_std);
    components.push(myRecord);

    const isUTAGE = song.sheets.some((sheet: any) => sheet.type === 'utage');

    let type: 'dx' | 'std' | 'utage' = isUTAGE
        ? 'utage'
        : !song.sheets.some((s) => s.type === 'std')
          ? 'dx'
          : 'std';

    detailSelector.components[0].addOptions(
        song.sheets
            .filter((sheet) => sheet.type === type)
            .map((sheet) => {
                return {
                    label: `${sheet.difficulty.toUpperCase()}`,
                    value: sheet.difficulty,
                };
            }),
    );
    components.push(detailSelector);

    let owo = await interaction.reply({
        embeds: [
            {
                title: song.title,
                description: `Artist: ${song.artist}\nCategory: ${song.category}\nBPM: ${song.bpm}\nVersion: ${song.version}`,
                fields: song.sheets
                    .filter((sheet) => sheet.type === type)
                    .map((sheet) => {
                        return {
                            name: `${
                                isUTAGE
                                    ? ''
                                    : sheet.type === 'dx'
                                      ? Emojis.DX + ' '
                                      : Emojis.STD + ' '
                            }${sheet.difficulty.toUpperCase()}`,
                            value: `Lv: ${sheet.level}(${sheet.internalLevel ?? sheet.internalLevelValue ?? sheet.level + '.?'})\nNote Designer: ${sheet.noteDesigner}`,
                        };
                    }),
                thumbnail: {
                    url: `https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover-m/${song.imageName}`,
                },
            },
        ],
        components,
    });

    const timeoutFunction = () => {
        collector.emit('end');
    };
    const collector = owo.createMessageComponentCollector({ max: Infinity });
    let timeout = setTimeout(timeoutFunction, 60000);
    collector.on(
        'collect',
        async (
            buttonInteraction: ButtonInteraction | StringSelectMenuInteraction,
        ) => {
            switch (buttonInteraction.customId) {
                case 'toggle_dx_std':
                    if (buttonInteraction.user.id !== interaction.user.id)
                        return;
                    if (isUTAGE)
                        return await buttonInteraction.reply(
                            'Utage sheet is not available for DX/STD switch',
                        );
                    type = type === 'std' ? 'dx' : 'std';
                    await buttonInteraction.update({
                        embeds: [
                            {
                                title: song.title,
                                description: `Artist: ${song.artist}\nCategory: ${song.category}\nBPM: ${song.bpm}\nVersion: ${song.version}`,
                                fields: song.sheets
                                    .filter((sheet: any) => sheet.type === type)
                                    .map((sheet: any) => {
                                        return {
                                            name: `${
                                                isUTAGE
                                                    ? ''
                                                    : sheet.type === 'dx'
                                                      ? Emojis.DX + ' '
                                                      : Emojis.STD + ' '
                                            }${sheet.difficulty.toUpperCase()}`,
                                            value: `Lv: ${sheet.level}(${sheet.internalLevel ?? sheet.internalLevelValue ?? sheet.level + '.?'})\nNote Designer: ${sheet.noteDesigner}`,
                                        };
                                    }),
                                thumbnail: {
                                    url: `https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover-m/${song.imageName}`,
                                },
                            },
                        ],
                        components,
                    });
                    break;

                case 'my_record':
                    let db = new JSONdb('data/linking.json');
                    let friendCode = db.get(buttonInteraction.user.id);
                    if (!friendCode)
                        return await buttonInteraction.reply('你還沒綁定帳號');

                    let message = 'Fetching player info...';

                    await buttonInteraction.reply(message);
                    let playerInfo = await DXNetFetcher.getPlayer(friendCode);

                    let basicScore,
                        advancedScore,
                        expertScore,
                        masterScore,
                        remasterScore,
                        utageScore;

                    const scoreFilter = (s: any) =>
                        s.type === chart_type[type] &&
                        ((exception as any)[s.title] ?? s.title) === song.title;
                    if (!isUTAGE) {
                        message += [
                            ' COMPLETED',
                            'Fetching scores...',
                            '> Fetching BASIC scores...',
                        ].join('\n');

                        await buttonInteraction.editReply(message);
                        basicScore = (
                            await DXNetFetcher.getScores(
                                friendCode,
                                Difficulty.Basic,
                            )
                        ).data.find(scoreFilter);
                        message += [
                            ' COMPLETED',
                            '> Fetching ADVANCED scores...',
                        ].join('\n');

                        await buttonInteraction.editReply(message);
                        advancedScore = (
                            await DXNetFetcher.getScores(
                                friendCode,
                                Difficulty.Advanced,
                            )
                        ).data.find(scoreFilter);
                        message += [
                            ' COMPLETED',
                            '> Fetching EXPERT scores...',
                        ].join('\n');

                        await buttonInteraction.editReply(message);
                        expertScore = (
                            await DXNetFetcher.getScores(
                                friendCode,
                                Difficulty.Expert,
                            )
                        ).data.find(scoreFilter);
                        message += [
                            ' COMPLETED',
                            '> Fetching MASTER scores...',
                        ].join('\n');

                        await buttonInteraction.editReply(message);
                        masterScore = (
                            await DXNetFetcher.getScores(
                                friendCode,
                                Difficulty.Master,
                            )
                        ).data.find(scoreFilter);
                        message += [
                            ' COMPLETED',
                            '> Fetching Re:MASTER scores...',
                        ].join('\n');

                        await buttonInteraction.editReply(message);
                        remasterScore = (
                            await DXNetFetcher.getScores(
                                friendCode,
                                Difficulty.ReMaster,
                            )
                        ).data.find(scoreFilter);
                    } else {
                        message += [
                            ' COMPLETED',
                            'Fetching scores...',
                            '> Fetching UTAGE scores...',
                        ].join('\n');
                        utageScore = (
                            await DXNetFetcher.getScores(
                                friendCode,
                                Difficulty.UTAGE,
                            )
                        ).data.find(scoreFilter);
                    }
                    await buttonInteraction.editReply(
                        [
                            'Fetching player info... COMPLETED',
                            'Fetching scores... COMPLETED',
                            'Calculating...',
                        ].join('\n'),
                    );

                    let scores = [
                        basicScore,
                        advancedScore,
                        expertScore,
                        masterScore,
                        remasterScore,
                        utageScore,
                    ].filter((s) => s !== undefined);

                    let scoreData = calculateScore(scores).data;

                    let syncType = [
                        Emojis.FS_Short,
                        Emojis.FSp_Short,
                        Emojis.FDX_Short,
                        Emojis.FDXp_Short,
                    ];
                    let comboType = [
                        Emojis.FC_Short,
                        Emojis.FCp_Short,
                        Emojis.AP_Short,
                        Emojis.APp_Short,
                    ];

                    buttonInteraction.editReply({
                        content: '',
                        embeds: [
                            {
                                title: song.title,
                                description: `${playerInfo?.name}`,
                                thumbnail: {
                                    url: `https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover-m/${song.imageName}`,
                                },
                                fields: scoreData.map((score) => {
                                    return {
                                        name: `${score.difficulty === Difficulty.UTAGE ? '' : score.type === 'DX' ? Emojis.DX + ' ' : Emojis.STD + ' '}${isUTAGE ? utageScore!.utageKind : Difficulty[score.difficulty].toUpperCase()}`,
                                        value: `${Emojis[score.ranking]} ${score.achievement}%\n${score.comboType !== -1 ? comboType[score.comboType] + ' ' : ' '}${score.syncType !== -1 ? syncType[score.syncType] + ' ' : ' '}`,
                                    };
                                }),
                            },
                        ],
                    });
                    break;

                case 'detail_selector':
                    if (buttonInteraction.user.id !== interaction.user.id)
                        return;
                    buttonInteraction.deferUpdate();
                    let selectedDifficulty = (
                        buttonInteraction as StringSelectMenuInteraction
                    ).values[0];
                    let selectedSheet = song.sheets.find(
                        (sheet) =>
                            sheet.type === type &&
                            sheet.difficulty === selectedDifficulty,
                    );

                    if (!selectedSheet)
                        return await buttonInteraction.reply({
                            content: 'Invalid difficulty selected',
                            ephemeral: true,
                        });

                    interaction.editReply({
                        embeds: [
                            {
                                title: `${song.title} - ${!isUTAGE ? Emojis[selectedSheet.type.toUpperCase() as 'DX' | 'STD'] + ' ' : ''}${selectedSheet.difficulty.toUpperCase()}`,
                                description: [
                                    `Artist: ${song.artist}`,
                                    `Category: ${song.category}`,
                                    `BPM: ${song.bpm}`,
                                    `Version: ${song.version}`,
                                    `Level: ${selectedSheet.level} (${selectedSheet.internalLevelValue})`,
                                    `Note Designer: ${selectedSheet.noteDesigner}`,
                                ].join('\n'),
                                fields: [
                                    {
                                        name: `Note Counts`,
                                        value: [
                                            `${Emojis.Tap} Tap: ${selectedSheet.noteCounts.tap ?? '-'}`,
                                            `${Emojis.Hold} Hold: ${selectedSheet.noteCounts.hold ?? '-'}`,
                                            `${Emojis.Slide} Slide: ${selectedSheet.noteCounts.slide ?? '-'}`,
                                            `${Emojis.Touch} Touch: ${selectedSheet.noteCounts.touch ?? '-'}`,
                                            `${Emojis.Break} Break: ${selectedSheet.noteCounts.break ?? '-'}`,
                                            `Total: ${selectedSheet.noteCounts.total ?? '-'}`,
                                        ].join('\n'),
                                        inline: true,
                                    },
                                    {
                                        name: 'Rating',
                                        value: !isUTAGE
                                            ? [
                                                  `${Emojis['SSS+']} (100.5): ${calculateRating(100.5, selectedSheet.internalLevelValue)}`,
                                                  `${Emojis['SSS']} (100.0): ${calculateRating(100.0, selectedSheet.internalLevelValue)}`,
                                                  `${Emojis['SS+']} (99.5): ${calculateRating(99.5, selectedSheet.internalLevelValue)}`,
                                                  `${Emojis['SS']} (99.0): ${calculateRating(99.0, selectedSheet.internalLevelValue)}`,
                                                  `${Emojis['S+']} (98.0): ${calculateRating(98.0, selectedSheet.internalLevelValue)}`,
                                                  `${Emojis['S']} (97.0): ${calculateRating(97.0, selectedSheet.internalLevelValue)}`,
                                              ].join('\n')
                                            : 'N/A',
                                        inline: true,
                                    },
                                    {
                                        name: 'Regions',
                                        value: Object.entries(
                                            selectedSheet.regions,
                                        )
                                            .map(
                                                (region) =>
                                                    `${region[0].toUpperCase()}: ${region[1] ? '✅' : '❌'}`,
                                            )
                                            .join(', '),
                                    },
                                ],
                                thumbnail: {
                                    url: `https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover-m/${song.imageName}`,
                                },
                            },
                        ],
                        components: [detailSelector],
                    });
            }

            clearTimeout(timeout);
            timeout = setTimeout(timeoutFunction, 60000);
        },
    );

    collector.on('end', async () => {
        await interaction.editReply({ components: [] });
    });
}

async function autocomplete(interaction: AutocompleteInteraction) {
    let focused = interaction.options.getFocused();
    return SongDataFetcher.getInstance().search(focused);
}

export { data, execute, autocomplete };
