import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { calculateRating, convertAchievementToRank, getRankFactor } from 'src/lib/Utils';
import { RankFactor } from 'src/lib/constant/CommonConstant';

const data = new SlashCommandBuilder()
    .setName('rating')
    .setDescription('計算要達成指定Rating所需的定數及達成率')
    .addIntegerOption((input) => input.setName('rating').setDescription('指定的Rating').setRequired(true));

async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const ratingNeeded = interaction.options.getInteger('rating');
    let result: {
        constant: string;
        achievement: string;
        rank: string;
        allPerfect?: boolean;
    }[] = [];
    for (let constant = 1; constant <= 15; constant += 0.1) {
        const thisResult = [];
        let achievement = 0;

        let canAchieveWithoutAP = false;

        let calculateRate = 1;
        while (parseFloat(achievement.toFixed(4)) <= 101) {
            const rating = Math.floor(
                (parseFloat((achievement > 100.5 ? 100.5 : achievement).toFixed(4)) / 100) *
                    getRankFactor(achievement) *
                    parseFloat(constant.toFixed(1)) *
                    100,
            );
            if (rating >= (ratingNeeded ?? 0)) {
                if (calculateRate === 0.0001) {
                    canAchieveWithoutAP = true;
                    if (!result.some((item) => item.achievement === achievement.toFixed(4) && !item.allPerfect)) {
                        thisResult.push({
                            constant: constant.toFixed(1),
                            achievement: achievement.toFixed(4),
                            rank: convertAchievementToRank(parseFloat(achievement.toFixed(4))),
                        });
                    }
                    break;
                } else {
                    achievement -= calculateRate;
                    calculateRate /= 10;
                }
            }

            achievement += calculateRate;
        }

        if (!canAchieveWithoutAP && calculateRating(100.5, constant, true) >= (ratingNeeded ?? 0)) {
            result.push({
                constant: constant.toFixed(1),
                achievement: '100.5000',
                rank: 'SSS+',
                allPerfect: true,
            });
        } else {
            result = result.concat(thisResult);
        }
    }

    if (result.length === 0) {
        return await interaction.editReply({
            content: `指定的Rating (${ratingNeeded}) 無法達成`,
        });
    }

    let resultString = `Rating: ${ratingNeeded}\`\`\`\n${'Constant'.padEnd(9, ' ')} - ${'Achievement'.padEnd(12, ' ')} (Rank)\n`;
    let index = 0;
    for (let item of result) {
        let thisConstant = parseFloat(item.constant);
        let nextConstant = parseFloat(result[index + 1]?.constant);
        let toAddString = `${`${parseFloat(item.constant).toFixed(1).padStart(4, ' ')}${parseFloat((nextConstant - thisConstant).toFixed(1)) > 0.1 ? `~${(nextConstant - 0.1).toFixed(1)}` : `${index === result.length - 1 ? '~' : ''}`}`.padEnd(9, ' ')} - ${(item.allPerfect ? 'ALL PERFECT' : `${parseFloat(item.achievement).toFixed(4).padStart(10, ' ')}%`).padEnd(12, ' ')} (${item.rank})`;
        if ((resultString + toAddString).length > 1900) {
            let leftItemCount = result.length - index;
            resultString += `\n... (還有 ${leftItemCount} 項)\`\`\``;
            break;
        } else {
            resultString += `${toAddString}${index === result.length - 1 ? '\`\`\`' : '\n'}`;
        }
        index++;
    }

    await interaction.editReply({
        content: resultString,
    });
}

export { data, execute };
