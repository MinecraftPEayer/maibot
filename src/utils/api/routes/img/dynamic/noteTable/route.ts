import { Request, Response } from 'express';
import { createCanvas, loadImage } from 'canvas';
import { initializeFonts, FontStack } from 'src/lib/Utils';

export async function GET(req: Request, res: Response) {
    const noteType = ['tap', 'hold', 'slide', 'touch', 'break'];
    const judgementColor = ['#D49100', '#FF9D03', '#F75EA3', '#2FCA4C', '#868686'];
    const { tap, hold, slide, touch, break: breakNote } = req.query;

    if (!tap || !hold || !slide || !touch || !breakNote) {
        res.status(400).send({
            code: 400,
            message: 'Bad request',
        });
    }

    const notes = [tap, hold, slide, touch, breakNote].map((note) => String(note));
    if (notes.some((note) => note.split(',').length !== 5)) {
        res.status(400).send({
            code: 400,
            message: 'Bad request',
        });
    }

    initializeFonts();

    const totalData: {
        [key: string]: string[];
    } = {};
    notes.forEach((note, index) => {
        totalData[noteType[index]] = note.split(',');
    });

    const canvas = createCanvas(695, 253);
    const ctx = canvas.getContext('2d');

    let tableImg = await loadImage('assets/NoteTable.png');
    ctx.drawImage(tableImg, 0, 0, 695, 253);

    /**
     * 起始點 164+47=211 / 66+25=91
     * X offset = 66+47=113
     * Y offset = 12+25=37
     */

    ctx.textAlign = 'right';
    ctx.font = `24px ${FontStack}`;
    for (let i = 0; i < 5; i++) {
        Object.values(totalData).forEach((note, index) => {
            ctx.fillStyle = judgementColor[i];
            ctx.fillText(note[i], 211 + i * 113, 88 + index * 37);
        });
    }

    res.header('Content-Type', 'image/png').send(canvas.toBuffer('image/png'));
}
