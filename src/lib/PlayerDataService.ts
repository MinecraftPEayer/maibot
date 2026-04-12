import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
} from 'discord.js';
import fs from 'fs';
import MaimaiDXNetFetcher from './maimaiDXNetFetcher';
import { ComboType, Difficulty, ScoreType, SyncType } from './CommonEnums';
import { convertDXScoreToStar } from './Utils';
import { PlayerInfo } from 'types/main';
import { ScoreData } from 'types/SongDatabase';

const fetcher = MaimaiDXNetFetcher.getInstance();

const ConfirmActionRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(new ButtonBuilder().setLabel('Yes').setStyle(ButtonStyle.Success).setCustomId('yes'))
    .addComponents(new ButtonBuilder().setLabel('No').setStyle(ButtonStyle.Danger).setCustomId('no'));

class PlayerDataService {
    private static instance: PlayerDataService;
    private DifficultyDisplayNames = {
        [Difficulty.Basic]: 'BASIC',
        [Difficulty.Advanced]: 'ADVANCED',
        [Difficulty.Expert]: 'EXPERT',
        [Difficulty.Master]: 'MASTER',
        [Difficulty.ReMaster]: 'Re:MASTER',
        [Difficulty.UTAGE]: 'UTAGE',
    };
    private Difficulties = [
        Difficulty.Basic,
        Difficulty.Advanced,
        Difficulty.Expert,
        Difficulty.Master,
        Difficulty.ReMaster,
        Difficulty.UTAGE,
    ];

    private constructor() {}

    public static getInstance(): PlayerDataService {
        if (!PlayerDataService.instance) {
            PlayerDataService.instance = new PlayerDataService();
        }
        return PlayerDataService.instance;
    }

    public async getPlayerData(
        interaction: ChatInputCommandInteraction | ButtonInteraction,
        userId: string,
    ): Promise<{ playerData: PlayerInfo; scoreData: Record<string, ScoreData[]> } | null> {
        if (!userId) userId = interaction.user.id;

        const friendCode = fetcher.getFriendCodeByDiscordId(userId);

        if (!friendCode) {
            await interaction.reply('No linked account found. Please link your account first.');
            return null;
        }

        if (fs.existsSync(`./data/user/${userId}/latest.json`)) {
            // Bookmarklet data exists
            await interaction.reply('Processing...');

            const latestData = JSON.parse(fs.readFileSync(`./data/user/${userId}/latest.json`, 'utf-8'));

            const scores: Record<string, ScoreData[]> = {};

            for (let key in latestData.allScores) {
                scores[key] = latestData.allScores[key].map((score: any) => {
                    return {
                        title: score.name,
                        type: score.chartType,
                        difficulty: score.difficulty || Difficulty.Basic,
                        achievement: score.achievement,
                        comboType: score.comboType || ComboType.None,
                        syncType: score.syncType || SyncType.None,
                        dxScore: score.dxScore[0],
                        dxStar: convertDXScoreToStar(score.dxScore[0], score.dxScore[1]),
                    };
                });
            }

            const playerInfo: PlayerInfo = {
                name: latestData.playerData.playerName,
                rating: latestData.playerData.rating,
                avatar: latestData.playerData.avatar,
                title: latestData.playerData.title.text,
                titleType: latestData.playerData.title.type,
                course: latestData.playerData.course,
                classRank: latestData.playerData['class'],
            };

            return { playerData: playerInfo, scoreData: scores };
        } else {
            const cacheDataExists = fetcher.playerCacheDataExists(friendCode);
            const cacheDataDate = fetcher.getLatestCacheDataDate(friendCode);

            if (cacheDataExists && cacheDataDate && Date.now() - cacheDataDate.getTime() <= 24 * 60 * 60 * 1000) {
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('We found cached score data. Would you like to use it or fetch new data?')
                            .setDescription(`Time: <t:${(cacheDataDate.getTime() / 1000).toFixed()}:F>`),
                    ],
                    components: [ConfirmActionRow],
                });

                const reply = await interaction.fetchReply();

                const btnI = await reply.awaitMessageComponent({
                    filter: (i) => i.user.id === interaction.user.id,
                });

                await btnI.deferUpdate();

                if (btnI.customId === 'yes') {
                    // use cached data
                    return fetcher.getPlayerCacheData(friendCode);
                } else {
                    // fetch new data
                    return await this.fetchNewData(interaction, userId, {
                        scoreType: ScoreType.Achievement,
                    });
                }
            } else {
                // No valid data exists, fetch new data
                return await this.fetchNewData(interaction, userId, {
                    scoreType: ScoreType.Achievement,
                });
            }
        }
    }

    private async fetchNewData(
        interaction: ChatInputCommandInteraction | ButtonInteraction,
        userId: string,
        options?: {
            scoreType: ScoreType;
        },
    ): Promise<{ playerData: PlayerInfo; scoreData: Record<string, ScoreData[]> } | null> {
        if (!options)
            options = {
                scoreType: ScoreType.Achievement,
            };

        let message = 'Fetching player info...';
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ content: message, embeds: [], components: [] });
        } else {
            await interaction.reply({ content: message, embeds: [], components: [] });
        }

        const friendCode = fetcher.getFriendCodeByDiscordId(userId);

        if (!friendCode) {
            await interaction.editReply('No linked account found. Please link your account first.');
            return null;
        }

        let playerInfo = await fetcher.getPlayer(friendCode);

        if (!playerInfo) {
            await interaction.editReply('Failed to fetch player info. Please try again later.');
            return null;
        }

        message += 'OK\nFetching scores...';

        await interaction.editReply(message);

        const scores: Record<string, ScoreData[]> = {};
        for (const [difficulty, displayName] of Object.entries(this.DifficultyDisplayNames)) {
            if (!this.Difficulties.includes(parseInt(difficulty))) continue;

            message += `\n > Fetching ${displayName} scores...`;
            await interaction.editReply(message);
            const scoreData = await fetcher.getScores(options.scoreType, friendCode, parseInt(difficulty));
            scores[displayName] = scoreData.data;
            message += ' OK';
        }

        fetcher.savePlayerCacheData(friendCode, {
            playerData: playerInfo,
            scoreData: scores,
        });

        return { playerData: playerInfo, scoreData: scores };
    }
}

export default PlayerDataService;
