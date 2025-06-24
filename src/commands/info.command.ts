import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import JSONdb from 'simple-json-db';
import { Emojis } from 'src/lib/constant/emojis';
import { Difficulty, ScoreType } from 'src/lib/maimaiDXNetEnums';
import MaimaiDXNetFetcher from 'src/lib/maimaiDXNetFetcher';
import { ScoreData } from 'types/SongDatabase';

let diffText = {
    [Difficulty.Basic]: 'BASIC',
    [Difficulty.Advanced]: 'ADVANCED',
    [Difficulty.Expert]: 'EXPERT',
    [Difficulty.Master]: 'MASTER',
    [Difficulty.ReMaster]: 'Re:MASTER',
    [Difficulty.UTAGE]: 'UTAGE',
};

let diffs = [Difficulty.Basic, Difficulty.Advanced, Difficulty.Expert, Difficulty.Master, Difficulty.ReMaster];

const data = new SlashCommandBuilder().setName('info').setDescription('獲取玩家資訊');

async function execute(interaction: ChatInputCommandInteraction) {
    let db = new JSONdb('data/linking.json');
    if (!db.has(interaction.user.id)) return await interaction.reply('你還沒綁定帳號');

    let message = 'Fetching player info...';

    await interaction.reply(message);

    let friendCode = db.get(interaction.user.id);
    let playerInfo = await MaimaiDXNetFetcher.getInstance().getPlayer(friendCode);

    if (!playerInfo) {
        return await interaction.editReply('無法獲取玩家資訊');
    }

    message += [' OK', 'Fetching scores...'].join('\n');
    await interaction.editReply(message);

    let achievementScores = {} as {
        [key: string]: ScoreData[];
    };
    let dxScores = {} as {
        [key: string]: ScoreData[];
    };
    for (const [difficulty, diffName] of Object.entries(diffText)) {
        if (!diffs.includes(parseInt(difficulty))) continue;

        message += `\n> Fetching ${diffName} scores...`;
        await interaction.editReply(message);
        let achievementScoreData = await MaimaiDXNetFetcher.getInstance().getScores(
            ScoreType.Achievement,
            friendCode,
            parseInt(difficulty),
        );
        let dxScoreData = await MaimaiDXNetFetcher.getInstance().getScores(
            ScoreType.DXScore,
            friendCode,
            parseInt(difficulty),
        );
        achievementScores[diffName] = achievementScoreData.data;
        dxScores[diffName] = dxScoreData.data;
        message += ' OK';
    }
    await interaction.editReply(['Fetching player info... OK', 'Fetching scores... OK', 'Calculating...'].join('\n'));

    let allAchievementScore = Object.values(achievementScores).flat();
    let SSSpCount = allAchievementScore.filter((score) => score.achievement >= 100.5).length;
    let SSSCount = allAchievementScore.filter((score) => score.achievement >= 100).length;
    let SSpCount = allAchievementScore.filter((score) => score.achievement >= 99.5).length;
    let SSCount = allAchievementScore.filter((score) => score.achievement >= 99).length;
    let SpCount = allAchievementScore.filter((score) => score.achievement >= 98).length;
    let SCount = allAchievementScore.filter((score) => score.achievement >= 97).length;

    let clearCount = allAchievementScore.filter((score) => score.achievement >= 80).length;

    // FC = 0, FCp = 1, AP = 2, APp = 3
    let FCCount = allAchievementScore.filter(
        (score) => score.comboType === 0 || score.comboType === 1 || score.comboType === 2 || score.comboType === 3,
    ).length;
    let FCpCount = allAchievementScore.filter(
        (score) => score.comboType === 1 || score.comboType === 2 || score.comboType === 3,
    ).length;
    let APCount = allAchievementScore.filter((score) => score.comboType === 2 || score.comboType === 3).length;
    let APpCount = allAchievementScore.filter((score) => score.comboType === 3).length;

    // FS = 0, FSp = 1, FDX = 2, FDXp = 3
    let FSCount = allAchievementScore.filter(
        (score) => score.syncType === 0 || score.syncType === 1 || score.syncType === 2 || score.syncType === 3,
    ).length;
    let FSpCount = allAchievementScore.filter(
        (score) => score.syncType === 1 || score.syncType === 2 || score.syncType === 3,
    ).length;
    let FDXCount = allAchievementScore.filter((score) => score.syncType === 2 || score.syncType === 3).length;
    let FDXpCount = allAchievementScore.filter((score) => score.syncType === 3).length;

    let allDXScore = Object.values(dxScores).flat();
    let star1Count = allDXScore.filter((score) => (score.dxStar ?? 0) >= 1).length;
    let star2Count = allDXScore.filter((score) => (score.dxStar ?? 0) >= 2).length;
    let star3Count = allDXScore.filter((score) => (score.dxStar ?? 0) >= 3).length;
    let star4Count = allDXScore.filter((score) => (score.dxStar ?? 0) >= 4).length;
    let star5Count = allDXScore.filter((score) => (score.dxStar ?? 0) === 5).length;

    await interaction.editReply(
        [
            `**${playerInfo?.name}** (Rating: ${playerInfo?.rating})`,
            '',
            `${Emojis['SSS+']} ${SSSpCount}`,
            `${Emojis.SSS} ${SSSCount}`,
            `${Emojis['SS+']} ${SSpCount}`,
            `${Emojis.SS} ${SSCount}`,
            `${Emojis['S+']} ${SpCount}`,
            `${Emojis.S} ${SCount}`,
            `${Emojis.Clear}: ${clearCount}`,
            `${Emojis.FC_Short} FC: ${FCCount}`,
            `${Emojis['FCp_Short']} FC+: ${FCpCount}`,
            `${Emojis.AP_Short} AP: ${APCount}`,
            `${Emojis['APp_Short']} AP+: ${APpCount}`,
            `${Emojis.FS_Short} FS: ${FSCount}`,
            `${Emojis['FSp_Short']} FS+: ${FSpCount}`,
            `${Emojis.FDX_Short} FDX: ${FDXCount}`,
            `${Emojis['FDXp_Short']} FDX+: ${FDXpCount}`,
            `${Emojis.DXStar_1}: ${star1Count}`,
            `${Emojis.DXStar_2}: ${star2Count}`,
            `${Emojis.DXStar_3}: ${star3Count}`,
            `${Emojis.DXStar_4}: ${star4Count}`,
            `${Emojis.DXStar_5}: ${star5Count}`,
        ].join('\n'),
    );
}

export { data, execute };
