import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import JSONdb from 'simple-json-db';
import { Difficulty, ScoreType } from 'src/lib/maimaiDXNetEnums';
import MaimaiDXNetFetcher from 'src/lib/maimaiDXNetFetcher';

const scoreType = ScoreType.Achievement;

const data = new SlashCommandBuilder()
    .setName('info')
    .setDescription('獲取玩家資訊');

async function execute(interaction: ChatInputCommandInteraction) {
    let db = new JSONdb('data/linking.json');
    if (!db.has(interaction.user.id))
        return await interaction.reply('你還沒綁定帳號');

    let message = 'Fetching player info...';

    await interaction.reply(message);

    let friendCode = db.get(interaction.user.id);
    let playerInfo =
        await MaimaiDXNetFetcher.getInstance().getPlayer(friendCode);

    if (!playerInfo) {
        return await interaction.editReply('無法獲取玩家資訊');
    }

    message += [
        ' COMPLETED',
        'Fetching scores...',
        '> Fetching BASIC scores...',
    ].join('\n');
    await interaction.editReply(message);
    let basicScoreData = await MaimaiDXNetFetcher.getInstance().getScores(
        scoreType,
        friendCode,
        Difficulty.Basic,
    );
    message += [' COMPLETED', '> Fetching ADVANCED scores...'].join('\n');
    await interaction.editReply(message);
    let advancedScoreData = await MaimaiDXNetFetcher.getInstance().getScores(
        scoreType,
        friendCode,
        Difficulty.Advanced,
    );
    message += [' COMPLETED', '> Fetching EXPERT scores...'].join('\n');
    await interaction.editReply(message);
    let expertScoreData = await MaimaiDXNetFetcher.getInstance().getScores(
        scoreType,
        friendCode,
        Difficulty.Expert,
    );
    message += [' COMPLETED', '> Fetching MASTER scores...'].join('\n');
    await interaction.editReply(message);
    let masterScoreData = await MaimaiDXNetFetcher.getInstance().getScores(
        scoreType,
        friendCode,
        Difficulty.Master,
    );
    message += [' COMPLETED', '> Fetching Re:MASTER scores...'].join('\n');
    await interaction.editReply(message);
    let remasterScoreData = await MaimaiDXNetFetcher.getInstance().getScores(
        scoreType,
        friendCode,
        Difficulty.ReMaster,
    );
    await interaction.editReply(
        [
            'Fetching player info... COMPLETED',
            'Fetching scores... COMPLETED',
            'Calculating...',
        ].join('\n'),
    );
}
