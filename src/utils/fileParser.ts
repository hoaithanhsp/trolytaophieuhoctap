import mammoth from 'mammoth';

export async function parseDocx(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
}

export async function parsePdf(file: File): Promise<string> {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const textParts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
            .map((item: { str?: string }) => item.str || '')
            .join(' ');
        textParts.push(pageText);
    }

    return textParts.join('\n\n').trim();
}

export async function parseUploadedFile(file: File): Promise<string> {
    const name = file.name.toLowerCase();

    if (name.endsWith('.docx') || name.endsWith('.doc')) {
        return parseDocx(file);
    }

    if (name.endsWith('.pdf')) {
        return parsePdf(file);
    }

    // Fallback: read as text
    return file.text();
}

export function getAcceptedFileTypes(): string {
    return '.docx,.doc,.pdf,.txt';
}

export function getFileTypeLabel(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'docx':
        case 'doc':
            return 'Word';
        case 'pdf':
            return 'PDF';
        case 'txt':
            return 'Text';
        default:
            return 'File';
    }
}
