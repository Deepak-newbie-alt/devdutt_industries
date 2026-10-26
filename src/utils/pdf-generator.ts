import { mkdir } from "node:fs/promises";
import pdfmake from "pdfmake";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TDocumentDefinitions } from "pdfmake/interfaces.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const fontPath = path.resolve(currentDir, "../../assets/fonts");

pdfmake.addFonts({
    Roboto: {
        normal: path.join(fontPath, "Roboto-Regular.ttf"),
        bold: path.join(fontPath, "Roboto-Bold.ttf"),
        italics: path.join(fontPath, "Roboto-Italic.ttf"),
        bolditalics: path.join(fontPath, "Roboto-BoldItalic.ttf"),
    },
});

export async function generatePdf(
    definition: TDocumentDefinitions,
    outputPath: string
    ): Promise<void> {
    await mkdir(path.dirname(outputPath), {
        recursive: true,
    });

    await pdfmake.createPdf(definition).write(outputPath);
}
