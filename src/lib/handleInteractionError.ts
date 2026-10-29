import { MessageComponentInteraction } from 'discord.js';
import { MaimaiDXNetMaintenanceError, PlayerDataFetchError } from './errors';

function getErrorMessageFromError(error: unknown): string | null {
    if (error instanceof MaimaiDXNetMaintenanceError) {
        return `Maimai DX Net is currently under maintenance. Please try again later.`;
    }

    if (error instanceof PlayerDataFetchError) {
        return `Failed to fetch player data.`;
    }

    return null;
}

async function handleComponentError(interaction: MessageComponentInteraction, error: unknown): Promise<void> {
    const errorMessage = getErrorMessageFromError(error);

    if (errorMessage) {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: errorMessage,
                ephemeral: true,
            });
        } else {
            await interaction.reply({
                content: errorMessage,
                ephemeral: true,
            });
        }
    } else {
        console.error('An unexpected error occurred:', error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: 'An unexpected error occurred. Please try again later.',
                ephemeral: true,
            });
        } else {
            await interaction.reply({
                content: 'An unexpected error occurred. Please try again later.',
                ephemeral: true,
            });
        }
    }
}

export { getErrorMessageFromError, handleComponentError };
