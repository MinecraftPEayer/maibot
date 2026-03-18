import { Canvas, Image, loadImage } from 'canvas';
import PATH from 'path';
import fs from 'fs';
import Logger from './logger';

class RatingChartUtils {
    private static instance: RatingChartUtils;
    private assets: Map<string, Canvas | Image> = new Map<string, Canvas | Image>();
    private logger: Logger = new Logger('RatingChartUtils');
    public preloaded = false;

    public static getInstance(): RatingChartUtils {
        if (!RatingChartUtils.instance) {
            RatingChartUtils.instance = new RatingChartUtils();
        }
        return RatingChartUtils.instance;
    }

    constructor() {}

    async preloadAssets() {
        this.assets = new Map<string, Canvas | Image>();
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
                const assets = await loadImage(path);
                this.assets.set(assetPath, assets);
            }
        }

        this.preloaded = true;
        this.logger.log('All assets preloaded');
    }

    async getAsset(name: string): Promise<Canvas | Image | null> {
        if (!this.preloaded) {
            await this.preloadAssets();
        }
        return this.assets.get(name) || null;
    }
}

export default RatingChartUtils;
