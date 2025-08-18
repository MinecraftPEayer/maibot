import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import { DifficultyDisplayName } from 'src/lib/constant/CommonConstant';
import SongDataFetcher from 'src/lib/SongDataFetcher';
import { getDifficultyEmoji, getDifficultyIdFromName } from 'src/lib/Utils';
import { Difficulty } from 'src/lib/CommonEnums';
import { Emojis } from 'src/lib/constant/emojis';

const DifficultyColor = {
    [Difficulty.Basic]: 0x45c124,
    [Difficulty.Advanced]: 0xffba01,
    [Difficulty.Expert]: 0xff7b7b,
    [Difficulty.Master]: 0x9f51dc,
    [Difficulty.ReMaster]: 0xdbaaff,
    [Difficulty.UTAGE]: 0xff6ffd,
};

const data = new SlashCommandBuilder()
    .setName('recent')
    .setDescription('Show the information of recent play (only available for bookmark script user)')
    .addUserOption((option) =>
        option.setName('user').setDescription('The user to show recent play information').setRequired(false),
    );

const execute = async (interaction: ChatInputCommandInteraction) => {
    let optionId = interaction.options.getUser('user')?.id;
    let userId = optionId ? optionId : interaction.user.id;
    if (!fs.existsSync(`data/user/${userId}/detailed.json`)) {
        return await interaction.reply('Sorry, but this feature is only available for bookmark script users.');
    }

    let detailedData = JSON.parse(fs.readFileSync(`data/user/${userId}/detailed.json`, 'utf-8'));
    let splitedByCredit = [];
    for (let i = 0; i < detailedData.length; i++) {
        let track = detailedData[i].track;
        let thisCredit = detailedData.slice(i, i + track);
        splitedByCredit.push(thisCredit);
        i += track - 1;
    }
    splitedByCredit.sort((a, b) => new Date(b[0].time).getTime() - new Date(a[0].time).getTime());

    let embeds = splitedByCredit[0]
        .sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime())
        .map((score: any) => {
            let time = new Date(new Date(score.time).getTime());
            return new EmbedBuilder()
                .setTitle(score.songName)
                .setDescription(
                    [
                        `${score.achievement} ${score.achievementNewRecord ? '(New Record)' : ''}`,
                        `${Emojis[score.chartType.toUpperCase() as 'DX' | 'STD']} ${getDifficultyEmoji(getDifficultyIdFromName(score.difficulty))}`,
                        `${score.dxScore} ${score.dxScoreNewRecord ? '(New Record)' : ''}`,
                    ].join('\n'),
                )
                .setColor(DifficultyColor[getDifficultyIdFromName(score.difficulty) as Difficulty])
                .setThumbnail(
                    `https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover-m/${SongDataFetcher.getInstance().getSongByName(score.songName).imageName}`,
                )
                .setImage(
                    `https://maibot.minecraftpeayer.me/img/dynamic/noteTable?tap=${score.noteDetail['tap'].join(',')}&hold=${score.noteDetail['hold'].join(',')}&slide=${score.noteDetail['slide'].join(',')}&touch=${score.noteDetail['touch'].join(',')}&break=${score.noteDetail['break'].join(',')}&`,
                )
                .setFooter({
                    iconURL: interaction.client.user.displayAvatarURL(),
                    text: `TRACK ${score.track}`,
                })
                .setTimestamp(time);
        });

    await interaction.reply({ embeds });
};

export { data, execute };
