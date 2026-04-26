import fs from 'fs';
import axios from 'axios';
import { logger } from 'process';
import sharp from 'sharp';
import { CanvasRenderingContext2D, CanvasGradient, Image, Canvas, CanvasDrawable } from 'skia-canvas';
import crypto from 'crypto';

async function getImageBuffer(imageURL: string, cache?: boolean): Promise<Buffer> {
    if (cache === undefined) cache = false;

    const hashName = crypto.createHash('md5').update(imageURL).digest('hex');
    const cachePath = `tmp/cache/image/${hashName}.png`;

    try {
        let url = new URL(imageURL);
        if (fs.existsSync(cachePath) && cache) {
            const Buffer = fs.readFileSync(cachePath);
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
                fs.writeFileSync(cachePath, buffer);
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

async function createBlurredBackground(width: number, height: number, backgroundImage: CanvasDrawable): Promise<void> {
    const bgCanvas = new Canvas(width - 60, height - 60);
    const bgCtx = bgCanvas.getContext('2d');
    bgCtx.drawImage(backgroundImage, -30, -30, width, height);
    bgCtx.filter = 'blur(20px)';
    bgCtx.drawImage(bgCanvas, 0, 0, width - 60, height - 60);
    await bgCanvas.toFile('tmp/bg_blurred.png');
}

export { getImageBuffer, drawRoundRect, drawCustomRoundRect, createBlurredBackground };
