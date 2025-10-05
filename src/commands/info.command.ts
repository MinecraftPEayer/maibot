import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import JSONdb from 'simple-json-db';
import { Emojis } from 'src/lib/constant/emojis';
import { Difficulty, ScoreType } from 'src/lib/CommonEnums';
import MaimaiDXNetFetcher from 'src/lib/maimaiDXNetFetcher';
import { ScoreData } from 'types/SongDatabase';
import { DifficultyDisplayName } from 'src/lib/constant/CommonConstant';
import fs from 'fs';

let diffs = [Difficulty.Basic, Difficulty.Advanced, Difficulty.Expert, Difficulty.Master, Difficulty.ReMaster];

const data = new SlashCommandBuilder()
    .setName('info')
    .setDescription('獲取玩家資訊')
    .addUserOption((option) => option.setName('user').setDescription('要查詢的玩家').setRequired(false));

async function execute(interaction: ChatInputCommandInteraction) {
    let db = new JSONdb('data/linking.json');
    let optionUser = interaction.options.getUser('user');

    let playerInfo: any = {};

    let SSSp, SSS, SSp, SS, Sp, S, APp, AP, FCp, FC, FDXp, FDX, FSp, FS, CLEAR, star5, star4, star3, star2, star1;
    // 如果有現有資料就從裡面拉
    if (fs.existsSync(`data/user/${optionUser?.id ?? interaction.user.id}`)) {
        await interaction.reply('Processing...');

        let data = JSON.parse(
            fs.readFileSync(`data/user/${optionUser?.id ?? interaction.user.id}/latest.json`, 'utf-8'),
        );

        playerInfo = {
            name: data.playerData.playerName,
            rating: data.playerData.rating,
        };

        let ov = data.playerData.overviewData;
        SSSp = ov.SSSp[0];
        SSS = ov.SSS[0];
        SSp = ov.SSp[0];
        SS = ov.SS[0];
        Sp = ov.Sp[0];
        S = ov.S[0];
        CLEAR = ov.CLEAR[0];
        APp = ov.APp[0];
        AP = ov.AP[0];
        FCp = ov.FCp[0];
        FC = ov.FC[0];
        FDXp = ov.FDXp[0];
        FDX = ov.FDX[0];
        FSp = ov.FSp[0];
        FS = ov.FS[0];
        star5 = ov.dxstar_5[0];
        star4 = ov.dxstar_4[0];
        star3 = ov.dxstar_3[0];
        star2 = ov.dxstar_2[0];
        star1 = ov.dxstar_1[0];
    } else {
        if (optionUser && !db.has(optionUser.id)) {
            return await interaction.reply(`${optionUser.username} 還沒綁定帳號`);
        }
        if (!db.has(interaction.user.id)) return await interaction.reply('你還沒綁定帳號');

        let id = optionUser ? optionUser.id : interaction.user.id;

        let message = 'Fetching player info...';

        await interaction.reply(message);

        let friendCode = db.get(id);
        playerInfo = await MaimaiDXNetFetcher.getInstance().getPlayer(friendCode);

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
        for (const [difficulty, diffName] of Object.entries(DifficultyDisplayName)) {
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
        await interaction.editReply(
            ['Fetching player info... OK', 'Fetching scores... OK', 'Calculating...'].join('\n'),
        );

        let allAchievementScore = Object.values(achievementScores).flat();
        SSSp = allAchievementScore.filter((score) => score.achievement >= 100.5).length;
        SSS = allAchievementScore.filter((score) => score.achievement >= 100).length;
        SSp = allAchievementScore.filter((score) => score.achievement >= 99.5).length;
        SS = allAchievementScore.filter((score) => score.achievement >= 99).length;
        Sp = allAchievementScore.filter((score) => score.achievement >= 98).length;
        S = allAchievementScore.filter((score) => score.achievement >= 97).length;

        CLEAR = allAchievementScore.filter((score) => score.achievement >= 80).length;

        // FC = 0, FCp = 1, AP = 2, APp = 3
        FC = allAchievementScore.filter(
            (score) => score.comboType === 0 || score.comboType === 1 || score.comboType === 2 || score.comboType === 3,
        ).length;
        FCp = allAchievementScore.filter(
            (score) => score.comboType === 1 || score.comboType === 2 || score.comboType === 3,
        ).length;
        AP = allAchievementScore.filter((score) => score.comboType === 2 || score.comboType === 3).length;
        APp = allAchievementScore.filter((score) => score.comboType === 3).length;

        // FS = 0, FSp = 1, FDX = 2, FDXp = 3
        FS = allAchievementScore.filter(
            (score) => score.syncType === 0 || score.syncType === 1 || score.syncType === 2 || score.syncType === 3,
        ).length;
        FSp = allAchievementScore.filter(
            (score) => score.syncType === 1 || score.syncType === 2 || score.syncType === 3,
        ).length;
        FDX = allAchievementScore.filter((score) => score.syncType === 2 || score.syncType === 3).length;
        FDXp = allAchievementScore.filter((score) => score.syncType === 3).length;

        let allDXScore = Object.values(dxScores).flat();
        star1 = allDXScore.filter((score) => (score.dxStar ?? 0) >= 1).length;
        star2 = allDXScore.filter((score) => (score.dxStar ?? 0) >= 2).length;
        star3 = allDXScore.filter((score) => (score.dxStar ?? 0) >= 3).length;
        star4 = allDXScore.filter((score) => (score.dxStar ?? 0) >= 4).length;
        star5 = allDXScore.filter((score) => (score.dxStar ?? 0) === 5).length;
    }

    await interaction.editReply(
        [
            `**${playerInfo?.name}** (Rating: ${playerInfo?.rating})`,
            '',
            `${Emojis['SSS+']} ${SSSp}`,
            `${Emojis.SSS} ${SSS}`,
            `${Emojis['SS+']} ${SSp}`,
            `${Emojis.SS} ${SS}`,
            `${Emojis['S+']} ${Sp}`,
            `${Emojis.S} ${S}`,
            `${Emojis.Clear}: ${CLEAR}`,
            `${Emojis.FC_Short} FC: ${FC}`,
            `${Emojis['FCp_Short']} FC+: ${FCp}`,
            `${Emojis.AP_Short} AP: ${AP}`,
            `${Emojis['APp_Short']} AP+: ${APp}`,
            `${Emojis.FS_Short} FS: ${FS}`,
            `${Emojis['FSp_Short']} FS+: ${FSp}`,
            `${Emojis.FDX_Short} FDX: ${FDX}`,
            `${Emojis['FDXp_Short']} FDX+: ${FDXp}`,
            `${Emojis.DXStar_1}: ${star1}`,
            `${Emojis.DXStar_2}: ${star2}`,
            `${Emojis.DXStar_3}: ${star3}`,
            `${Emojis.DXStar_4}: ${star4}`,
            `${Emojis.DXStar_5}: ${star5}`,
        ].join('\n'),
    );
}

export { data, execute };
