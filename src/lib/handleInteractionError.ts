import { Message } from 'discord.js';
import { MaimaiDXNetMaintenanceError, PlayerDataFetchError } from './errors';

function getErrorMessageFromError(error: unknown): string | null {
    if (error instanceof MaimaiDXNetMaintenanceError) {
        return `Maimai DX Net is currently under maintenance. Please try again later.`;
    }

    if (error instanceof PlayerDataFetchError) {
        return `Failed to fetch player data.`;
    }

    return null
}

export { getErrorMessageFromError };