import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

const data = new SlashCommandBuilder().setName('top').setDescription('top');

async function execute(interaction: ChatInputCommandInteraction) {
    interaction.reply('not available yet');
}

export { data, execute };
