import { Client, REST, Routes } from 'discord.js';
import fs from 'fs';
import 'dotenv/config';
import init from './lib/init';
import MaimaiDXNetFetcher from './lib/maimaiDXNetFetcher';
import SongDataFetcher from './lib/SongDataFetcher';

init();

declare module 'discord.js' {
    export interface Client {
        commands: Map<string, any>;
    }
}

const client = new Client({
    intents: ['Guilds', 'GuildMessages', 'MessageContent'],
});

client.commands = new Map<string, any>();
let commands = [];

const fetcher = MaimaiDXNetFetcher.getInstance();
fetcher.login();

client.on('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}`);

    const files = fs.readdirSync('./src/commands').filter((file) => file.endsWith('.command.ts'));

    for (const file of files) {
        const command = await import(`./commands/${file}`);
        if (command.data && command.execute) {
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());
        } else {
            console.error(`Command file ${file} is missing data or execute properties.`);
        }
    }

    SongDataFetcher.getInstance();

    const rest = new REST({ version: '9' }).setToken(process.env.TOKEN!);

    rest.put(Routes.applicationGuildCommands(client.user!.id, '1120284154957930588'), {
        body: commands,
    })
        .then(() => {
            console.log('Successfully registered application commands.');
        })
        .catch(console.error);
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command.autocomplete) {
            return interaction.respond([]);
        }

        try {
            const choices = await command.autocomplete(interaction);
            await interaction.respond(choices);
        } catch (error) {
            console.error(`Error handling autocomplete for command ${interaction.commandName}:`, error);
            await interaction.respond([]);
        }
    }

    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            return interaction.reply({
                content: 'Command not found.',
                ephemeral: true,
            });
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing command ${interaction.commandName}:`, error);
            if (interaction.replied) {
                await interaction.editReply({
                    content: `There was an error while executing this command.\`\`\`js\n${error}\`\`\``,
                });
            } else if (interaction.deferred) {
                await interaction.editReply({
                    content: `There was an error while executing this command.\`\`\`js\n${error}\`\`\``,
                });
            } else {
                await interaction.reply({
                    content: `There was an error while executing this command.\`\`\`js\n${error}\`\`\``,
                });
            }
        }
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('m!')) return;
    const args = message.content.slice(2).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    switch (commandName) {
        case 'emoji':
            message.reply(
                '<:STD_1:1383100401674616992><:STD_2:1383100409719160982><:STD_3:1383100417835012121> <:DX_1:1383100369646649444><:DX_2:1383100379788607548><:DX_3:1383100392094568609>\n<:AP_Full:1383099146613030992> <:APp_Full:1383099218666983554> <:FC_Full:1383099259905376389> <:FCp_Full:1383099291052146769>\n<:AP_Short:1383099404445024296> <:APp_Short:1383099443649314836> <:FC_Short:1383099484409692200> <:FCp_Short:1383099544086122496>\n<:FS_Full:1383102728825471037> <:FSp_Full:1383102763684069466> <:FS_Short:1383102801982390372> <:FSp_Short:1383102832856531145>\n<:FSDX_Full:1383102866860019802> <:FSDXp_Full:1383102917892112445> <:FSDX_Short:1383102954067722363> <:FSDXp_Short:1383102987622420704>',
            );
            break;
        default:
            return message.reply({
                content: `Unknown command: ${commandName}`,
                allowedMentions: { repliedUser: false },
            });
    }
});

client.login(process.env.TOKEN);
