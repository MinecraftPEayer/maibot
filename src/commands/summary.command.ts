import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { ChartType, ComboType, SyncType } from 'src/lib/CommonEnums';
import { DifficultyDisplayName } from 'src/lib/constant/CommonConstant';
import PlayerDataService from 'src/lib/PlayerDataService';
import SongDataFetcher from 'src/lib/SongDataFetcher';
import { convertAchievementToRank } from 'src/lib/Utils';
import { PlayerInfo } from 'types/main';
import { Difficulty, ScoreData } from 'types/SongDatabase';

type SummaryScoreData = ScoreData & {
    imageName: string;
    internalLevelValue: number;
};

function sortScoreByRank(scores: SummaryScoreData[]) {
    const output: {
        [rank: string]: SummaryScoreData[];
    } = {};
    scores.forEach((score, key) => {
        let rank = convertAchievementToRank(score.achievement);
        if (/[A-D]/g.test(rank)) rank = 'None';
        output[rank] ? output[rank].push(score) : (output[rank] = [score]);
    });
    return output;
}

function sortScoreByConstant(scores: SummaryScoreData[]) {
    const output: {
        [constant: string]: SummaryScoreData[];
    } = {};
    scores.forEach((score, key) => {
        const constant = score.internalLevelValue.toFixed(1);
        output[constant] ? output[constant].push(score) : (output[constant] = [score]);
    });
    return output;
}

const data = new SlashCommandBuilder()
    .setName('summary')
    .setDescription('idk what should i type here lmao')
    .addNumberOption((option) =>
        option.setName('min_level').setDescription('Minimum level of the summary').setRequired(true),
    )
    .addNumberOption((option) =>
        option.setName('max_level').setDescription('Maximum level of the summary').setRequired(false),
    )
    .addUserOption((option) => option.setName('user').setDescription('User to get the summary for').setRequired(false));

async function execute(interaction: ChatInputCommandInteraction) {
    const minLevel = interaction.options.getNumber('min_level', true);
    const maxLevel = interaction.options.getNumber('max_level', false);
    const user = interaction.options.getUser('user', false) ?? interaction.user;

    const result = await PlayerDataService.getInstance().getPlayerData(interaction, user.id);

    if (!result) {
        await interaction.editReply('Failed to get player data');
        return;
    }

    const { playerData, scoreData } = result;
    const songData = SongDataFetcher.getInstance().getRawData().songs;

    let includedList = new Map<
        string,
        ScoreData & {
            imageName: string;
            internalLevelValue: number;
        }
    >();

    const flatMappedScoreData = new Map(
        Object.values(scoreData)
            .flat()
            .map((score) => [`${score.title}::${score.type}::${score.difficulty}`, score] as const),
    );

    songData.forEach((song, index) => {
        song.sheets.forEach((sheet) => {
            if (sheet.internalLevelValue >= minLevel && (maxLevel ? sheet.internalLevelValue <= maxLevel : true)) {
                const key: `${string}::${ChartType}::${Difficulty}` = `${song.title}::${sheet.type}::${sheet.difficulty}`;
                if (flatMappedScoreData.has(key))
                    includedList.set(key, {
                        imageName: song.imageName,
                        internalLevelValue: sheet.internalLevelValue,
                        ...(flatMappedScoreData.get(key) as ScoreData),
                    });
            }
        });
    });

    const sortedByConstant = sortScoreByConstant(Array.from(includedList.values()));
    const sortedByRank: { [constant: string]: { [rank: string]: SummaryScoreData[] } } = {};
    Object.keys(sortedByConstant).forEach(
        (constant) => (sortedByRank[constant] = sortScoreByRank(sortedByConstant[constant])),
    );

    const orderedConstants = Object.keys(sortedByRank).sort((a, b) => parseFloat(b) - parseFloat(a));

    const rankOrder = ['SSS+', 'SSS', 'SS+', 'SS', 'S+', 'S', 'None'];

    const content = orderedConstants
        .map((constant) => {
            const ranks = rankOrder
                .filter((rank) => sortedByRank[constant][rank])
                .map((rank) => {
                    const entries = sortedByRank[constant][rank]
                        .map((s) => `${s.title},${s.type === 0 ? 'STD' : 'DX'},${DifficultyDisplayName[s.difficulty]}`)
                        .join('\n,,');
                    return `,${rank},${entries}`;
                })
                .join('\n');
            return `${constant}${ranks}`;
        })
        .join('\n');

    await interaction.editReply({
        content: `\`\`\`\n${content}\`\`\``,
        embeds: [],
        components: [],
    });
}

export { data, execute };
