import {
    ApplicationCommand,
    ApplicationCommandData,
    Client,
    Collection,
    RESTPostAPIApplicationCommandsJSONBody,
    Snowflake,
} from 'discord.js';
import fs from 'fs';

export type LocalCommand = RESTPostAPIApplicationCommandsJSONBody;

export interface CommandDiff {
    added: string[];
    removed: string[];
    changed: string[];
}

function diffCommand(
    remote: Collection<Snowflake, ApplicationCommand<any>>,
    local: readonly LocalCommand[],
): CommandDiff {
    const localByName = new Map(local.map((c) => [c.name, JSON.parse(JSON.stringify(c)) as LocalCommand]));
    const remoteNames = new Set(remote.map((r) => r.name));

    const added = local.filter((c) => !remoteNames.has(c.name)).map((c) => c.name);
    const removed = remote.filter((r) => !localByName.has(r.name)).map((r) => r.name);
    const changed = remote
        .filter((r) => {
            const l = localByName.get(r.name);
            if (!l) return false;

            const normalized = {
                ...l,
                integration_types: l.integration_types ?? r.integrationTypes ?? undefined,
                contexts: l.contexts ?? r.contexts ?? undefined,
            }

            return l !== undefined && !r.equals(normalized as unknown as ApplicationCommandData, true);
        })
        .map((r) => r.name);

    return { added, removed, changed };
}

export async function loadCommand(client: Client, guildId?: string, force?: boolean) {
    const manager = client.application!.commands;
    const commands = [];

    const isDev = process.env.DEVELOPMENT === '1';

    const files = fs.readdirSync('./src/commands').filter((file) => file.endsWith('.command.ts'));

    for (const file of files) {
        try {
            const command = await import(`../commands/${file}`);
            if (command.data && command.execute) {
                client.commands.set(command.data.name, command);
                commands.push(command.data.toJSON());
            } else {
                client.logger.error(`Command file ${file} is missing data or execute properties.`);
            }
        } catch (error) {
            client.logger.error(`Failed to load command file ${file}:`, error);
        }
    }

    const label = 'CommandLoader';

    if (isDev && !guildId) {
        client.logger.warn(`[${label}] Development mode is enabled, but no guild ID is provided, Skipped.`);
        return;
    }

    const targetGuild = isDev ? guildId : undefined;

    try {
        const remote = isDev ? await manager.fetch({ guildId }) : await manager.fetch();
        const { added, removed, changed } = diffCommand(remote, commands);

        if (added.length + removed.length + changed.length === 0 && !force) {
            manager.client.logger.log(`[${label}] ${commands.length} commands up to date, skipped.`);
            return;
        }

        manager.client.logger.log(
            `[${label}] diff: +[${added.join(', ')}] -[${removed.join(', ')}] ~[${changed.join(', ')}]${force ? ' (forced update)' : ''}`,
        );

        if (targetGuild) {
            await manager.set(commands, targetGuild);
            client.logger.log(`[${label}] Synced ${commands.length} commands to guild ${targetGuild}`);
        } else {
            await manager.set(commands);
            client.logger.log(`[${label}] Synced ${commands.length} global commands`);
        }
    } catch (error) {
        client.logger.error(`[${label}] Failed to sync remote commands:`, error);
    }
}
