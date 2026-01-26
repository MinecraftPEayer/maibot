import {
    ActionRowBuilder,
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
} from 'discord.js';
import { ChartType } from 'src/lib/CommonEnums';
import { Emojis } from 'src/lib/constant/emojis';
import SongDataFetcher from 'src/lib/SongDataFetcher';
import { getChartTypeFromName, getDifficultyEmoji, getDifficultyIdFromName, randomSong } from 'src/lib/Utils';
import { DifficultyColor } from 'src/lib/constant/CommonConstant';

// [min, max]
const RandomCourseLevelRange = {
    '【EXPERT 初級】': [7.0, 9.6],
    '【EXPERT 中級】': [9.7, 11.6],
    '【EXPERT 上級】': [11.7, 12.6],
    '【EXPERT 超上級】': [12.7, 13.9],
    '【MASTER 初級】': [10.0, 11.9],
    '【MASTER 中級】': [12.0, 13.2],
    '【MASTER 上級】': [13.3, 14.4],
    '【MASTER 超上級】': [14.5, 14.9],
};

type RandomCourseType = keyof typeof RandomCourseLevelRange;

const data = new SlashCommandBuilder()
    .setName('course')
    .setDescription('段位認定')
    .addStringOption((option) =>
        option.setName('type').setDescription('Select course type').setRequired(true).setAutocomplete(true),
    );

async function execute(interaction: ChatInputCommandInteraction) {
    const gallery = await SongDataFetcher.getInstance().getCourseData();
    const optionType = interaction.options.getString('type', true);
    const isRandomDan = optionType === 'random-dan';
    if (!gallery.map((item: any) => item.id).includes(optionType))
        return interaction.reply({ content: 'Invalid course type selected.', ephemeral: true });

    const course = gallery.find((item: any) => item.id === optionType);

    const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('course-select')
            .setPlaceholder('Select type')
            .addOptions(
                ...course.sections.map((section: any) => ({
                    label: section.title,
                    value: section.title,
                })),
            ),
    );

    const owo = await interaction.reply({ content: 'Select type', components: [selectMenu] });

    const collector = owo.createMessageComponentCollector({ filter: (i) => i.user.id === interaction.user.id });

    let timeout = setTimeout(() => {
        collector.emit('end');
    }, 60000);

    collector.on('collect', async (selectInteraction: StringSelectMenuInteraction) => {
        const selectedSection = course.sections.find((section: any) => section.title === selectInteraction.values[0]);

        if (isRandomDan) {
            const specificFilter = selectedSection.sheets[0].split('|');
            const filter = {
                difficulty: specificFilter[2] === 'master' ? ['master', 'remaster'] : specificFilter[2],
                minConstant: RandomCourseLevelRange[selectedSection.title as RandomCourseType][0],
                maxConstant: RandomCourseLevelRange[selectedSection.title as RandomCourseType][1],
            };

            const { filtered, randomized } = randomSong(selectedSection.sheets.length, filter, true);

            await selectInteraction.update({
                content: [`**${course.title} - ${selectedSection.title}**`, selectedSection.description].join('\n'),
                embeds: randomized.map((sheet, index: number) => {
                    const version = sheet.sheet.version ? sheet.sheet.version : sheet.song.version;
                    return new EmbedBuilder()
                        .setTitle(sheet.song.title)
                        .setAuthor({ name: `${sheet.song.artist}` })
                        .setColor(parseInt(DifficultyColor[sheet.sheet.difficulty][0].slice(1) || '000000', 16))
                        .setThumbnail(`https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover-m/${sheet.song.imageName}`)
                        .setDescription(
                            [
                                `${Emojis[sheet.sheet.type === ChartType.DX ? 'DX' : 'STD']} ${getDifficultyEmoji(sheet.sheet.difficulty)} ${sheet.sheet.level || 'N/A'} ${sheet.sheet.internalLevelValue ? `(${sheet.sheet.internalLevelValue.toFixed(1)})` : ''}`,
                                `-# Note Designer: ${sheet.sheet.noteDesigner ? sheet.sheet.noteDesigner : 'N/A'}`,
                                `${version ? version : 'N/A'}`,
                                `${selectedSection.sheetDescriptions ? `\n${selectedSection.sheetDescriptions[index]}` : ''}`,
                            ].join('\n'),
                        );
                }),
            });
        } else {
            await selectInteraction.update({
                content: [`**${course.title} - ${selectedSection.title}**`, selectedSection.description].join('\n'),
                embeds: selectedSection.sheets
                    .map((sheet: string) => sheet.split('|'))
                    .map((sheet: string[], index: number) => {
                        const song = SongDataFetcher.getInstance().getSongByName(sheet[0]);
                        const chartType = getChartTypeFromName(sheet[1]);
                        const difficulty = getDifficultyIdFromName(sheet[2]);

                        const sheetData = song.sheets.find((s) => s.type === chartType && s.difficulty === difficulty);
                        const version = sheetData?.version ? sheetData.version : song.version;

                        return new EmbedBuilder()
                            .setTitle(song.title)
                            .setAuthor({ name: `${song.artist}` })
                            .setColor(
                                parseInt(
                                    SongDataFetcher.difficulties
                                        .find((d) => d.difficulty === sheet[2])
                                        ?.color.slice(1) || '000000',
                                    16,
                                ),
                            )
                            .setThumbnail(`https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover-m/${song.imageName}`)
                            .setDescription(
                                [
                                    `${Emojis[sheetData?.type === ChartType.DX ? 'DX' : 'STD']} ${getDifficultyEmoji(sheetData?.difficulty ?? difficulty)} ${sheetData?.level || 'N/A'} ${sheetData?.internalLevelValue ? `(${sheetData.internalLevelValue.toFixed(1)})` : ''}`,
                                    `-# Note Designer: ${sheetData?.noteDesigner ? sheetData.noteDesigner : 'N/A'}`,
                                    `${version ? version : 'N/A'}`,
                                    `${selectedSection.sheetDescriptions ? `## ${selectedSection.sheetDescriptions[index]}` : ''}`,
                                ].join('\n'),
                            );
                    }),
            });
        }

        clearTimeout(timeout);
        timeout = setTimeout(() => {
            collector.emit('end');
        }, 60000);
    });

    collector.on('end', async () => {
        await interaction.editReply({ components: [] });
    });
}

const courseAliases: {
    [key: string]: string[];
} = {
    'random-dan': ['random', '隨機'],
};

async function autocomplete(interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused();

    const returnValue = (await SongDataFetcher.getInstance().getCourseData())
        .filter(
            (item: any) =>
                !item.isHidden &&
                (item.title.includes(focusedValue) ||
                    (courseAliases[item.id] && courseAliases[item.id].some((alias) => alias.includes(focusedValue)))),
        )
        .map((item: any) => ({
            name: item.title,
            value: item.id,
        }));

    return returnValue.slice(0, 25);
}

export { data, execute, autocomplete };
