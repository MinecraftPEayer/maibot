import {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    Interaction,
    SlashCommandBuilder,
} from 'discord.js';
import { createCanvas } from 'canvas';
import SongDataFetcher from 'src/lib/SongDataFetcher';

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

    let song = SongDataFetcher.getInstance().getSong(parseInt(songId || '0'));

    interaction.reply({
        embeds: [
            {
                title: song.title,
                description: `Artist: ${song.artist}\nCategory: ${song.category}\nBPM: ${song.bpm}\nVersion: ${song.version}`,
                fields: song.sheets.map((sheet: any) => {
                    return {
                        name: `${
                            sheet.type === 'dx'
                                ? '<:DX_1:1383100369646649444><:DX_2:1383100379788607548><:DX_3:1383100392094568609>'
                                : '<:STD_1:1383100401674616992><:STD_2:1383100409719160982><:STD_3:1383100417835012121>'
                        } ${sheet.difficulty.toUpperCase()}`,
                        value: `Lv: ${sheet.level}(${sheet.internalLevel ?? sheet.internalLevelValue ?? sheet.level + '.?'})\nNote Designer: ${sheet.noteDesigner}`,
                    };
                }),
                thumbnail: {
                    url: `https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover-m/${song.imageName}`,
                },
            },
        ],
    });
}

async function autocomplete(interaction: AutocompleteInteraction) {
    let focused = interaction.options.getFocused();
    return SongDataFetcher.getInstance().search(focused);
}

export { data, execute, autocomplete };
