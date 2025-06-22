import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { RankFactor, convertAchievementToRank } from 'src/lib/Utils';
import { Emojis } from 'src/lib/constant/emojis';

const data = new SlashCommandBuilder()
    .setName('rating')
    .setDescription('計算要達成指定Rating所需的定數及達成率')
    .addIntegerOption((input) =>
        input
            .setName('rating')
            .setDescription('指定的Rating')
            .setRequired(true),
    );

async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const ratingNeeded = interaction.options.getInteger('rating');
    let result = [];
    for (let constant = 1; constant <= 15; constant += 0.1) {
        let achievement = 0;
        while (parseFloat(achievement.toFixed(4)) <= 100.5) {
            const rating = Math.floor(
                (parseFloat(achievement.toFixed(4)) / 100) *
                    RankFactor[
                        convertAchievementToRank(
                            parseFloat(achievement.toFixed(4)),
                        )
                    ] *
                    parseFloat(constant.toFixed(1)) *
                    100,
            );
            if (rating >= (ratingNeeded ?? 0)) {
                result.push({
                    constant: constant.toFixed(1),
                    achievement: achievement.toFixed(4),
                    rank: convertAchievementToRank(
                        parseFloat(achievement.toFixed(4)),
                    ),
                });
                break;
            }
            achievement += 0.01;
        }
    }

    if (result.length === 0) {
        return await interaction.editReply({
            content: `指定的Rating (${ratingNeeded}) 無法達成`,
        });
    }

    let resultString = `Rating: ${ratingNeeded}\`\`\`\nConstant - Achievement    (Rank)\n`;
    for (let item of result) {
        let index = result.indexOf(item);
        let toAddString = `${parseFloat(item.constant) < 10 ? `${item.constant} ` : item.constant}     - ${parseFloat(item.achievement) < 100 ? ` ${item.achievement}` : item.achievement}%      (${item.rank})`;
        if ((resultString + toAddString).length > 1900) {
            let leftItemCount = result.length - index;
            resultString += `\n... (還有 ${leftItemCount} 項)\`\`\``;
            break;
        } else {
            resultString += `${toAddString}${index === result.length - 1 ? '\`\`\`' : '\n'}`;
        }
    }

    await interaction.editReply({
        content: resultString,
    });
}

export { data, execute };
