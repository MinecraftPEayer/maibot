import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';
import PlayerDataService from 'src/lib/PlayerDataService';
import { replyOrEdit } from 'src/lib/Utils';

const data = new SlashCommandBuilder()
    .setName('toggle_bookmarklet')
    .setDescription('Toggle the bookmarklet script data on or off.');

const execute = async (interaction: ChatInputCommandInteraction) => {
    const userBookmarkletExists = PlayerDataService.getInstance().checkBookmarkletDataExists(interaction.user.id);

    if (!userBookmarkletExists) {
        return await interaction.reply({
            content: 'Sorry, but this feature is only available for bookmark script users.',
            flags: [MessageFlags.Ephemeral],
        });
    }

    const playerDataService = PlayerDataService.getInstance();
    const currentState = playerDataService.getBookmarkletEnabled(interaction.user.id);
    const newState = !currentState;

    playerDataService.setBookmarkletEnabled(interaction.user.id, newState);

    await interaction.reply({
        content: `Bookmarklet script data is now ${newState ? 'enabled' : 'disabled'}.`,
        flags: [MessageFlags.Ephemeral],
    });
};

export { data, execute };
