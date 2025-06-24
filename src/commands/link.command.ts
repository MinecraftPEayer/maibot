import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import JSONdb from 'simple-json-db';
import MaimaiDXNetFetcher from 'src/lib/maimaiDXNetFetcher';

const data = new SlashCommandBuilder()
    .setName('link')
    .setDescription('連結好友代碼')
    .addStringOption((option) => option.setName('code').setDescription('好友代碼').setRequired(true));

async function execute(interaction: ChatInputCommandInteraction) {
    let fetcher = MaimaiDXNetFetcher.getInstance();
    let friendList = await fetcher.getFriendList();
    let code = interaction.options.getString('code');
    await interaction.reply('Processing...');
    let db = new JSONdb('data/linking.json');
    if (Object.values(db.JSON()).includes(code)) {
        await interaction.editReply('此好友代碼已被綁定');
    }
    console.log(code);
    if (friendList.some((friend: any) => friend.idx === code)) {
        if (db.has(interaction.user.id)) {
            await interaction.editReply(
                `你已經綁定到玩家 ${friendList.find((friend: any) => friend.idx === code)?.name}，請使用 /unlink 取消綁定`,
            );
            return;
        }
        db.set(interaction.user.id, code);
        await interaction.editReply(`已綁定到玩家 ${friendList.find((friend: any) => friend.idx === code)?.name}`);
    } else {
        await fetcher.addFriend(code ?? '');
        await interaction.editReply(
            `好友代碼無效或你還不是機器人的好友，正在發送好友邀請...\n同意好友請求後請重新使用指令`,
        );
    }
}

export { data, execute };
