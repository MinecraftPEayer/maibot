import { Canvas, CanvasDrawable, Image, loadImage } from 'skia-canvas';
import PATH from 'path';
import fs from 'fs';
import Logger from './logger';
import { ChartType } from './CommonEnums';
import { FontStack } from './Utils';

class RatingChartUtils {
    private static instance: RatingChartUtils;
    private assets: Map<string, CanvasDrawable | Image> = new Map<string, CanvasDrawable | Image>();
    private logger: Logger = new Logger('RatingChartUtils');
    public preloaded = false;

    public static ChartTypeCanvas = {
        [ChartType.DX]: (() => {
            const canvas = new Canvas(71, 20);
            const ctx = canvas.getContext('2d');
            const x = 10, y = 0;

            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 10, y + 20);
            ctx.lineTo(x - 10 + 61, y + 20);
            ctx.lineTo(x + 61, y);
            ctx.lineTo(x, y);
            ctx.fill();

            const TextColor = ['#FF1C00', '#FFAB00', '#FFEB00', '#A4FF00', '#0081FF'];
            const Text = 'でらっくす';
            ctx.font = `10px ${FontStack}`;
            for (let i = 0; i < 50; i += 10) {
                ctx.fillStyle = TextColor[i / 10];
                ctx.lineWidth = 0.5;
                ctx.strokeStyle = TextColor[i / 10];
                ctx.strokeText(Text[i / 10], x + 1 + i, y + 5 + 8);
                ctx.fillText(Text[i / 10], x + 1 + i, y + 5 + 8);
            }
            ctx.save();
            
            return canvas
        })(),
        [ChartType.STD]: (() => {
            const canvas = new Canvas(85, 20);
            const ctx = canvas.getContext('2d');
            const x = 10, y = 0;

            ctx.fillStyle = '#73ADF8';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 10, y + 20);
            ctx.lineTo(x - 10 + 75, y + 20);
            ctx.lineTo(x + 75, y);
            ctx.lineTo(x, y);
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = `10px ${FontStack}`;
            ctx.lineWidth = 0.5;
            ctx.strokeStyle = 'white';
            ctx.strokeText('スタンダード', x + 3, y + 5 + 8);
            ctx.fillText('スタンダード', x + 3, y + 5 + 8);
            ctx.save();

            return canvas
        })()
    }

    public static getInstance(): RatingChartUtils {
        if (!RatingChartUtils.instance) {
            RatingChartUtils.instance = new RatingChartUtils();
        }
        return RatingChartUtils.instance;
    }

    constructor() {}

    async preloadAssets() {
        this.assets = new Map<string, CanvasDrawable | Image>();
        const assetList = [
            'assets/ranking/*.png',
            'assets/rank_center/*.png',
            'assets/background.png',
            'assets/logo.png',
            'tmp/bg_blurred.png',
        ];

        for (let assetPath of assetList) {
            const path = PATH.join(process.cwd(), assetPath);

            this.logger.log('Preloading asset: ' + assetPath);

            if (PATH.basename(assetPath).includes('*')) {
                const dir = PATH.dirname(path);
                const files = fs.readdirSync(dir).filter((file) => file.endsWith(PATH.extname(assetPath)));

                for (let file of files) {
                    const assets = await loadImage(PATH.join(dir, file));
                    this.assets.set(`${PATH.dirname(assetPath)}/${file}`, assets);
                }
            } else {
                if (!fs.existsSync(path)) {
                    this.logger.warn(`Asset not found: ${assetPath}`);
                    continue;
                }
                const assets = await loadImage(path);
                this.assets.set(assetPath, assets);
            }
        }

        this.preloaded = true;
        this.logger.log('All assets preloaded');
    }

    async getAsset(name: string): Promise<CanvasDrawable | Image | null> {
        if (!this.preloaded) {
            await this.preloadAssets();
        }
        return this.assets.get(name) || null;
    }
}

export default RatingChartUtils;
