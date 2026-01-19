import { SlashCommandBuilder } from 'discord.js';
import crypto from 'crypto';
import { astrodx_decrypt_key } from 'config/config.json';

const data = new SlashCommandBuilder()
    .setName('astrodx')
    .setDescription('AstroDX command')
    .addSubcommand((subcommand) =>
        subcommand
            .setName('decrypt_cache')
            .setDescription('Decrypt AstroDX cache data')
            .addAttachmentOption((option) =>
                option.setName('file').setDescription('The cache file to decrypt').setRequired(true),
            ),
    );

async function execute(interaction: any) {
    if (interaction.options.getSubcommand() === 'decrypt_cache') {
        const file = interaction.options.getAttachment('file');
        if (!file) {
            return interaction.reply({ content: 'No file provided.', ephemeral: true });
        }

        try {
            const response = await fetch(file.url);
            const base64Data = await response.text();
            const encryptedBuffer = Buffer.from(base64Data, 'base64');

            const decipher = crypto.createDecipheriv('aes-256-ecb', astrodx_decrypt_key, null);
            let decrypted = decipher.update(encryptedBuffer);
            decrypted = Buffer.concat([decrypted, decipher.final()]);

            const result = decrypted.toString('utf8');

            const formatted = JSON.stringify(JSON.parse(result), null, 4);

            await interaction.reply({
                content: 'Decrypted file:',
                files: [
                    {
                        attachment: Buffer.from(formatted, 'utf8'),
                        name: 'decrypted.json',
                    },
                ],
            });
        } catch (error) {
            console.error('Error decrypting file:', error);
            return interaction.reply({ content: 'Failed to decrypt the file.', ephemeral: true });
        }
    }
}

export { data, execute };
