import {
    ActionRowBuilder,
    AutocompleteInteraction,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
} from 'discord.js';
import { ChartType, ComboType, SyncType } from 'src/lib/CommonEnums';
import { Emojis } from 'src/lib/constant/emojis';
import PlayerDataService from 'src/lib/PlayerDataService';
import SongDataFetcher from 'src/lib/SongDataFetcher';
import { getDifficultyEmoji } from 'src/lib/Utils';
import { Difficulty, ScoreData } from 'types/SongDatabase';

const data = new SlashCommandBuilder()
    .setName('scores')
    .setDescription('Get the scores of a player')
    .addUserOption((option) => option.setName('user').setDescription('The user to get scores for'))
    .addNumberOption((option) =>
        option
            .setName('max_level')
            .setDescription('The maximum level to include in the results')
            .setMaxValue(15)
            .setMinValue(1),
    )
    .addNumberOption((option) =>
        option
            .setName('min_level')
            .setDescription('The minimum level to include in the results')
            .setMaxValue(15)
            .setMinValue(1),
    )
    .addStringOption((option) =>
        option
            .setName('genre')
            .setDescription('The genres of scores to include (can include multiple, separated by commas)')
            .setAutocomplete(true),
    )
    .addStringOption((option) =>
        option
            .setName('version')
            .setDescription('The version of the game to filter scores by (can include multiple, separated by commas)')
            .setAutocomplete(true),
    )
    .addStringOption((option) =>
        option
            .setName('chart_type')
            .setDescription('The chart types to include (can include multiple, separated by commas)')
            .setChoices({ name: 'でらっくす', value: 'dx' }, { name: 'スタンダード', value: 'std' }),
    )
    .addStringOption((option) =>
        option
            .setName('difficulty')
            .setDescription('The difficulty level of the scores to include (can include multiple, separated by commas)')
            .setAutocomplete(true),
    );

const sortFunction: { [key: string]: (a: ScoreData, b: ScoreData) => number } = {
    title: (a, b) => a.title.localeCompare(b.title),
    title_reverse: (a, b) => b.title.localeCompare(a.title),
    achievement: (a, b) => b.achievement - a.achievement,
    achievement_reverse: (a, b) => a.achievement - b.achievement,
    dxScore: (a, b) => (a.dxScore !== undefined && b.dxScore !== undefined ? b.dxScore - a.dxScore : 0),
    dxScore_reverse: (a, b) => (a.dxScore !== undefined && b.dxScore !== undefined ? a.dxScore - b.dxScore : 0),
    level: (a, b) => {
        const dataFetcher = SongDataFetcher.getInstance();
        const songA = dataFetcher.getSongByName(a.title);
        const songB = dataFetcher.getSongByName(b.title);

        const sheetA = songA.sheets.find((sheet) => sheet.difficulty === a.difficulty);
        const sheetB = songB.sheets.find((sheet) => sheet.difficulty === b.difficulty);

        if (sheetA && sheetB) {
            return sheetB.internalLevelValue - sheetA.internalLevelValue;
        } else {
            return 0;
        }
    },
    level_reverse: (a, b) => {
        const dataFetcher = SongDataFetcher.getInstance();
        const songA = dataFetcher.getSongByName(a.title);
        const songB = dataFetcher.getSongByName(b.title);

        const sheetA = songA.sheets.find((sheet) => sheet.difficulty === a.difficulty);
        const sheetB = songB.sheets.find((sheet) => sheet.difficulty === b.difficulty);

        if (sheetA && sheetB) {
            return sheetA.internalLevelValue - sheetB.internalLevelValue;
        } else {
            return 0;
        }
    },
};

const comboTypeReflection = {
    [ComboType.APp]: Emojis.APp_Short,
    [ComboType.AP]: Emojis.AP_Short,
    [ComboType.FCp]: Emojis.FCp_Short,
    [ComboType.FC]: Emojis.FC_Short,
    [ComboType.None]: '',
};

const syncTypeReflection = {
    [SyncType.FDXp]: Emojis.FDXp_Short,
    [SyncType.FDX]: Emojis.FDX_Short,
    [SyncType.FSp]: Emojis.FSp_Short,
    [SyncType.FS]: Emojis.FS_Short,
    [SyncType.SYNC]: Emojis.SYNC,
    [SyncType.None]: '',
};

const SortMethodDisplayName = {
    title: 'Title (A-Z)',
    title_reverse: 'Title (Z-A)',
    achievement: 'Achievement (High to Low)',
    achievement_reverse: 'Achievement (Low to High)',
    level: 'Level (High to Low)',
    level_reverse: 'Level (Low to High)',
};

async function execute(interaction: ChatInputCommandInteraction) {
    const dataFetcher = SongDataFetcher.getInstance();

    const user = interaction.options.getUser('user') || interaction.user;
    const maxLevel = interaction.options.getNumber('max_level');
    const minLevel = interaction.options.getNumber('min_level');
    const difficulty = interaction.options
        .getString('difficulty')
        ?.split(',')
        .map((s) => s.trim());
    const genre = interaction.options
        .getString('genre')
        ?.split(',')
        .map((s) => s.trim());
    const version = interaction.options
        .getString('version')
        ?.split(',')
        .map((s) => s.trim());
    const chartType =
        interaction.options.getString('chart_type') === null
            ? null
            : interaction.options.getString('chart_type') === 'dx'
              ? ChartType.DX
              : ChartType.STD;

    const availableGenres = SongDataFetcher.genres;
    const availableVersions = SongDataFetcher.versions.map((v) => v.version);
    const availableDifficulties = SongDataFetcher.difficulties.map((d) => d.name);

    const FilterDisplayText = `Filters:\nGenres: ${genre ? genre.join(', ') : 'All'}\nVersions: ${version ? version.join(', ') : 'All'}\nChart Type: ${chartType === null ? 'All' : chartType === ChartType.DX ? 'DX' : 'STD'}\nDifficulty: ${difficulty ? difficulty.join(', ') : 'All'}\nLevel: ${minLevel ?? '1.0'} - ${maxLevel ?? '15.0'}`;

    if (genre && genre.some((g) => !availableGenres.includes(g))) {
        await interaction.reply({
            content: `Invalid genre(s) provided. Available genres are: ${availableGenres.join(', ')}`,
            ephemeral: true,
        });
        return;
    }

    if (version && version.some((v) => !availableVersions.includes(v))) {
        await interaction.reply({
            content: `Invalid version(s) provided. Available versions are: ${availableVersions.join(', ')}`,
            ephemeral: true,
        });
        return;
    }

    if (difficulty && difficulty.some((d) => !availableDifficulties.includes(d))) {
        await interaction.reply({
            content: `Invalid difficulty level(s) provided. Available difficulties are: ${availableDifficulties.join(', ')}`,
            ephemeral: true,
        });
        return;
    }

    if (minLevel && maxLevel && minLevel > maxLevel) {
        await interaction.reply({
            content: 'Minimum level cannot be greater than maximum level.',
            ephemeral: true,
        });
        return;
    }

    const PSService = PlayerDataService.getInstance();
    const playerData = await PSService.getPlayerData(interaction, user.id);
    const scores = playerData?.scoreData || {};
    const allFilteredScores: ScoreData[] = [];

    for (const diff of difficulty ?? Object.keys(scores)) {
        const filteredScores = scores[diff].filter((score) => {
            const song = dataFetcher.getSongByName(score.title);

            const scoreSheet = song.sheets.find((sheet) => sheet.difficulty === score.difficulty);

            if (!scoreSheet) return false;

            if (genre && !genre.includes(song.category)) return false;
            if (version && !version.includes(song.version)) return false;
            if (chartType && chartType !== score.type) return false;
            if (minLevel && scoreSheet.internalLevelValue < minLevel) return false;
            if (maxLevel && scoreSheet.internalLevelValue > maxLevel) return false;

            return true;
        });

        allFilteredScores.push(...filteredScores);
    }

    let currentSortMethod = 'achievement';

    const sortMethodSelector = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('sort_method')
            .setPlaceholder('Select sorting method')
            .addOptions(
                { label: 'Title (A-Z)', value: 'title' },
                { label: 'Title (Z-A)', value: 'title_reverse' },
                { label: 'Achievement (High to Low)', value: 'achievement' },
                { label: 'Achievement (Low to High)', value: 'achievement_reverse' },
                { label: 'Level (High to Low)', value: 'level' },
                { label: 'Level (Low to High)', value: 'level_reverse' },
            ),
    );

    let page = 0;
    const maxPage = Math.ceil(allFilteredScores.length / 5) - 1;

    const pageActionRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('prev_page')
                .setEmoji('⬅️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0),
        )
        .addComponents(
            new ButtonBuilder()
                .setCustomId('next_page')
                .setEmoji('➡️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === maxPage),
        );

    let embed = new EmbedBuilder()
        .setTitle(`${playerData?.playerData.name}'s Scores`)
        .setDescription(
            `Sort by: ${SortMethodDisplayName[currentSortMethod as keyof typeof SortMethodDisplayName] || 'Unknown'}\n\n${FilterDisplayText}`,
        )
        .addFields(
            allFilteredScores
                .sort(sortFunction[currentSortMethod])
                .slice(5 * page, 5 * (page + 1))
                .map((score) => {
                    const sheet = dataFetcher
                        .getSongByName(score.title)
                        .sheets.find((s) => s.difficulty === score.difficulty);
                    return {
                        name: score.title.length > 100 ? score.title.substring(0, 97) + '...' : score.title,
                        value: `${score.type !== ChartType.UTAGE ? Emojis[score.type === ChartType.STD ? 'STD' : 'DX'] + ' ' : ''}${getDifficultyEmoji(score.difficulty)} ${sheet?.level ?? ''} (${sheet?.internalLevelValue.toFixed(1) ?? 'N/A'})\n${score.achievement.toFixed(4)}%\n${comboTypeReflection[score.comboType]}${score.comboType === ComboType.None ? '' : ' '}${syncTypeReflection[score.syncType]}`,
                    };
                }),
        )
        .setFooter({ text: `Page ${page + 1} of ${Math.ceil(allFilteredScores.length / 5)}` });

    const reply = await interaction.editReply({
        content: '',
        embeds: [embed],
        components: [sortMethodSelector, pageActionRow],
    });

    const collector = reply.createMessageComponentCollector({ filter: (i) => i.user.id === interaction.user.id });

    let stopTimeout = setTimeout(() => {
        collector.stop();
    }, 60000);

    collector.on('collect', async (i: StringSelectMenuInteraction | ButtonInteraction) => {
        clearTimeout(stopTimeout);
        stopTimeout = setTimeout(() => {
            collector.stop();
        }, 60000);

        if (i.isStringSelectMenu()) {
            if (i.customId === 'sort_method') {
                currentSortMethod = i.values[0];

                page = 0;
                pageActionRow.components[0].setDisabled(page === 0);
                pageActionRow.components[1].setDisabled(page === maxPage);

                embed
                    .setDescription(
                        `Sort by: ${SortMethodDisplayName[currentSortMethod as keyof typeof SortMethodDisplayName] || 'Unknown'}\n\n${FilterDisplayText}`,
                    )
                    .setFields(
                        allFilteredScores
                            .sort(sortFunction[currentSortMethod])
                            .slice(5 * page, 5 * (page + 1))
                            .map((score) => {
                                const sheet = dataFetcher
                                    .getSongByName(score.title)
                                    .sheets.find((s) => s.difficulty === score.difficulty);
                                return {
                                    name: score.title.length > 100 ? score.title.substring(0, 97) + '...' : score.title,
                                    value: `${score.type !== ChartType.UTAGE ? Emojis[score.type === ChartType.STD ? 'STD' : 'DX'] + ' ' : ''}${getDifficultyEmoji(score.difficulty)} ${sheet?.level ?? ''} (${sheet?.internalLevelValue.toFixed(1) ?? 'N/A'})\n${score.achievement.toFixed(4)}%\n${comboTypeReflection[score.comboType]}${score.comboType === ComboType.None ? '' : ' '}${syncTypeReflection[score.syncType]}`,
                                };
                            }),
                    )
                    .setFooter({ text: `Page ${page + 1} of ${Math.ceil(allFilteredScores.length / 5)}` });
                await i.update({ embeds: [embed], components: [sortMethodSelector, pageActionRow] });
            }
        }

        if (i.isButton()) {
            if (i.customId === 'prev_page') {
                page = Math.max(0, page - 1);
            } else if (i.customId === 'next_page') {
                page = Math.min(maxPage, page + 1);
            }

            pageActionRow.components[0].setDisabled(page === 0);
            pageActionRow.components[1].setDisabled(page === maxPage);

            embed
                .setDescription(
                    `Sort by: ${SortMethodDisplayName[currentSortMethod as keyof typeof SortMethodDisplayName] || 'Unknown'}\n\n${FilterDisplayText}`,
                )
                .setFields(
                    allFilteredScores
                        .sort(sortFunction[currentSortMethod])
                        .slice(5 * page, 5 * (page + 1))
                        .map((score) => {
                            const sheet = dataFetcher
                                .getSongByName(score.title)
                                .sheets.find((s) => s.difficulty === score.difficulty);
                            return {
                                name: score.title.length > 100 ? score.title.substring(0, 97) + '...' : score.title,
                                value: `${score.type !== ChartType.UTAGE ? Emojis[score.type === ChartType.STD ? 'STD' : 'DX'] + ' ' : ''}${getDifficultyEmoji(score.difficulty)} ${sheet?.level ?? ''} (${sheet?.internalLevelValue.toFixed(1) ?? 'N/A'})\n${score.achievement.toFixed(4)}%\n${comboTypeReflection[score.comboType]}${score.comboType === ComboType.None ? '' : ' '}${syncTypeReflection[score.syncType]}`,
                            };
                        }),
                )
                .setFooter({ text: `Page ${page + 1} of ${Math.ceil(allFilteredScores.length / 5)}` });
            await i.update({ embeds: [embed], components: [sortMethodSelector, pageActionRow] });
        }
    });

    collector.on('end', async () => {
        await interaction.editReply({ components: [] });
    });
}

async function autocomplete(interaction: AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true);

    const currentInput = focusedOption.value;
    const currentChoices = focusedOption.value.split(',').map((s) => s.trim());

    const returnValue = [];
    switch (focusedOption.name) {
        case 'genre':
            const availableGenres = SongDataFetcher.genres.filter((g) => !currentChoices.includes(g));
            if (currentInput.endsWith(' ') || currentInput.endsWith(','))
                returnValue.push(
                    ...availableGenres.map((g) => ({
                        name: currentChoices.join(', ') + g,
                        value: currentChoices.join(', ') + g,
                    })),
                );
            else
                returnValue.push(
                    ...availableGenres
                        .filter((g) => g.startsWith(currentChoices[currentChoices.length - 1]))
                        .map((g) => ({
                            name: (currentChoices.length > 1 ? currentChoices.slice(0, -1).join(', ') + ', ' : '') + g,
                            value: (currentChoices.length > 1 ? currentChoices.slice(0, -1).join(', ') + ', ' : '') + g,
                        })),
                );
            break;
        case 'difficulty':
            const availableDifficulties = SongDataFetcher.difficulties
                .map((d) => d.name)
                .filter((d) => !currentChoices.includes(d));
            if (currentInput.endsWith(' ') || currentInput.endsWith(','))
                returnValue.push(
                    ...availableDifficulties.map((d) => ({
                        name: currentChoices.join(', ') + d,
                        value: currentChoices.join(', ') + d,
                    })),
                );
            else
                returnValue.push(
                    ...availableDifficulties
                        .filter((d) => d.startsWith(currentChoices[currentChoices.length - 1]))
                        .map((d) => ({
                            name: (currentChoices.length > 1 ? currentChoices.slice(0, -1).join(', ') + ', ' : '') + d,
                            value: (currentChoices.length > 1 ? currentChoices.slice(0, -1).join(', ') + ', ' : '') + d,
                        })),
                );
            break;
        case 'version':
            const availableVersions = SongDataFetcher.versions
                .map((v) => v.version)
                .filter((v) => !currentChoices.includes(v));
            if (currentInput.endsWith(' ') || currentInput.endsWith(','))
                returnValue.push(
                    ...availableVersions.map((v) => ({
                        name: currentChoices.join(', ') + v,
                        value: currentChoices.join(', ') + v,
                    })),
                );
            else
                returnValue.push(
                    ...availableVersions
                        .filter((v) => v.startsWith(currentChoices[currentChoices.length - 1]))
                        .map((v) => ({
                            name: (currentChoices.length > 1 ? currentChoices.slice(0, -1).join(', ') + ', ' : '') + v,
                            value: (currentChoices.length > 1 ? currentChoices.slice(0, -1).join(', ') + ', ' : '') + v,
                        })),
                );
            break;
    }

    return returnValue.slice(0, 25);
}

export { data, execute, autocomplete };
