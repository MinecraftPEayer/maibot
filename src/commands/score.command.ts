import {
    ActionRowBuilder,
    AutocompleteInteraction,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Colors,
    MessageFlags,
    SlashCommandBuilder,
} from 'discord.js';
import { ChartType } from 'src/lib/CommonEnums';
import PlayerDataService from 'src/lib/PlayerDataService';
import SongDataFetcher from 'src/lib/SongDataFetcher';
import { sendScore } from 'src/lib/Utils';
import { ScoreData } from 'types/SongDatabase';
import exception from 'config/exception.json';

const toggle_dx_std = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
        .setCustomId('toggle_dx_std')
        .setLabel('DX/STD Switch')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔄'),
);

const data = new SlashCommandBuilder()
    .setName('score')
    .setDescription('Get the score of a song')
    .addStringOption((option) =>
        option.setName('song').setDescription('The name of the song').setRequired(true).setAutocomplete(true),
    );

function autocomplete(interaction: AutocompleteInteraction) {
    let focused = interaction.options.getFocused();
    return SongDataFetcher.getInstance().search(focused);
}

async function execute(interaction: ChatInputCommandInteraction) {
    const songId = interaction.options.getString('song');

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

    let containDXAndSTD = false;
    let components = [];
    if (
        !song.sheets.some((s) => s.type === ChartType.UTAGE) &&
        song.sheets.some((s) => s.type === ChartType.STD) &&
        song.sheets.some((s) => s.type === ChartType.DX)
    ) {
        components.push(toggle_dx_std);
        containDXAndSTD = true;
    }

    const isUTAGE = song.sheets.some((sheet: any) => sheet.type === ChartType.UTAGE);
    const scoreFilter = (s: ScoreData) => s.type === type && ((exception as any)[s.title] ?? s.title) === song.title;

    let type: ChartType = isUTAGE
        ? ChartType.UTAGE
        : !song.sheets.some((s) => s.type === ChartType.STD)
          ? ChartType.DX
          : ChartType.STD;

    const result = await PlayerDataService.getInstance().getPlayerData(interaction, interaction.user.id);

    if (!result)
        return await interaction.reply({
            content: 'Failed to get player data',
            flags: [MessageFlags.Ephemeral],
        });

    const { playerData, scoreData } = result;

    const repliedMessage = await sendScore(interaction, song, playerData, scoreData, isUTAGE, scoreFilter, components);

    if (containDXAndSTD) {
        const filter = (i: any) => i.user.id === interaction.user.id;
        const collector = repliedMessage.createMessageComponentCollector({ filter });

        let timeout = setTimeout(() => {
            collector.stop();
        }, 60000);

        collector.on('collect', async (i) => {
            if (i.customId === 'toggle_dx_std') {
                await i.deferUpdate();
                type = type === ChartType.DX ? ChartType.STD : ChartType.DX;
                await sendScore(interaction, song, playerData, scoreData, isUTAGE, scoreFilter, components);

                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    collector.stop();
                }, 60000);
            }
        });

        collector.on('end', () => {
            repliedMessage.edit({ components: [] });
        });
    }
}

export { data, autocomplete, execute };
