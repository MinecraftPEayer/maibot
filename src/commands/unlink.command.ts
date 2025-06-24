import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import JSONdb from 'simple-json-db';
import MaimaiDXNetFetcher from 'src/lib/maimaiDXNetFetcher';

const data = new SlashCommandBuilder().setName('unlink').setDescription('取消連結好友代碼');

async function execute(interaction: ChatInputCommandInteraction) {
    let fetcher = MaimaiDXNetFetcher.getInstance();
    let friendList = await fetcher.getFriendList();

    let db = new JSONdb('data/linking.json');
    if (!db.has(interaction.user.id)) {
        interaction.reply(`你還不是機器人的好友`);
    } else {
        db.delete(interaction.user.id);
        interaction.reply(`已取消連結，你可以使用 /link 重新連結好友代碼`);
    }
}

export { data, execute };
