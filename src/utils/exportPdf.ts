import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Worksheet } from '../types';
import { QUESTION_TYPE_LABELS, GRADE_LEVEL_LABELS, DIFFICULTY_LABELS } from '../types';

export async function exportWorksheetToPdf(
  worksheet: Worksheet,
  includeAnswers: boolean,
  printElement?: HTMLElement | null
): Promise<void> {
  // Strategy: If printElement is available and has MathJax rendered content,
  // use html2canvas to capture it. Otherwise, generate text-based PDF.

  if (printElement) {
    try {
      await renderHtmlToPdf(worksheet, printElement, includeAnswers);
      return;
    } catch {
      // Fallback to text-based PDF
    }
  }

  await generateTextPdf(worksheet, includeAnswers);
}

async function renderHtmlToPdf(
  worksheet: Worksheet,
  element: HTMLElement,
  _includeAnswers: boolean
): Promise<void> {
  // Wait for MathJax to finish rendering
  if (window.MathJax?.typesetPromise) {
    await window.MathJax.typesetPromise([element]);
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10; // mm

  const usableWidth = pageWidth - 2 * margin;
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = usableWidth / imgWidth;
  const scaledHeight = imgHeight * ratio;

  if (scaledHeight <= pageHeight - 2 * margin) {
    pdf.addImage(imgData, 'PNG', margin, margin, usableWidth, scaledHeight);
  } else {
    // Split across multiple pages
    const pageImgHeight = (pageHeight - 2 * margin) / ratio;
    let yOffset = 0;

    while (yOffset < imgHeight) {
      const sliceHeight = Math.min(pageImgHeight, imgHeight - yOffset);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = imgWidth;
      sliceCanvas.height = sliceHeight;
      const ctx = sliceCanvas.getContext('2d')!;
      ctx.drawImage(canvas, 0, yOffset, imgWidth, sliceHeight, 0, 0, imgWidth, sliceHeight);

      const sliceData = sliceCanvas.toDataURL('image/png');
      const scaledSliceH = sliceHeight * ratio;
      pdf.addImage(sliceData, 'PNG', margin, margin, usableWidth, scaledSliceH);

      yOffset += sliceHeight;
      if (yOffset < imgHeight) pdf.addPage();
    }
  }

  const fileName = `${worksheet.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF ]/g, '_')}.pdf`;
  pdf.save(fileName);
}

async function generateTextPdf(worksheet: Worksheet, includeAnswers: boolean): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // Use a font that supports Vietnamese
  pdf.setFont('helvetica');

  const addText = (text: string, x: number, y: number, size: number, style: 'normal' | 'bold' = 'normal', maxWidth?: number) => {
    pdf.setFontSize(size);
    pdf.setFont('helvetica', style);
    if (maxWidth) {
      const lines = pdf.splitTextToSize(text, maxWidth);
      pdf.text(lines, x, y);
      return lines.length * size * 0.4;
    }
    pdf.text(text, x, y);
    return size * 0.4;
  };

  const checkPageBreak = (neededHeight: number) => {
    if (yPos + neededHeight > pdf.internal.pageSize.getHeight() - margin) {
      pdf.addPage();
      yPos = margin;
    }
  };

  // Title section
  if (worksheet.schoolName) {
    yPos += addText(worksheet.schoolName, pageWidth / 2, yPos, 9, 'normal', contentWidth);
    pdf.setFontSize(9);
    const schoolWidth = pdf.getTextWidth(worksheet.schoolName);
    pdf.text(worksheet.schoolName, (pageWidth - schoolWidth) / 2, yPos - 2);
    yPos += 3;
  }

  yPos += 2;
  addText('PHIEU HOC TAP', pageWidth / 2, yPos, 16, 'bold');
  pdf.setFontSize(16);
  const titleWidth = pdf.getTextWidth('PHIEU HOC TAP');
  pdf.text('PHIEU HOC TAP', (pageWidth - titleWidth) / 2, yPos);
  yPos += 8;

  addText(worksheet.title, pageWidth / 2, yPos, 12, 'bold');
  pdf.setFontSize(12);
  const subTitleWidth = pdf.getTextWidth(worksheet.title);
  pdf.text(worksheet.title, (pageWidth - subTitleWidth) / 2, yPos);
  yPos += 5;

  const info = `Mon: ${worksheet.subjectName} | Cap: ${GRADE_LEVEL_LABELS[worksheet.gradeLevel]} | ${worksheet.questions.length} cau`;
  pdf.setFontSize(9);
  pdf.setTextColor(120, 120, 120);
  const infoWidth = pdf.getTextWidth(info);
  pdf.text(info, (pageWidth - infoWidth) / 2, yPos);
  pdf.setTextColor(0, 0, 0);
  yPos += 8;

  // Divider
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;

  // Questions
  worksheet.questions.forEach((q, i) => {
    checkPageBreak(30);

    // Strip LaTeX delimiters for text PDF
    const cleanContent = stripLatex(q.content);

    const typeLabel = QUESTION_TYPE_LABELS[q.type];
    const diffLabel = DIFFICULTY_LABELS[q.difficulty];

    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`[${typeLabel}] [${diffLabel}]`, margin, yPos);
    yPos += 4;

    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    const qLines = pdf.splitTextToSize(`Cau ${i + 1}: ${cleanContent}`, contentWidth);
    pdf.text(qLines, margin, yPos);
    yPos += qLines.length * 5 + 2;
    pdf.setFont('helvetica', 'normal');

    if (q.type === 'multiple_choice' && q.options) {
      q.options.forEach((opt, j) => {
        checkPageBreak(6);
        const label = String.fromCharCode(65 + j);
        pdf.setFontSize(10);
        pdf.text(`  ${label}. ${stripLatex(opt)}`, margin + 4, yPos);
        yPos += 5;
      });
    }

    if (q.type === 'matching' && q.matchingPairs) {
      q.matchingPairs.forEach((pair, j) => {
        checkPageBreak(6);
        pdf.setFontSize(10);
        pdf.text(`  ${j + 1}. ${stripLatex(pair.left)}  →  ${String.fromCharCode(97 + j)}. ${stripLatex(pair.right)}`, margin + 4, yPos);
        yPos += 5;
      });
    }

    if (q.type === 'true_false' && q.options) {
      pdf.setFontSize(10);
      pdf.text(`  ${q.options.join(' / ')}`, margin + 4, yPos);
      yPos += 5;
    }

    yPos += 4;
  });

  // Answer key
  if (includeAnswers) {
    checkPageBreak(20);
    yPos += 4;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BANG DAP AN', margin, yPos);
    yPos += 7;
    pdf.setFont('helvetica', 'normal');

    worksheet.answerKey.forEach(ak => {
      checkPageBreak(10);
      pdf.setFontSize(10);
      pdf.text(`Cau ${ak.questionIndex}: ${stripLatex(ak.answer)}`, margin, yPos);
      yPos += 4;
      if (ak.explanation) {
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        const expLines = pdf.splitTextToSize(`  ${stripLatex(ak.explanation)}`, contentWidth - 10);
        pdf.text(expLines, margin + 5, yPos);
        yPos += expLines.length * 3 + 2;
        pdf.setTextColor(0, 0, 0);
      }
      yPos += 2;
    });
  }

  const fileName = `${worksheet.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF ]/g, '_')}.pdf`;
  pdf.save(fileName);
}

function stripLatex(text: string): string {
  if (!text) return '';
  return text
    .replace(/\$\$(.*?)\$\$/g, '$1')
    .replace(/\$(.*?)\$/g, '$1')
    .replace(/\\frac\{(.*?)\}\{(.*?)\}/g, '($1/$2)')
    .replace(/\\sqrt\{(.*?)\}/g, 'sqrt($1)')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\text\{(.*?)\}/g, '$1')
    .replace(/\^(\{.*?\}|\w)/g, (_, p) => `^${p.replace(/[{}]/g, '')}`)
    .replace(/_(\{.*?\}|\w)/g, (_, p) => `_${p.replace(/[{}]/g, '')}`)
    .replace(/\\\\/g, '')
    .replace(/\\[a-zA-Z]+/g, '');
}

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
    };
  }
}
