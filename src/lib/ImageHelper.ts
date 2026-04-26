import { CanvasDrawable, Image, loadImage } from 'skia-canvas';
import { getImageBuffer } from './DrawImageUtils';

class ImageHelper {
    private static instance: ImageHelper;
    private limit: number = 1000;

    imageCacheMap: Map<string, CanvasDrawable | Image> = new Map<string, CanvasDrawable>();

    public static getInstance(): ImageHelper {
        if (!ImageHelper.instance) {
            ImageHelper.instance = new ImageHelper();
        }
        return ImageHelper.instance;
    }

    constructor() {
        this.imageCacheMap = new Map<string, CanvasDrawable>();
    }

    loadImage = async (name: string): Promise<CanvasDrawable> => {
        if (!this.imageCacheMap.has(name)) {
            const isURL = /^(http|https):\/\//.test(name);
            const image = await (isURL ? loadImage(await getImageBuffer(name, true)) : loadImage(name));
            this.imageCacheMap.set(name, image);

            if (this.imageCacheMap.size > this.limit) {
                const firstKey = this.imageCacheMap.keys().next().value;
                this.imageCacheMap.delete(firstKey!);
            }
            return image;
        }
        return this.imageCacheMap.get(name)!;
    };
}

export default ImageHelper;
