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
    // Noto Sans includes the ₹ glyph, which Roboto lacks.
    NotoSans: {
        normal: path.join(fontPath, "NotoSans-Regular.ttf"),
        bold: path.join(fontPath, "NotoSans-Bold.ttf"),
        italics: path.join(fontPath, "NotoSans-Italic.ttf"),
        bolditalics: path.join(fontPath, "NotoSans-BoldItalic.ttf"),
    },
});

// Render the PDF in memory; callers decide whether to stream or store it.
export async function renderPdf(
    definition: TDocumentDefinitions
    ): Promise<Buffer> {
    return pdfmake.createPdf(definition).getBuffer();
}
