import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import type { Worksheet } from '../types';
import { QUESTION_TYPE_LABELS, GRADE_LEVEL_LABELS, DIFFICULTY_LABELS } from '../types';

export async function exportWorksheetToWord(
  worksheet: Worksheet,
  includeAnswers: boolean
): Promise<void> {
  const children: (Paragraph | Table)[] = [];

  // School name
  if (worksheet.schoolName) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: worksheet.schoolName, size: 20, color: '666666' })],
        spacing: { after: 100 },
      })
    );
  }

  // Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'PHIẾU HỌC TẬP', bold: true, size: 32, color: '0d9488' })],
      spacing: { after: 100 },
    })
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: worksheet.title, bold: true, size: 24 })],
      spacing: { after: 100 },
    })
  );

  // Info
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `Môn: ${worksheet.subjectName}`, size: 18, color: '888888' }),
        new TextRun({ text: `  |  Cấp: ${GRADE_LEVEL_LABELS[worksheet.gradeLevel]}`, size: 18, color: '888888' }),
        new TextRun({ text: `  |  ${worksheet.questions.length} câu`, size: 18, color: '888888' }),
      ],
      spacing: { after: 300 },
    })
  );

  // Divider
  children.push(
    new Paragraph({
      border: { bottom: { color: 'cccccc', space: 1, style: BorderStyle.SINGLE, size: 1 } },
      spacing: { after: 300 },
    })
  );

  // Questions
  worksheet.questions.forEach((q, i) => {
    const typeLabel = QUESTION_TYPE_LABELS[q.type];
    const diffLabel = DIFFICULTY_LABELS[q.difficulty];

    // Type/diff badge
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `[${typeLabel}] [${diffLabel}]`, size: 16, color: '999999', italics: true })],
        spacing: { before: 200 },
      })
    );

    // Question content (keep LaTeX as-is for Word)
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Câu ${i + 1}: `, bold: true, size: 22 }),
          new TextRun({ text: q.content, size: 22 }),
        ],
        spacing: { after: 100 },
      })
    );

    // Options
    if (q.type === 'multiple_choice' && q.options) {
      q.options.forEach((opt, j) => {
        const label = String.fromCharCode(65 + j);
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `    ${label}. ${opt}`, size: 20 })],
            spacing: { after: 40 },
          })
        );
      });
    }

    // True/False
    if (q.type === 'true_false' && q.options) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `    ${q.options.join(' / ')}`, size: 20 })],
          spacing: { after: 40 },
        })
      );
    }

    // Fill blank
    if (q.type === 'fill_blank') {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '    [Chỗ trống để học sinh điền vào]', size: 20, color: '999999', italics: true })],
          spacing: { after: 40 },
        })
      );
    }

    // Matching pairs as table
    if (q.type === 'matching' && q.matchingPairs) {
      const tableRows = [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: 'Cột A', bold: true, size: 20 })] })],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: 'Cột B', bold: true, size: 20 })] })],
            }),
          ],
        }),
        ...q.matchingPairs.map((pair, j) =>
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: `${j + 1}. ${pair.left}`, size: 20 })] })],
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: `${String.fromCharCode(97 + j)}. ${pair.right}`, size: 20 })] })],
              }),
            ],
          })
        ),
      ];

      children.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
    }
  });

  // Answer key
  if (includeAnswers) {
    children.push(
      new Paragraph({
        border: { bottom: { color: 'cccccc', space: 1, style: BorderStyle.SINGLE, size: 1 } },
        spacing: { before: 400, after: 200 },
      })
    );

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: 'BẢNG ĐÁP ÁN', bold: true, size: 26, color: '059669' })],
        spacing: { after: 200 },
      })
    );

    worksheet.answerKey.forEach(ak => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Câu ${ak.questionIndex}: `, bold: true, size: 20 }),
            new TextRun({ text: ak.answer, size: 20 }),
          ],
          spacing: { after: 40 },
        })
      );
      if (ak.explanation) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `    Giải thích: ${ak.explanation}`, size: 18, color: '666666', italics: true })],
            spacing: { after: 80 },
          })
        );
      }
    });
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `${worksheet.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF ]/g, '_')}.docx`;
  saveAs(blob, fileName);
}
