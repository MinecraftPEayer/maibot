import fs from 'fs';
import axios from 'axios';
import { logger } from 'process';
import sharp from 'sharp';
import { CanvasRenderingContext2D, CanvasGradient } from 'canvas';

async function getImageBuffer(imageURL: string, cache?: boolean): Promise<Buffer> {
    if (cache === undefined) cache = false;
    try {
        let url = new URL(imageURL);
        if (fs.existsSync(`tmp/cache/image/${url.pathname.split('/').pop()}`) && cache) {
            const Buffer = fs.readFileSync(`tmp/cache/image/${url.pathname.split('/').pop()}`);
            return sharp(Buffer).png().toBuffer();
        } else {
            const response = await axios.get(imageURL, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
                },
                validateStatus: (status) => status < 500,
            });
            const buffer = Buffer.from(response.data);
            if (cache) {
                fs.writeFileSync(`tmp/cache/image/${url.pathname.split('/').pop()}`, buffer);
            }
            return await sharp(buffer).png().toBuffer();
        }
    } catch (error) {
        logger.error(`Error fetching image from ${imageURL}:`, error);
        return Buffer.alloc(0);
    }
}

function drawRoundRect(options: {
    ctx: CanvasRenderingContext2D;
    x: number;
    y: number;
    width: number;
    height: number;
    radius: number;
    fillStyle: string;
}) {
    const { ctx, x, y, width, height, radius, fillStyle } = options;
    let originalFillStyle = ctx.fillStyle;
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
    ctx.fillStyle = originalFillStyle;
}

function drawCustomRoundRect(options: {
    ctx: CanvasRenderingContext2D;
    x: number;
    y: number;
    width: number;
    height: number;
    radius?: {
        topLeft?: number;
        topRight?: number;
        bottomLeft?: number;
        bottomRight?: number;
    };
    fillStyle: string | CanvasGradient;
}) {
    const { ctx, x, y, width, height, radius, fillStyle } = options;
    const topLeft = radius?.topLeft ?? 0,
        topRight = radius?.topRight ?? 0,
        bottomLeft = radius?.bottomLeft ?? 0,
        bottomRight = radius?.bottomRight ?? 0;
    let originalFillStyle = ctx.fillStyle;
    ctx.beginPath();
    ctx.moveTo(x + topLeft, y);
    ctx.lineTo(x + width - topRight, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + topRight);
    ctx.lineTo(x + width, y + height - bottomRight);
    ctx.quadraticCurveTo(x + width, y + height, x + width - bottomRight, y + height);
    ctx.lineTo(x + bottomLeft, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - bottomLeft);
    ctx.lineTo(x, y + topLeft);
    ctx.quadraticCurveTo(x, y, x + topLeft, y);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.fillStyle = originalFillStyle;
}

export { getImageBuffer, drawRoundRect, drawCustomRoundRect };
