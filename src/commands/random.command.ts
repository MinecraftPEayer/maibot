import {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    EmbedBuilder,
    Emoji,
    SlashCommandBuilder,
} from 'discord.js';
import fs from 'fs';
import { Emojis } from 'src/lib/constant/emojis';
import SongDataFetcher from 'src/lib/SongDataFetcher';
import { getChartTypeFromName, getDifficultyIdFromName } from 'src/lib/Utils';
import { Sheet, Song } from 'types/SongDatabase';

const Difficulties = SongDataFetcher.difficulties;
const Genres = SongDataFetcher.genres;
const Versions = SongDataFetcher.versions;
const Regions = SongDataFetcher.regions;
const Levels = [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '7+',
    '8',
    '8+',
    '9',
    '9+',
    '10',
    '10+',
    '11',
    '11+',
    '12',
    '12+',
    '13',
    '13+',
    '14',
    '14+',
    '15',
];

const data = new SlashCommandBuilder()
    .setName('random')
    .setDescription('抽歌時間')
    .addStringOption((option) =>
        option.setName('version').setDescription('Song Version').setAutocomplete(true).setRequired(false),
    )
    .addStringOption((option) =>
        option
            .setName('region')
            .setDescription('Game Region')
            .addChoices(
                ...Regions.map((region) => ({
                    name: region.name,
                    value: region.region,
                })),
            )
            .setRequired(false),
    )
    .addStringOption((option) =>
        option
            .setName('genre')
            .setDescription('Song Genre (disabled if chart type is U·TA·GE)')
            .addChoices(
                ...Genres.map((genre) => ({
                    name: genre,
                    value: genre,
                })),
            )
            .setRequired(false),
    )
    .addStringOption((option) =>
        option
            .setName('max_level')
            .setDescription('Maximum Chart Level (disabled if chart type is U·TA·GE)')
            .addChoices(
                ...Levels.map((level) => ({
                    name: level,
                    value: level,
                })),
            )
            .setRequired(false),
    )
    .addStringOption((option) =>
        option
            .setName('min_level')
            .setDescription('Minimum Chart Level (disabled if chart type is U·TA·GE)')
            .addChoices(
                ...Levels.map((level) => ({
                    name: level,
                    value: level,
                })),
            )
            .setRequired(false),
    )
    .addStringOption((option) =>
        option
            .setName('difficulty')
            .setDescription('Chart Difficulty (disabled if chart type is U·TA·GE)')
            .addChoices(
                ...Difficulties.map((difficulty) => ({
                    name: difficulty.name,
                    value: difficulty.difficulty,
                })),
            )
            .setRequired(false),
    )
    .addStringOption((option) =>
        option
            .setName('type')
            .setDescription('Chart Type')
            .addChoices(
                {
                    name: 'スタンダード (STD)',
                    value: 'std',
                },
                {
                    name: 'でらっくす (DX)',
                    value: 'dx',
                },
                {
                    name: '宴会場 (U·TA·GE)',
                    value: 'utage',
                },
            )
            .setRequired(false),
    )
    .addIntegerOption((option) =>
        option
            .setName('count')
            .setDescription('Number of songs to draw (default: 1, max: 10)')
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(false),
    );

async function execute(interaction: ChatInputCommandInteraction) {
    const count = interaction.options.getInteger('count') ?? 1;
    const filter = {
        version: interaction.options.getString('version') ?? undefined,
        region: interaction.options.getString('region') ?? undefined,
        genre: interaction.options.getString('genre') ?? undefined,
        maxLevel: interaction.options.getString('max_level') ?? undefined,
        minLevel: interaction.options.getString('min_level') ?? undefined,
        difficulty: interaction.options.getString('difficulty') ?? undefined,
        type: interaction.options.getString('type') ?? undefined,
    };

    if (!Versions.map((ver) => ver.version).includes(filter.version!)) {
        filter.version = undefined;
    }

    const rawData = SongDataFetcher.getInstance().getRawData();
    const filtered: { song: Song; sheet: Sheet }[] = [];
    rawData.songs.forEach((song) => {
        if (filter.genre && song.category !== filter.genre) return;
        if (filter.version && song.version !== filter.version) return;

        song.sheets.forEach((sheet) => {
            if (filter.type && sheet.type !== getChartTypeFromName(filter.type)) return;
            if (filter.difficulty && sheet.difficulty !== getDifficultyIdFromName(filter.difficulty)) return;

            if (filter.maxLevel && Levels.indexOf(sheet.level) > Levels.indexOf(filter.maxLevel)) return;
            if (filter.minLevel && Levels.indexOf(sheet.level) < Levels.indexOf(filter.minLevel)) return;

            filtered.push({ song, sheet });
        });
    });

    if (filtered.length === 0) {
        await interaction.reply('No songs found with the given filters.');
        return;
    }

    let page = 0;
    let itemPerPage = 5;

    let embeds = filtered.slice(itemPerPage * page, itemPerPage * (page + 1)).map(({ song, sheet }) =>
        new EmbedBuilder()
            .setAuthor({ name: song.artist })
            .setTitle(song.title)
            .setDescription(
                `${Emojis[['STD', 'DX', 'Utage'][sheet.type] as keyof typeof Emojis]} ${Emojis[['Basic', 'Advanced', 'Expert', 'Master', 'ReMaster', , , , , , 'Utage'][sheet.difficulty] as keyof typeof Emojis]} ${sheet.level}`,
            )
            .setThumbnail(`https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover-m/${song.imageName}`),
    );

    await interaction.reply({
        embeds,
    });

    /**
     * @todo pagination
     */
}

async function autocomplete(interaction: AutocompleteInteraction) {
    return Versions.filter((version) => version.version.startsWith(interaction.options.getFocused().toString()))
        .slice(0, 25)
        .map((version) => ({
            name: version.abbr,
            value: version.version,
        }));
}

export { data, execute, autocomplete };
