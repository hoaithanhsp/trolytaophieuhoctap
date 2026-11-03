import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Worksheet } from '../types';
import { QUESTION_TYPE_LABELS, GRADE_LEVEL_LABELS, DIFFICULTY_LABELS } from '../types';
import { getAnswerKeyText, getAnswerMode, getDisplayOptions, getMatchingLabel, getMatchingRightOrder, getOptionLabel } from './answerKey';

export async function exportWorksheetToPdf(
  worksheet: Worksheet,
  includeAnswers: boolean,
  _printElement?: HTMLElement | null
): Promise<void> {
  // Always build our own HTML container with MathJax for reliable rendering
  await renderFromBuiltHtml(worksheet, includeAnswers);
}

async function renderFromBuiltHtml(
  worksheet: Worksheet,
  includeAnswers: boolean,
): Promise<void> {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:white;padding:40px;font-family:"Be Vietnam Pro","Segoe UI",Roboto,Arial,sans-serif;color:#1e293b;line-height:1.7;';

  // Build HTML keeping LaTeX delimiters intact for MathJax to process
  container.innerHTML = buildWorksheetHtml(worksheet, includeAnswers);

  document.body.appendChild(container);

  // Wait for MathJax to typeset the new container
  try {
    if (window.MathJax?.typesetPromise) {
      await window.MathJax.typesetPromise([container]);
    } else if (window.MathJax?.startup?.promise) {
      await window.MathJax.startup.promise;
      if (window.MathJax?.typesetPromise) {
        await window.MathJax.typesetPromise([container]);
      }
    }
  } catch {
    // MathJax may not be available, continue anyway
  }

  // Extra wait for MathJax SVG rendering to settle
  await new Promise(r => setTimeout(r, 500));

  try {
    await captureAndSavePdf(container, worksheet);
  } finally {
    // Clean up MathJax internal state for cloned elements
    try {
      if (window.MathJax && 'typesetClear' in window.MathJax) {
        (window.MathJax as Record<string, unknown> & { typesetClear: (els: HTMLElement[]) => void }).typesetClear([container]);
      }
    } catch { /* ignore */ }
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
  const margin = 8;

  const usableWidth = pageWidth - 2 * margin;
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = usableWidth / imgWidth;
  const scaledHeight = imgHeight * ratio;

  if (scaledHeight <= pageHeight - 2 * margin) {
    pdf.addImage(imgData, 'PNG', margin, margin, usableWidth, scaledHeight);
  } else {
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
  // Preserve LaTeX delimiters ($...$, $$...$$) — only escape HTML tags
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

  // Questions — keep LaTeX intact, MathJax will render them
  worksheet.questions.forEach((q, i) => {
    const typeLabel = QUESTION_TYPE_LABELS[q.type] || q.type;
    const diffLabel = DIFFICULTY_LABELS[q.difficulty] || q.difficulty;

    html += `<div style="${qBlockStyle}">`;
    html += `<div style="${qLabelStyle}">[${escHtml(typeLabel)}] [${escHtml(diffLabel)}]</div>`;
    html += `<div style="${qContentStyle}">Câu ${i + 1}: ${escHtml(q.content)}</div>`;

    if (getAnswerMode(q) === 'options') {
      getDisplayOptions(q).forEach((opt, j) => {
        const label = getOptionLabel(j);
        html += `<div style="${optionStyle}">${label}. ${escHtml(opt)}</div>`;
      });
    }

    if (q.type === 'true_false') {
      html += `<div style="${optionStyle}">${getDisplayOptions(q).map(o => escHtml(o)).join(' / ')}</div>`;
    }

    if (getAnswerMode(q) === 'matching' && q.matchingPairs) {
      const pairs = q.matchingPairs;
      const rightOrder = getMatchingRightOrder(q);
      html += '<div style="padding-left:12px;margin-top:4px;">';
      html += '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
      pairs.forEach((pair, j) => {
        html += `<tr>
          <td style="padding:4px 8px;border:1px solid #e2e8f0;width:45%;">${j + 1}. ${escHtml(pair.left)}</td>
          <td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center;width:10%;">......</td>
          <td style="padding:4px 8px;border:1px solid #e2e8f0;width:45%;">${getMatchingLabel(j)}. ${escHtml(pairs[rightOrder[j]].right)}</td>
        </tr>`;
      });
      html += '</table></div>';
    }

    if (q.type === 'fill_blank') {
      html += `<div style="${hintStyle}">[Chỗ trống để học sinh điền vào]</div>`;
    }
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
    html += `<div style="${answerTextStyle}">Câu ${ak.questionIndex}: ${escHtml(getAnswerKeyText(worksheet, ak))}</div>`;
    if (ak.explanation) {
      html += `<div style="${explanationStyle}">→ ${escHtml(ak.explanation)}</div>`;
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
