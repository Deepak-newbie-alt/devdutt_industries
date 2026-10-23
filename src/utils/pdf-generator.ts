
import pdfmake from "pdfmake";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TDocumentDefinitions } from "pdfmake/interfaces.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const fontPath = path.resolve(currentDir, "../../assets/fonts");

pdfmake.addFonts({
    Roboto: {
        normal: path.join(fontPath, "Roboto-Regular.ttf"),
        bold: path.join(fontPath, "Roboto-Regular.ttf"),
        italics: path.join(fontPath, "Roboto-Italic.ttf"),
        bolditalics: path.join(fontPath, "Roboto-Italic.ttf"),
    },
});

export async function generatePdf(
    definition: TDocumentDefinitions,
    outputPath: string,
    ): Promise<void> {
    await pdfmake.createPdf(definition).write(outputPath);
}
