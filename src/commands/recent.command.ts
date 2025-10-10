import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    ContainerBuilder,
    MediaGalleryBuilder,
    MessageFlags,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SlashCommandBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
} from 'discord.js';
import fs from 'fs';
import SongDataFetcher from 'src/lib/SongDataFetcher';
import { getDifficultyEmoji } from 'src/lib/Utils';
import { ChartType, ComboType, Difficulty, SyncType } from 'src/lib/CommonEnums';
import { Emojis } from 'src/lib/constant/emojis';

const DifficultyColor = {
    [Difficulty.Basic]: 0x45c124,
    [Difficulty.Advanced]: 0xffba01,
    [Difficulty.Expert]: 0xff7b7b,
    [Difficulty.Master]: 0x9f51dc,
    [Difficulty.ReMaster]: 0xdbaaff,
    [Difficulty.UTAGE]: 0xff6ffd,
};

const SyncEmojiName = {
    [SyncType.FS]: 'FS',
    [SyncType.FSp]: 'FSp',
    [SyncType.FDX]: 'FDX',
    [SyncType.FDXp]: 'FDXp',
    [SyncType.SYNC]: 'SYNC',
};

const ComboEmojiName = {
    [ComboType.FC]: 'FC',
    [ComboType.FCp]: 'FCp',
    [ComboType.AP]: 'AP',
    [ComboType.APp]: 'APp',
};

const ChartTypeEmojiName: Record<ChartType, 'STD' | 'DX'> = {
    [ChartType.STD]: 'STD',
    [ChartType.DX]: 'DX',
    [ChartType.UTAGE]: 'DX',
};

const ActionRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(new ButtonBuilder().setCustomId('previous').setLabel('Previous').setStyle(ButtonStyle.Primary))
    .addComponents(new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Primary));

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

    let playerData = JSON.parse(fs.readFileSync(`data/user/${userId}/latest.json`, 'utf-8')).playerData;

    let detailedData = JSON.parse(fs.readFileSync(`data/user/${userId}/detailed.json`, 'utf-8')).sort(
        (a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime(),
    );
    let splitedByCredit: any[] = [];
    for (let i = 0; i < detailedData.length; i++) {
        let track = detailedData[i].track;
        let thisCredit = detailedData.slice(i, i + track);
        splitedByCredit.push(thisCredit);
        i += track - 1;
    }
    splitedByCredit.sort((a, b) => new Date(b[0].time).getTime() - new Date(a[0].time).getTime());

    let buttonState = [true, true]; // [previous, next]

    let container = new ContainerBuilder();

    let headerText = new TextDisplayBuilder().setContent([`# ${playerData.playerName}`].join('\n'));
    container.addTextDisplayComponents(headerText);

    let index = 0;
    function getTracks(index: number) {
        container.spliceComponents(1, container.components.length - 1);
        splitedByCredit[index]
            .sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime())
            .forEach((track: any) => {
                container.addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true),
                );

                let trackTimeAndIndex = new TextDisplayBuilder().setContent(
                    `TRACK ${track.track} - <t:${Math.floor(new Date(track.time).getTime() / 1000)}:f>`,
                );
                container.addTextDisplayComponents(trackTimeAndIndex);

                let trackInfoSection = new SectionBuilder();
                let trackInfoText = new TextDisplayBuilder().setContent(
                    [
                        `## ${track.songName}`,
                        `### ${track.achievement}% ${track.achievementNewRecord ? '(New Record)' : ''}`,
                        `${Emojis[ChartTypeEmojiName[track.chartType as keyof typeof ChartTypeEmojiName]]} ${getDifficultyEmoji(track.difficulty)}`,
                        `DX Score: ${track.dxScore.join('/')} ${track.dxScoreNewRecord ? '(New Record)' : ''}`,
                        `Combo: ${track.combo.join('/')}\tSync: ${track.sync.join('/')}`,
                        `${track.fcType === ComboType.None && track.syncType === SyncType.None ? '' : '# '}${track.fcType === ComboType.None ? '' : Emojis[`${ComboEmojiName[track.fcType as keyof typeof ComboEmojiName]}_Short` as keyof typeof Emojis]} ${track.syncType === SyncType.None ? '' : Emojis[`${SyncEmojiName[track.syncType as keyof typeof SyncEmojiName]}${track.syncType === SyncType.SYNC ? '' : '_Short'}` as keyof typeof Emojis]}`,
                    ].join('\n'),
                );
                let trackInfoThumbnail = new ThumbnailBuilder().setURL(
                    `https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover-m/${SongDataFetcher.getInstance().getSongByName(track.songName).imageName}`,
                );
                let trackInfoNoteTable = new MediaGalleryBuilder().addItems({
                    media: {
                        url: `https://maibot.minecraftpeayer.me/img/dynamic/noteTable?tap=${track.noteDetail['tap'].join(',')}&hold=${track.noteDetail['hold'].join(',')}&slide=${track.noteDetail['slide'].join(',')}&touch=${track.noteDetail['touch'].join(',')}&break=${track.noteDetail['break'].join(',')}&`,
                        width: 128,
                    },
                });

                trackInfoSection.addTextDisplayComponents(trackInfoText).setThumbnailAccessory(trackInfoThumbnail);
                container.addSectionComponents(trackInfoSection);

                container.addMediaGalleryComponents(trackInfoNoteTable);
            });

        buttonState = [index > 0, index < splitedByCredit.length - 1];

        ActionRow.components[0].setDisabled(!buttonState[0]);
        ActionRow.components[1].setDisabled(!buttonState[1]);

        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true),
        );

        container.addActionRowComponents(ActionRow);
    }

    getTracks(index);

    let reply = await interaction.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
    let collector = reply.createMessageComponentCollector({ filter: (i) => i.user.id === interaction.user.id });
    let timeout = setTimeout(() => {
        collector.emit('end');
    }, 60000);

    collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            collector.emit('end');
        }, 60000);

        switch (buttonInteraction.customId) {
            case 'previous':
                if (index === 0) return;
                getTracks(--index);
                break;
            case 'next':
                if (index === splitedByCredit.length - 1) return;
                getTracks(++index);
                break;
        }

        await buttonInteraction.deferUpdate();
        interaction.editReply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
    });

    collector.on('end', async () => {
        container.spliceComponents(container.components.length - 2, 2);
        try {
            await interaction.editReply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
        } catch (e) {}
    });
};

export { data, execute };
