import { SlashCommandBuilder } from 'discord.js';
import crypto from 'crypto';
import zlib from 'zlib';
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

            let result: string | null = null;

            try {
                const decipher = crypto.createDecipheriv('aes-256-ecb', astrodx_decrypt_key, null);
                let decrypted = decipher.update(encryptedBuffer);
                decrypted = Buffer.concat([decrypted, decipher.final()]);
                result = decrypted.toString('utf8');
                JSON.parse(result);
            } catch (e) {
                result = null;
            }

            if (!result) {
                try {
                    const decompressed = zlib.inflateSync(encryptedBuffer);
                    result = decompressed.toString('utf8');
                    JSON.parse(result);
                } catch (e) {
                    result = null;
                }
            }

            if (!result) {
                try {
                    const decompressedRaw = zlib.inflateRawSync(encryptedBuffer);
                    result = decompressedRaw.toString('utf8');
                    JSON.parse(result);
                } catch (e) {
                    result = null;
                }
            }

            if (!result) {
                throw new Error('All decryption/decompression methods failed.');
            }

            const formatted = JSON.stringify(JSON.parse(result), null, 4);

            await interaction.reply({
                files: [
                    {
                        attachment: Buffer.from(formatted, 'utf8'),
                        name: 'processed.json',
                    },
                ],
            });
        } catch (error) {
            return interaction.reply({
                content: 'Failed to decrypt file.',
                ephemeral: true,
            });
        }
    }
}

export { data, execute };
