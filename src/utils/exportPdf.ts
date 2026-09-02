import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Worksheet } from '../types';
import { QUESTION_TYPE_LABELS, GRADE_LEVEL_LABELS, DIFFICULTY_LABELS } from '../types';

export async function exportWorksheetToPdf(
  worksheet: Worksheet,
  includeAnswers: boolean,
  printElement?: HTMLElement | null
): Promise<void> {
  // Strategy 1: If printElement is provided, capture it directly via html2canvas
  if (printElement) {
    try {
      await renderHtmlToPdf(worksheet, printElement, includeAnswers);
      return;
    } catch {
      // Fallback to Strategy 2
    }
  }

  // Strategy 2: Build a temporary hidden DOM element with full Vietnamese support,
  // render it via html2canvas, then generate PDF from the image.
  await renderFromBuiltHtml(worksheet, includeAnswers);
}

async function renderHtmlToPdf(
  worksheet: Worksheet,
  element: HTMLElement,
  includeAnswers: boolean
): Promise<void> {
  // Wait for MathJax to finish rendering
  if (window.MathJax?.typesetPromise) {
    await window.MathJax.typesetPromise([element]);
  }

  // If includeAnswers, clone the element and append answers section
  let targetElement = element;
  let clonedContainer: HTMLDivElement | null = null;

  if (includeAnswers && worksheet.answerKey?.length) {
    clonedContainer = document.createElement('div');
    clonedContainer.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:white;padding:0;';
    clonedContainer.innerHTML = element.innerHTML;

    // Append answer key section
    const answerHtml = buildAnswerKeyHtml(worksheet);
    clonedContainer.insertAdjacentHTML('beforeend', answerHtml);

    document.body.appendChild(clonedContainer);
    targetElement = clonedContainer;

    // Allow layout to settle
    await new Promise(r => setTimeout(r, 200));
  }

  try {
    await captureAndSavePdf(targetElement, worksheet);
  } finally {
    if (clonedContainer) {
      document.body.removeChild(clonedContainer);
    }
  }
}

async function renderFromBuiltHtml(worksheet: Worksheet, includeAnswers: boolean): Promise<void> {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:white;padding:40px;font-family:"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:#1e293b;line-height:1.6;';

  // Build complete HTML content with Vietnamese support
  container.innerHTML = buildWorksheetHtml(worksheet, includeAnswers);

  document.body.appendChild(container);

  // Wait for layout
  await new Promise(r => setTimeout(r, 300));

  try {
    await captureAndSavePdf(container, worksheet);
  } finally {
    document.body.removeChild(container);
  }
}

async function captureAndSavePdf(element: HTMLElement, worksheet: Worksheet): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    width: element.scrollWidth,
    height: element.scrollHeight,
    windowWidth: element.scrollWidth,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8; // mm

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

function escHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripLatex(text: string): string {
  if (!text) return '';
  return text
    .replace(/\$\$(.*?)\$\$/g, '$1')
    .replace(/\$(.*?)\$/g, '$1')
    .replace(/\\frac\{(.*?)\}\{(.*?)\}/g, '($1/$2)')
    .replace(/\\sqrt\{(.*?)\}/g, '√($1)')
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

function buildWorksheetHtml(worksheet: Worksheet, includeAnswers: boolean): string {
  const headerStyle = 'text-align:center;margin-bottom:4px;';
  const titleStyle = 'text-align:center;font-size:22px;font-weight:700;color:#0d9488;margin:8px 0 4px;letter-spacing:1px;';
  const subTitleStyle = 'text-align:center;font-size:16px;font-weight:600;color:#334155;margin:4px 0;';
  const infoStyle = 'text-align:center;font-size:12px;color:#94a3b8;margin-bottom:16px;';
  const dividerStyle = 'border:none;border-top:1px solid #e2e8f0;margin:12px 0;';
  const qBlockStyle = 'margin-bottom:16px;padding:10px 14px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;';
  const qLabelStyle = 'font-size:11px;color:#94a3b8;margin-bottom:4px;';
  const qContentStyle = 'font-size:14px;font-weight:600;color:#1e293b;margin-bottom:6px;line-height:1.6;';
  const optionStyle = 'font-size:13px;color:#334155;padding:3px 0 3px 12px;';
  const hintStyle = 'font-size:12px;color:#94a3b8;font-style:italic;padding:4px 0 0 12px;';

  let html = '';

  // Header
  if (worksheet.schoolName) {
    html += `<p style="${headerStyle}font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:2px;">${escHtml(worksheet.schoolName)}</p>`;
  }
  if (worksheet.className) {
    html += `<p style="${headerStyle}font-size:12px;color:#94a3b8;">${escHtml(worksheet.className)}</p>`;
  }

  html += `<h1 style="${titleStyle}">PHIẾU HỌC TẬP</h1>`;
  html += `<h2 style="${subTitleStyle}">${escHtml(worksheet.title)}</h2>`;
  html += `<p style="${infoStyle}">Môn: ${escHtml(worksheet.subjectName)} &nbsp;|&nbsp; Cấp: ${escHtml(GRADE_LEVEL_LABELS[worksheet.gradeLevel])} &nbsp;|&nbsp; ${worksheet.questions.length} câu</p>`;
  html += `<hr style="${dividerStyle}" />`;

  // Questions
  worksheet.questions.forEach((q, i) => {
    const typeLabel = QUESTION_TYPE_LABELS[q.type] || q.type;
    const diffLabel = DIFFICULTY_LABELS[q.difficulty] || q.difficulty;
    const cleanContent = stripLatex(q.content);

    html += `<div style="${qBlockStyle}">`;
    html += `<div style="${qLabelStyle}">[${escHtml(typeLabel)}] [${escHtml(diffLabel)}]</div>`;
    html += `<div style="${qContentStyle}">Câu ${i + 1}: ${escHtml(cleanContent)}</div>`;

    // Options (multiple_choice, counting, circle_odd, pattern_sequence, true_false)
    if (['multiple_choice', 'counting', 'circle_odd', 'pattern_sequence'].includes(q.type) && q.options) {
      q.options.forEach((opt, j) => {
        const label = String.fromCharCode(65 + j);
        html += `<div style="${optionStyle}">${label}. ${escHtml(stripLatex(opt))}</div>`;
      });
    }

    if (q.type === 'true_false' && q.options) {
      html += `<div style="${optionStyle}">${q.options.map(o => escHtml(o)).join(' / ')}</div>`;
    }

    // Matching pairs (matching, shadow_match, card_match)
    if (['matching', 'shadow_match', 'card_match'].includes(q.type) && q.matchingPairs) {
      html += '<div style="padding-left:12px;margin-top:4px;">';
      html += '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
      q.matchingPairs.forEach((pair, j) => {
        html += `<tr>
          <td style="padding:4px 8px;border:1px solid #e2e8f0;width:45%;">${j + 1}. ${escHtml(stripLatex(pair.left))}</td>
          <td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center;width:10%;">→</td>
          <td style="padding:4px 8px;border:1px solid #e2e8f0;width:45%;">${String.fromCharCode(97 + j)}. ${escHtml(stripLatex(pair.right))}</td>
        </tr>`;
      });
      html += '</table></div>';
    }

    // Fill blank hint
    if (q.type === 'fill_blank') {
      html += `<div style="${hintStyle}">[Chỗ trống để học sinh điền vào]</div>`;
    }

    // Preschool activity hints
    if (q.type === 'coloring') {
      html += `<div style="${hintStyle}">🎨 [Bé hãy dùng bút sáp màu tô thật đẹp theo yêu cầu]</div>`;
    }
    if (q.type === 'dot_to_dot') {
      html += `<div style="${hintStyle}">✏️ [Bé hãy nối các điểm theo thứ tự số 1 → 2 → 3...]</div>`;
    }
    if (q.type === 'maze') {
      html += `<div style="${hintStyle}">🌀 [Bé hãy vẽ đường đi vượt qua mê cung]</div>`;
    }
    if (q.type === 'tracing') {
      html += `<div style="${hintStyle}">✍️ [Bé hãy cầm bút đồ theo đúng các nét đứt]</div>`;
    }

    html += '</div>';
  });

  // Answer key
  if (includeAnswers && worksheet.answerKey?.length) {
    html += buildAnswerKeyHtml(worksheet);
  }

  return html;
}

function buildAnswerKeyHtml(worksheet: Worksheet): string {
  const answerTitleStyle = 'font-size:17px;font-weight:700;color:#059669;margin:20px 0 12px;padding-top:16px;border-top:2px solid #d1fae5;';
  const answerRowStyle = 'margin-bottom:8px;padding:8px 12px;background:#ecfdf5;border-radius:8px;';
  const answerTextStyle = 'font-size:13px;font-weight:600;color:#065f46;';
  const explanationStyle = 'font-size:11px;color:#6ee7b7;margin-top:2px;';

  let html = `<div style="${answerTitleStyle}">📝 BẢNG ĐÁP ÁN</div>`;

  worksheet.answerKey.forEach(ak => {
    html += `<div style="${answerRowStyle}">`;
    html += `<div style="${answerTextStyle}">Câu ${ak.questionIndex}: ${escHtml(stripLatex(ak.answer))}</div>`;
    if (ak.explanation) {
      html += `<div style="${explanationStyle}">→ ${escHtml(stripLatex(ak.explanation))}</div>`;
    }
    html += '</div>';
  });

  return html;
}

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
      startup?: { promise: Promise<void> };
    };
  }
}
