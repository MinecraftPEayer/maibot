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
import { getChartTypeFromName, getDifficultyEmoji, getDifficultyIdFromName } from 'src/lib/Utils';

const data = new SlashCommandBuilder()
    .setName('course')
    .setDescription('段位認定')
    .addStringOption((option) =>
        option.setName('type').setDescription('Select course type').setRequired(true).setAutocomplete(true),
    );

async function execute(interaction: ChatInputCommandInteraction) {
    const gallery = await SongDataFetcher.getInstance().getCourseData();
    const optionType = interaction.options.getString('type', true);
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

        await selectInteraction.update({
            content: [`**${course.title} - ${selectedSection.title}**`, selectedSection.description].join('\n'),
            embeds: selectedSection.sheets
                .map((sheet: string) => sheet.split('|'))
                .map((sheet: string[], index: number) => {
                    const song = SongDataFetcher.getInstance().getSongByName(sheet[0]);
                    const chartType = getChartTypeFromName(sheet[1]);
                    const difficulty = getDifficultyIdFromName(sheet[2]);

                    const sheetData = song.sheets.find((s) => s.type === chartType && s.difficulty === difficulty);

                    return new EmbedBuilder()
                        .setTitle(song.title)
                        .setAuthor({ name: `${song.artist}` })
                        .setColor(
                            parseInt(
                                SongDataFetcher.difficulties.find((d) => d.difficulty === sheet[2])?.color.slice(1) ||
                                    '000000',
                                16,
                            ),
                        )
                        .setThumbnail(`https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover-m/${song.imageName}`)
                        .setDescription(
                            [
                                `${Emojis[chartType === ChartType.DX ? 'DX' : 'STD']} ${getDifficultyEmoji(difficulty)} ${sheetData?.level || 'N/A'} ${sheetData?.internalLevelValue ? `(${sheetData.internalLevelValue.toFixed(1)})` : ''}\n-# Note Designer: ${sheetData?.noteDesigner ? sheetData.noteDesigner : 'N/A'}\n-# Version: ${sheetData?.version ? sheetData.version : 'N/A'}\n${selectedSection.sheetDescriptions ? `\n${selectedSection.sheetDescriptions[index]}` : ''}`,
                            ].join('\n'),
                        );
                }),
        });

        clearTimeout(timeout);
        timeout = setTimeout(() => {
            collector.emit('end');
        }, 60000);
    });

    collector.on('end', async () => {
        await interaction.editReply({ components: [] });
    });
}

async function autocomplete(interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused();

    return (await SongDataFetcher.getInstance().getCourseData())
        .filter((item: any) => !item.isHidden && item.title.includes(focusedValue))
        .slice(0, 25)
        .map((item: any) => ({
            name: item.title,
            value: item.id,
        }));
}

export { data, execute, autocomplete };
