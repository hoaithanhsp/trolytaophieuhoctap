import { GEMINI_MODELS, QUESTION_TYPES_DATA } from '../types';
import type { WorksheetGenerationRequest, Question, QuestionType, ContentMode } from '../types';
import { getSettings } from './storage';

const MODEL_IDS = GEMINI_MODELS.map(m => m.id);

async function callGemini(prompt: string, modelIndex = 0, forceJson = false): Promise<string | null> {
  const settings = getSettings();
  const apiKey = settings.geminiApiKey;

  if (!apiKey) {
    throw new Error('Vui lòng nhập API Key trong phần Cài đặt!');
  }

  const modelId = modelIndex === 0
    ? settings.selectedModel
    : MODEL_IDS[Math.min(modelIndex, MODEL_IDS.length - 1)];

  const generationConfig: Record<string, unknown> = { temperature: 0.7, maxOutputTokens: 8192 };
  if (forceJson) {
    generationConfig.responseMimeType = 'application/json';
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig,
        }),
      }
    );

    if (response.status === 429 && modelIndex < MODEL_IDS.length - 1) {
      return callGemini(prompt, modelIndex + 1, forceJson);
    }

    if (response.status === 400 || response.status === 403) {
      throw new Error('API Key không hợp lệ. Vui lòng kiểm tra lại!');
    }

    if (!response.ok) {
      throw new Error(`Lỗi API: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    if (modelIndex < MODEL_IDS.length - 1 && error instanceof TypeError) {
      return callGemini(prompt, modelIndex + 1, forceJson);
    }
    throw error;
  }
}

function getContentModeInstruction(mode: ContentMode): string {
  switch (mode) {
    case 'exact':
      return 'Tạo câu hỏi BÁM SÁT nội dung gốc, giữ nguyên số liệu, ngữ cảnh và chi tiết như trong tài liệu.';
    case 'change_context':
      return 'Giữ nguyên DẠNG BÀI và CẤU TRÚC, nhưng THAY ĐỔI NGỮ CẢNH, tình huống, đối tượng sang chủ đề tương tự khác.';
    case 'change_numbers':
      return 'Giữ nguyên NGỮ CẢNH và CẤU TRÚC câu hỏi, nhưng THAY ĐỔI SỐ LIỆU, con số, dữ kiện.';
    case 'change_both':
      return 'THAY ĐỔI CẢ NGỮ CẢNH LẪN SỐ LIỆU để tạo bài tập hoàn toàn mới nhưng cùng dạng và độ khó tương đương.';
  }
}

function getTypePromptDescription(type: QuestionType): string {
  const descriptions: Record<QuestionType, string> = {
    multiple_choice: 'trắc nghiệm (4 lựa chọn A, B, C, D, chỉ 1 đáp án đúng)',
    fill_blank: 'điền khuyết (dùng "___" cho chỗ trống)',
    matching: 'nối cột (tạo cặp nối cột A và cột B)',
    true_false: 'đúng/sai (nhận định kèm options ["Đúng", "Sai"])',
    short_answer: 'tự luận ngắn (câu trả lời ngắn gọn)',
    find_error: 'tìm lỗi sai (đưa nội dung có lỗi, yêu cầu phát hiện và sửa)',
    situation: 'tình huống – giải quyết vấn đề (đưa tình huống thực tế, yêu cầu đề xuất phương án)',
    mind_map: 'sơ đồ tư duy (yêu cầu hoàn thành hoặc thiết kế sơ đồ logic)',
    role_play: 'nhập vai (đóng vai nhân vật/chuyên gia viết bài/nhật ký/phỏng vấn)',
    chart_analysis: 'phân tích bảng/biểu đồ (đưa số liệu, yêu cầu nhận xét và phân tích)',
    compare: 'so sánh – đối chiếu (chỉ ra điểm giống/khác giữa hai nội dung)',
    extended_writing: 'viết mở rộng (viết đoạn nghị luận hoặc cảm nhận)',
    mini_project: 'dự án nhỏ (đề bài dự án 1-3 ngày, có sản phẩm cụ thể)',
    card_match: 'ghép thẻ kiến thức (sắp xếp logic các thẻ thông tin)',
    self_assess: 'tự đánh giá (câu hỏi tự chấm mức độ hiểu bài)',
  };
  return descriptions[type] || type;
}

function buildWorksheetPrompt(request: WorksheetGenerationRequest): string {
  const types = request.questionTypes.map(t => getTypePromptDescription(t)).join(', ');
  const diffLabel = { easy: 'dễ', medium: 'trung bình', hard: 'khó' }[request.difficulty];
  const contentModeInstruction = getContentModeInstruction(request.contentMode);

  return `Bạn là chuyên gia giáo dục Việt Nam. Hãy tạo ${request.questionCount} câu hỏi bài tập dạng: ${types}.

Nội dung/chủ đề: ${request.rawContent}

CHẾ ĐỘ TẠO BÀI: ${contentModeInstruction}

Yêu cầu:
- Độ khó: ${diffLabel}
- Ngôn ngữ: ${request.language === 'en' ? 'English' : request.language === 'fr' ? 'Français' : 'Tiếng Việt (có dấu đầy đủ)'}
- Mỗi câu hỏi phải rõ ràng, chính xác
- Với trắc nghiệm: 4 lựa chọn, chỉ 1 đáp án đúng
- Với điền khuyết: dùng dấu "___" cho chỗ trống
- Với nối cột/ghép thẻ: tạo cặp nối tương ứng trong matchingPairs
- Với tìm lỗi sai: nội dung câu hỏi chứa lỗi, correctAnswer là bản sửa đúng
- Với tình huống: đưa tình huống thực tế, correctAnswer là phương án giải quyết
- Với sơ đồ tư duy: mô tả cấu trúc sơ đồ cần hoàn thành
- Với nhập vai: mô tả vai trò và yêu cầu viết
- Với phân tích bảng/biểu đồ: đưa số liệu trong content, yêu cầu nhận xét
- Với so sánh: chỉ rõ 2 đối tượng cần so sánh
- Với viết mở rộng: đưa đề bài rõ ràng
- Với dự án nhỏ: mô tả yêu cầu dự án, thời gian, sản phẩm
- Với tự đánh giá: câu hỏi rubric tự chấm
- Thêm giải thích ngắn cho mỗi đáp án
- QUAN TRỌNG: Nếu có công thức toán học, hãy viết dạng LaTeX ($...$ inline, $$...$$ block)

Trả về JSON THUẦN (không markdown, không code block) với format:
[
  {
    "content": "nội dung câu hỏi",
    "type": "${request.questionTypes[0]}",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "đáp án đúng",
    "explanation": "giải thích",
    "difficulty": "${request.difficulty}",
    "matchingPairs": [{"left": "...", "right": "..."}]
  }
]

Lưu ý: Chỉ trả về mảng JSON. Trường matchingPairs chỉ cần với loại matching/card_match. Trường options chỉ cần với loại multiple_choice và true_false.`;
}

function extractJsonArray(text: string): unknown[] | null {
  // Try direct parse first
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* continue */ }

  // Remove markdown code blocks
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json|JSON)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* continue */ }
  }

  // Try to find JSON array in text using bracket matching
  const startIdx = cleaned.indexOf('[');
  if (startIdx !== -1) {
    let depth = 0;
    for (let i = startIdx; i < cleaned.length; i++) {
      if (cleaned[i] === '[') depth++;
      else if (cleaned[i] === ']') depth--;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(cleaned.substring(startIdx, i + 1));
          if (Array.isArray(parsed)) return parsed;
        } catch { /* continue */ }
        break;
      }
    }
  }

  return null;
}

export async function generateWorksheetQuestions(
  request: WorksheetGenerationRequest
): Promise<Question[]> {
  const prompt = buildWorksheetPrompt(request);
  const result = await callGemini(prompt, 0, true);

  if (!result) throw new Error('Không nhận được kết quả từ AI');

  const parsed = extractJsonArray(result);
  if (!parsed || parsed.length === 0) {
    console.error('AI response cannot be parsed:', result.substring(0, 500));
    throw new Error('Không thể phân tích kết quả AI. Vui lòng thử lại!');
  }

  return (parsed as Record<string, unknown>[]).map((q, i) => ({
    id: `q_${Date.now()}_${i}`,
    content: String(q.content || ''),
    type: (q.type as QuestionType) || request.questionTypes[0],
    options: Array.isArray(q.options) ? (q.options as unknown[]).map(String) : undefined,
    correctAnswer: String(q.correctAnswer || ''),
    explanation: q.explanation ? String(q.explanation) : undefined,
    difficulty: (q.difficulty as Question['difficulty']) || request.difficulty,
    matchingPairs: Array.isArray(q.matchingPairs) ? q.matchingPairs as { left: string; right: string }[] : undefined,
  }));
}

export async function analyzeContentForTypes(
  rawContent: string,
  subjectId: string
): Promise<QuestionType[]> {
  const allTypes = QUESTION_TYPES_DATA.map(t => `- ${t.id}: ${t.label} – ${t.description}`).join('\n');

  const prompt = `Bạn là chuyên gia giáo dục Việt Nam. Hãy phân tích nội dung/tài liệu sau và đề xuất các dạng phiếu học tập PHÙ HỢP NHẤT.

Môn học: ${subjectId}
Nội dung: ${rawContent.slice(0, 2000)}

Danh sách 15 dạng phiếu:
${allTypes}

Hãy chọn 3-5 dạng phù hợp nhất với nội dung và môn học trên. Trả về JSON THUẦN (không markdown) là mảng các id dạng bài:
["multiple_choice", "fill_blank", ...]

Chỉ trả về mảng JSON, không thêm text nào khác.`;

  const result = await callGemini(prompt);
  if (!result) return ['multiple_choice'];

  try {
    let cleaned = result.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter((t: string) =>
        QUESTION_TYPES_DATA.some(qt => qt.id === t)
      ) as QuestionType[];
    }
  } catch { /* ignore */ }

  return ['multiple_choice'];
}

export async function chatWithAI(message: string): Promise<string> {
  const prompt = `Bạn là trợ lý giáo dục Việt Nam. Hãy trả lời câu hỏi sau bằng tiếng Việt (có dấu đầy đủ), rõ ràng và hữu ích. Nếu có công thức toán, hãy viết dạng LaTeX ($...$ cho inline, $$...$$ cho block):\n\n${message}`;
  const result = await callGemini(prompt);
  if (!result) throw new Error('Không nhận được phản hồi từ AI');
  return result;
}

export async function analyzeImage(base64Data: string, mimeType: string): Promise<string> {
  const settings = getSettings();
  const apiKey = settings.geminiApiKey;
  if (!apiKey) throw new Error('Vui lòng nhập API Key trong phần Cài đặt!');

  const modelId = settings.selectedModel || 'gemini-2.0-flash';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: 'Hãy nhận dạng và trích xuất TOÀN BỘ nội dung văn bản từ ảnh tài liệu/sách giáo khoa này. Giữ nguyên cấu trúc, tiêu đề, đoạn văn, công thức toán (dùng LaTeX). Trả về văn bản thuần, không cần mô tả hình ảnh.',
            },
          ],
        }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
      }),
    }
  );

  if (!response.ok) {
    if (response.status === 429) throw new Error('API quá tải, vui lòng thử lại sau ít giây.');
    if (response.status === 400 || response.status === 403) throw new Error('API Key không hợp lệ hoặc model không hỗ trợ Vision.');
    throw new Error(`Lỗi API: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Không nhận dạng được nội dung từ ảnh.');
  return text;
}
