import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import MaimaiDXNetFetcher from 'src/lib/maimaiDXNetFetcher';

const data = new SlashCommandBuilder().setName('top').setDescription('top');

async function execute(interaction: ChatInputCommandInteraction) {
    let fetcher = MaimaiDXNetFetcher.getInstance();
    let data = await fetcher.getFriendList();
    interaction.reply(JSON.stringify(data) ?? 'Empty data, fuck you');
    console.log(data);
}

export { data, execute };
