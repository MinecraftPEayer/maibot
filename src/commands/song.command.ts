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
    MessageFlags,
    AttachmentBuilder,
} from 'discord.js';
import SongDataFetcher from 'src/lib/SongDataFetcher';
import exception from 'config/exception.json';
import { Emojis } from 'src/lib/constant/emojis';
import { ChartType } from 'src/lib/CommonEnums';
import { calculateRating, sendScore, FontStack, getDifficultyEmoji, initializeFonts } from 'src/lib/Utils';
import { ScoreData, Sheet } from 'types/SongDatabase';
import { DifficultyColor, DifficultyDisplayName } from 'src/lib/constant/CommonConstant';
import PlayerDataService from 'src/lib/PlayerDataService';
import { Canvas, createCanvas, loadImage } from 'canvas';

async function drawScoreTable(notes: {
    tap?: number | null;
    hold?: number | null;
    slide?: number | null;
    touch?: number | null;
    break?: number | null;
}): Promise<Canvas> {
    initializeFonts();

    const tap = notes.tap ?? 0;
    const hold = notes.hold ?? 0;
    const slide = notes.slide ?? 0;
    const touch = notes.touch ?? 0;
    const breakNote = notes.break ?? 0;

    const canvas = createCanvas(786, 212);
    if (!canvas) throw new Error('Failed to create canvas');
    ``;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    const background = await loadImage('./assets/score_table.png');
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    const totalBaseScore = (tap + hold * 2 + slide * 3 + touch + breakNote * 5) * 500;

    const noteTypes: Array<'tap' | 'hold' | 'slide'> = ['tap', 'hold', 'slide'];
    const noteScoreFactors = {
        tap: 1,
        hold: 2,
        slide: 3,
    };
    const judgeFactors = [0.8, 0.5, 0];

    let texts: {
        [key: string]: string[];
    } = {};

    const textBaseXPosition = 157;
    const textBaseYPosition = 60 + 16;

    const textXOffset = 94;
    const textYOffset = 36;
    const textColors = ['#FF9D03', '#FF9D03', '#F75EA3', '#F75EA3', '#F75EA3', '#2FCA4C', '#868686'];

    ctx.textAlign = 'center';
    ctx.font = `16px ${FontStack}`;

    const normalNoteSkipIndex = [0, 1, 2, 4];
    noteTypes.forEach((noteType, index) => {
        const x = textBaseXPosition;
        const y = textBaseYPosition + index * textYOffset;

        const isNull = notes[noteType] === null;

        let judgeIndex = 0;
        for (let i = 0; i < textColors.length; i++) {
            if (normalNoteSkipIndex.includes(i)) continue;
            ctx.fillStyle = isNull ? '#000000' : textColors[i];
            ctx.fillText(
                isNull
                    ? '-'
                    : `-${(((500 * (1 - judgeFactors[judgeIndex]) * noteScoreFactors[noteType]) / totalBaseScore) * 100).toFixed(4)}%`,
                x + i * textXOffset,
                y,
            );
            judgeIndex++;
        }
    });

    for (let noteType of noteTypes) {
        if (!texts[noteType]) texts[noteType] = [];

        if (notes[noteType] === null) {
            texts[noteType] = ['-', '-', '-'];
            continue;
        }

        for (let judge of judgeFactors) {
            texts[noteType].push(
                `-${(((500 * (1 - judge) * noteScoreFactors[noteType]) / totalBaseScore) * 100).toFixed(4)}%`,
            );
        }
    }

    let breakTexts = [
        [0, 25],
        [0, 50],
        [500, 60],
        [1000, 60],
        [1250, 60],
        [1500, 70],
        [2500, 100],
    ].map(
        (item) =>
            `-${(Math.round((item[0] * 100000000) / totalBaseScore + (item[1] * 1000000) / (100 * breakNote)) / 1000000).toFixed(4)}%`,
    );

    breakTexts.forEach((text, index) => {
        const x = textBaseXPosition + index * textXOffset;
        const y = textBaseYPosition + 3 * textYOffset;

        if (notes.break === null) {
            ctx.fillStyle = '#000000';
            ctx.fillText('-', x, y);
            return;
        }

        ctx.fillStyle = textColors[index];
        ctx.fillText(text, x, y);
    });

    return canvas;
}

const data = new SlashCommandBuilder()
    .setName('song')
    .setDescription('song')
    .addStringOption((option) =>
        option.setName('name').setDescription('The name of the song').setAutocomplete(true).setRequired(true),
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

    const detailSelector = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder().setCustomId('detail_selector').setPlaceholder('Select difficulty'),
    );

    const myRecord = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('my_record').setLabel('My Record').setStyle(ButtonStyle.Success),
    );

    let song;
    try {
        song =
            SongDataFetcher.getInstance().getSong(parseInt(songId || '0')) ??
            SongDataFetcher.getInstance().getSongByName(songId || '');
    } catch (error) {
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
        !song.sheets.some((s) => s.type === ChartType.UTAGE) &&
        song.sheets.some((s) => s.type === ChartType.STD) &&
        song.sheets.some((s) => s.type === ChartType.DX)
    )
        components.push(toggle_dx_std);
    components.push(myRecord);

    const isUTAGE = song.sheets.some((sheet: any) => sheet.type === ChartType.UTAGE);

    let type: ChartType = isUTAGE
        ? ChartType.UTAGE
        : !song.sheets.some((s) => s.type === ChartType.STD)
          ? ChartType.DX
          : ChartType.STD;

    detailSelector.components[0].addOptions(
        song.sheets
            .filter((sheet) => sheet.type === type)
            .map((sheet) => {
                return {
                    label: `${isUTAGE ? sheet.utageType : DifficultyDisplayName[sheet.difficulty]}`,
                    value: `${isUTAGE ? sheet.utageType : sheet.difficulty}`,
                };
            }),
    );
    components.push(detailSelector);

    let owo = await interaction.reply({
        embeds: [
            {
                title: song.title,
                description: [
                    `Artist: ${song.artist}`,
                    `Category: ${song.category}`,
                    `BPM: ${song.bpm ?? 'N/A'}`,
                    `Version: ${song.version}`,
                ].join('\n'),
                fields: song.sheets
                    .filter((sheet) => sheet.type === type)
                    .map((sheet) => {
                        return {
                            name: `${
                                isUTAGE
                                    ? Emojis.Utage + ''
                                    : sheet.type === ChartType.DX
                                      ? Emojis.DX + ' '
                                      : Emojis.STD + ' '
                            }${isUTAGE ? sheet.utageType : getDifficultyEmoji(sheet.difficulty)}`,
                            value: [
                                `${isUTAGE ? `-# ${song.comment}\n` : ''}Lv: ${sheet.level}(${sheet.internalLevel ?? sheet.internalLevelValue.toFixed(1) ?? sheet.level + '.?'})`,
                                `Note Designer: ${sheet.noteDesigner ?? 'N/A'}`,
                            ].join('\n'),
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
    collector.on('collect', async (buttonInteraction: ButtonInteraction | StringSelectMenuInteraction) => {
        try {
            switch (buttonInteraction.customId) {
                case 'toggle_dx_std':
                    if (buttonInteraction.user.id !== interaction.user.id) return;
                    if (isUTAGE) return await buttonInteraction.reply('Utage sheet is not available for DX/STD switch');
                    type = type === ChartType.STD ? ChartType.DX : ChartType.STD;
                    await buttonInteraction.update({
                        embeds: [
                            {
                                title: song.title,
                                description: [
                                    `Artist: ${song.artist}`,
                                    `Category: ${song.category}`,
                                    `BPM: ${song.bpm ?? 'N/A'}`,
                                    `Version: ${song.version}`,
                                ].join('\n'),
                                fields: song.sheets
                                    .filter((sheet: any) => sheet.type === type)
                                    .map((sheet: Sheet) => {
                                        return {
                                            name: `${
                                                isUTAGE
                                                    ? Emojis.Utage + ''
                                                    : sheet.type === ChartType.DX
                                                      ? Emojis.DX + ' '
                                                      : Emojis.STD + ' '
                                            }${getDifficultyEmoji(sheet.difficulty)}`,
                                            value: [
                                                `Lv: ${sheet.level} (${sheet.internalLevel ?? sheet.internalLevelValue.toFixed(1) ?? sheet.level + '.?'})`,
                                                `Note Designer: ${sheet.noteDesigner ?? 'N/A'}`,
                                            ].join('\n'),
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
                    const scoreFilter = (s: ScoreData) =>
                        s.type === type && ((exception as any)[s.title] ?? s.title) === song.title;

                    const result = await PlayerDataService.getInstance().getPlayerData(
                        buttonInteraction as ButtonInteraction,
                        buttonInteraction.user.id,
                    );

                    if (!result)
                        return await buttonInteraction.reply({
                            content: 'Failed to get player data',
                            flags: [MessageFlags.Ephemeral],
                        });

                    const { playerData, scoreData } = result;

                    await sendScore(
                        buttonInteraction as ButtonInteraction,
                        song,
                        playerData,
                        scoreData,
                        isUTAGE,
                        scoreFilter,
                    );
                    break;

                case 'detail_selector':
                    if (buttonInteraction.user.id !== interaction.user.id) return;
                    let selectedDifficulty = (buttonInteraction as StringSelectMenuInteraction).values[0];
                    let selectedSheet = song.sheets.find((sheet) =>
                        isUTAGE
                            ? sheet.utageType === selectedDifficulty
                            : sheet.type === type && `${sheet.difficulty}` === selectedDifficulty,
                    );

                    if (!selectedSheet)
                        return await buttonInteraction.reply({
                            content: 'Invalid difficulty selected',
                            flags: [MessageFlags.Ephemeral],
                        });

                    buttonInteraction.deferUpdate();
                    let title = [
                        `${isUTAGE ? song.title.slice(3) : song.title} - ${!isUTAGE ? Emojis[selectedSheet.type === ChartType.DX ? 'DX' : 'STD'] + ' ' : ''}`,
                        getDifficultyEmoji(isUTAGE ? selectedSheet.utageType! : selectedSheet.difficulty),
                    ];

                    const noteCounts = selectedSheet.noteCounts;
                    const totalBaseScore =
                        noteCounts.tap! * 500 +
                        noteCounts.hold! * 1000 +
                        noteCounts.slide! * 1500 +
                        noteCounts.touch! * 500 +
                        noteCounts.break! * 2500;
                    let greatCount = {
                        SSSp: 0,
                        SSS: 0,
                        SSp: 0,
                        SS: 0,
                        Sp: 0,
                        S: 0,
                    };

                    const rankThresholds = {
                        SSSp: 0.5,
                        SSS: 1.0,
                        SSp: 1.5,
                        SS: 2.0,
                        Sp: 3.0,
                        S: 4.0,
                    };

                    const image = await drawScoreTable(noteCounts);
                    const buffer = image.toBuffer('image/png');

                    const attachment = new AttachmentBuilder(buffer, {
                        name: 'score_table.png',
                    });

                    for (let rank in greatCount) {
                        let count = 0;
                        while (
                            ((count * 100) / totalBaseScore) * 100 <
                            rankThresholds[rank as keyof typeof rankThresholds]
                        ) {
                            count++;
                        }
                        greatCount[rank as keyof typeof greatCount] = count - 1;
                    }

                    const totalDXScore = noteCounts.total ? noteCounts.total * 3 : null;

                    interaction.editReply({
                        embeds: [
                            {
                                title:
                                    title.join(' ').length >= 256
                                        ? title[0] + DifficultyDisplayName[selectedSheet.difficulty]
                                        : title.join(' '),
                                description: [
                                    `Artist: ${song.artist}`,
                                    `Category: ${song.category}`,
                                    `BPM: ${song.bpm ?? 'N/A'}`,
                                    `Version: ${song.version}`,
                                    `Level: ${selectedSheet.level} (${selectedSheet.internalLevelValue.toFixed(1)})`,
                                    `Note Designer: ${selectedSheet.noteDesigner ?? 'N/A'}`,
                                ].join('\n'),
                                color: parseInt(DifficultyColor[selectedSheet.difficulty][0].slice(1), 16),
                                fields: [
                                    {
                                        name: `Note Counts`,
                                        value: !Object.values(noteCounts).some((note) => note !== null)
                                            ? 'N/A'
                                            : [
                                                  `${Emojis.Tap} Tap: ${noteCounts.tap ?? '-'}`,
                                                  `${Emojis.Hold} Hold: ${noteCounts.hold ?? '-'}`,
                                                  `${Emojis.Slide} Slide: ${noteCounts.slide ?? '-'}`,
                                                  `${Emojis.Touch} Touch: ${noteCounts.touch ?? '-'}`,
                                                  `${Emojis.Break} Break: ${noteCounts.break ?? '-'}`,
                                                  `Total: ${noteCounts.total ?? '-'}`,
                                              ].join('\n'),
                                        inline: true,
                                    },
                                    {
                                        name: 'Rating',
                                        value: !isUTAGE
                                            ? [
                                                  `${Emojis['SSS+']} (100.5): ${calculateRating(100.5, selectedSheet.internalLevelValue)} (${greatCount.SSSp} Greats)`,
                                                  `${Emojis['SSS']} (100.0): ${calculateRating(100.0, selectedSheet.internalLevelValue)} (${greatCount.SSS} Greats)`,
                                                  `${Emojis['SS+']} (99.5): ${calculateRating(99.5, selectedSheet.internalLevelValue)} (${greatCount.SSp} Greats)`,
                                                  `${Emojis['SS']} (99.0): ${calculateRating(99.0, selectedSheet.internalLevelValue)} (${greatCount.SS} Greats)`,
                                                  `${Emojis['S+']} (98.0): ${calculateRating(98.0, selectedSheet.internalLevelValue)} (${greatCount.Sp} Greats)`,
                                                  `${Emojis['S']} (97.0): ${calculateRating(97.0, selectedSheet.internalLevelValue)} (${greatCount.S} Greats)`,
                                              ].join('\n')
                                            : 'N/A',
                                        inline: true,
                                    },
                                    {
                                        name: 'DX Score',
                                        value: totalDXScore
                                            ? [
                                                  `${Emojis['DXStar_5']}: -${totalDXScore - Math.ceil(totalDXScore * 0.97)} (${Math.ceil(totalDXScore * 0.97)} / ${totalDXScore})`,
                                                  `${Emojis['DXStar_4']}: -${totalDXScore - Math.ceil(totalDXScore * 0.95)} (${Math.ceil(totalDXScore * 0.95)} / ${totalDXScore})`,
                                                  `${Emojis['DXStar_3']}: -${totalDXScore - Math.ceil(totalDXScore * 0.93)} (${Math.ceil(totalDXScore * 0.93)} / ${totalDXScore})`,
                                                  `${Emojis['DXStar_2']}: -${totalDXScore - Math.ceil(totalDXScore * 0.9)} (${Math.ceil(totalDXScore * 0.9)} / ${totalDXScore})`,
                                                  `${Emojis['DXStar_1']}: -${totalDXScore - Math.ceil(totalDXScore * 0.85)} (${Math.ceil(totalDXScore * 0.85)} / ${totalDXScore})`,
                                              ].join('\n')
                                            : 'N/A',
                                    },
                                    {
                                        name: 'Regions',
                                        value: Object.entries(selectedSheet.regions)
                                            .map((region) => `${region[0].toUpperCase()}: ${region[1] ? '✅' : '❌'}`)
                                            .join(', '),
                                    },
                                ],
                                image: {
                                    url: `attachment://score_table.png`,
                                },
                                thumbnail: {
                                    url: `https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover-m/${song.imageName}`,
                                },
                            },
                        ],
                        components: [detailSelector],
                        files: [attachment],
                    });
                    break;
            }

            clearTimeout(timeout);
            timeout = setTimeout(timeoutFunction, 60000);
        } catch (error) {
            console.error(error);
        }
    });

    collector.on('end', async () => {
        try {
            await interaction.editReply({ components: [] });
        } catch (error) {}
    });
}

async function autocomplete(interaction: AutocompleteInteraction) {
    let focused = interaction.options.getFocused();
    return SongDataFetcher.getInstance().search(focused);
}

export { data, execute, autocomplete };
