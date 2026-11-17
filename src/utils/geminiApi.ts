import { GoogleGenAI } from '@google/genai';
import { QUESTION_TYPES_DATA, QUESTION_TYPE_LABELS, DIFFICULTY_LABELS } from '../types';
import type { AiProvider, WorksheetGenerationRequest, Question, QuestionType, ContentMode } from '../types';
import { getSettings, getActiveApiKey, getProvider } from './storage';
import { normalizeQuestionAnswer } from './answerKey';

export const GOOGLE_AI_API_KEY_PATTERN = /^(?:AIzaSy|AQ)\S{8,}$/;

export function isValidGoogleAiApiKey(apiKey: string): boolean {
  return GOOGLE_AI_API_KEY_PATTERN.test(apiKey.trim());
}

export type GoogleAiApiErrorType =
  | 'INVALID_API_KEY'
  | 'PERMISSION_DENIED'
  | 'QUOTA_EXCEEDED'
  | 'MODEL_OVERLOADED'
  | 'MODEL_UNAVAILABLE'
  | 'INVALID_ARGUMENT'
  | 'UNKNOWN';

export class GoogleAiApiError extends Error {
  constructor(
    message: string,
    readonly type: GoogleAiApiErrorType,
    readonly status?: number,
    readonly model?: string
  ) {
    super(message);
    this.name = 'GoogleAiApiError';
  }
}

export const createGoogleAiClient = (apiKey: string, provider: AiProvider): GoogleGenAI => {
  const trimmedKey = apiKey.trim();
  if (provider === 'agent-platform') {
    return new GoogleGenAI({ vertexai: true, apiKey: trimmedKey });
  }
  return new GoogleGenAI({ apiKey: trimmedKey });
};

const GEMINI_FALLBACK_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];
const AGENT_PLATFORM_FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const GEMINI_3_MODELS = new Set(['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);

export function getFallbackModels(provider: AiProvider, selectedModel?: string): string[] {
  const trimmed = selectedModel?.trim();
  const baseList = provider === 'agent-platform' ? AGENT_PLATFORM_FALLBACK_MODELS : GEMINI_FALLBACK_MODELS;
  const candidates = trimmed ? [trimmed, ...baseList] : baseList;
  return Array.from(new Set(candidates.filter(Boolean)));
}

export function parseApiError(status?: number, responseBody = '', error?: unknown): GoogleAiApiErrorType {
  const errorMessage = error instanceof Error ? error.message : String(error ?? '');
  const serialized = `${status ?? ''} ${responseBody} ${errorMessage}`.toLowerCase();

  if (
    status === 401 ||
    serialized.includes('api_key_invalid') ||
    serialized.includes('api key not valid') ||
    serialized.includes('invalid api key')
  ) {
    return 'INVALID_API_KEY';
  }

  if (
    status === 403 ||
    serialized.includes('permission_denied') ||
    serialized.includes('permission denied')
  ) {
    return 'PERMISSION_DENIED';
  }

  if (status === 429 || serialized.includes('resource_exhausted') || serialized.includes('quota')) {
    return 'QUOTA_EXCEEDED';
  }

  if (
    status === 503 ||
    status === 500 ||
    status === 504 ||
    serialized.includes('unavailable') ||
    serialized.includes('high demand') ||
    serialized.includes('overloaded') ||
    serialized.includes('try again later') ||
    serialized.includes('temporarily unavailable')
  ) {
    return 'MODEL_OVERLOADED';
  }

  if (status === 400 || serialized.includes('invalid argument') || serialized.includes('invalid_argument')) {
    return 'INVALID_ARGUMENT';
  }

  if (
    status === 404 ||
    serialized.includes('not found') ||
    serialized.includes('not supported') ||
    serialized.includes('deprecated')
  ) {
    return 'MODEL_UNAVAILABLE';
  }

  return 'UNKNOWN';
}

export function getFriendlyErrorMessage(type: GoogleAiApiErrorType, provider: AiProvider = 'gemini', status?: number): string {
  switch (type) {
    case 'INVALID_API_KEY':
      return 'API Key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại trong Cài đặt.';
    case 'PERMISSION_DENIED':
      return provider === 'agent-platform'
        ? 'Google đã nhận key nhưng dự án/key chưa được cấp quyền gọi Agent Platform API hoặc model này. Vui lòng kiểm tra Agent Platform API đã bật, billing và quyền sử dụng model.'
        : 'API key không có quyền truy cập Gemini API.';
    case 'QUOTA_EXCEEDED':
      return 'Đã hết quota hoặc vượt giới hạn tốc độ API. Vui lòng đợi rồi thử lại.';
    case 'MODEL_OVERLOADED':
      return 'Model đang quá tải; app đang tự động thử model dự phòng.';
    case 'MODEL_UNAVAILABLE':
      return 'Model AI đang chọn không khả dụng. Vui lòng kiểm tra cấu hình trong phần Cài đặt.';
    case 'INVALID_ARGUMENT':
      return 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại dữ liệu đầu vào.';
    default:
      return `Lỗi kết nối API${status ? `: ${status}` : ''}. Vui lòng thử lại.`;
  }
}

export async function testGoogleAiConnection(apiKey: string, provider: AiProvider, model?: string): Promise<boolean> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    throw new Error('Vui lòng cấu hình API Key trước khi sử dụng tính năng này.');
  }
  if (!isValidGoogleAiApiKey(trimmed)) {
    throw new Error('API Key cần bắt đầu bằng AIzaSy hoặc AQ.');
  }

  const testModel = model || (provider === 'agent-platform' ? 'gemini-2.5-flash' : 'gemini-3.6-flash');
  try {
    const ai = createGoogleAiClient(trimmed, provider);
    const res = await ai.models.generateContent({
      model: testModel,
      contents: 'Xin chào',
    });
    return Boolean(res && res.text);
  } catch (error: unknown) {
    const errObj = error as { status?: number; statusCode?: number; message?: string } | undefined;
    const status = errObj?.status || errObj?.statusCode;
    const responseBody = errObj?.message || String(error || '');
    const errorType = parseApiError(status, responseBody, error);
    throw new Error(getFriendlyErrorMessage(errorType, provider, status));
  }
}

export async function callGoogleAiWithFallback({
  apiKey,
  provider,
  selectedModel,
  contents,
  forceJson = false,
}: {
  apiKey: string;
  provider: AiProvider;
  selectedModel?: string;
  contents: unknown;
  forceJson?: boolean;
}): Promise<string> {
  const models = getFallbackModels(provider, selectedModel);
  let lastError: Error | null = null;

  for (const [index, model] of models.entries()) {
    try {
      const ai = createGoogleAiClient(apiKey, provider);
      const config: Record<string, unknown> = {};
      if (forceJson) {
        config.responseMimeType = 'application/json';
      }
      if (GEMINI_3_MODELS.has(model)) {
        config.thinkingConfig = { thinkingLevel: 'low' };
      } else {
        config.temperature = 0.2;
        config.topP = 0.95;
        config.topK = 40;
      }

      const response = await ai.models.generateContent({
        model,
        contents: contents as Parameters<typeof ai.models.generateContent>[0]['contents'],
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      const responseText = response.text;
      if (responseText) {
        return responseText;
      }
      throw new GoogleAiApiError('Không nhận được phản hồi văn bản từ AI.', 'UNKNOWN', undefined, model);
    } catch (error: unknown) {
      const errObj = error as { status?: number; statusCode?: number; message?: string } | undefined;
      const status = errObj?.status || errObj?.statusCode;
      const responseBody = errObj?.message || String(error || '');
      const errorType = parseApiError(status, responseBody, error);

      // Stop immediately on non-retryable errors
      if (errorType === 'INVALID_API_KEY' || errorType === 'QUOTA_EXCEEDED' || errorType === 'INVALID_ARGUMENT') {
        throw new Error(getFriendlyErrorMessage(errorType, provider, status));
      }
      if (provider === 'gemini' && errorType === 'PERMISSION_DENIED') {
        throw new Error(getFriendlyErrorMessage('PERMISSION_DENIED', 'gemini', status));
      }
      if (errorType !== 'MODEL_OVERLOADED' && errorType !== 'MODEL_UNAVAILABLE' && status !== 502 && status !== 503 && status !== 504) {
        throw new Error(getFriendlyErrorMessage(errorType, provider, status));
      }

      lastError = error instanceof Error ? error : new Error(getFriendlyErrorMessage(errorType, provider, status));

      const nextModel = models[index + 1];
      if (nextModel) {
        console.warn(`[${provider}] Model ${model} thất bại (${errorType}); tự động thử model dự phòng ${nextModel}.`);
      }
    }
  }

  throw lastError || new Error('Không thể kết nối với dịch vụ AI. Vui lòng thử lại sau.');
}

async function callGoogleAi(prompt: string, forceJson = false): Promise<string> {
  const settings = getSettings();
  const provider = getProvider(settings);
  const apiKey = getActiveApiKey(settings).trim();

  if (!apiKey) {
    throw new Error('Vui lòng cấu hình API Key trước khi sử dụng tính năng này.');
  }

  if (!isValidGoogleAiApiKey(apiKey)) {
    throw new Error('API Key cần bắt đầu bằng AIzaSy hoặc AQ.');
  }

  return callGoogleAiWithFallback({
    apiKey,
    provider,
    selectedModel: settings.selectedModel,
    contents: prompt,
    forceJson,
  });
}

export async function testGeminiApiConnection(apiKey: string, selectedModel?: string): Promise<boolean> {
  const settings = getSettings();
  const provider = getProvider(settings);
  return testGoogleAiConnection(apiKey, provider, selectedModel);
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
    // Phổ thông & nâng cao
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
    // Mầm non
    coloring: 'tô màu theo yêu cầu (hướng dẫn bé tô màu đồ vật/con vật/hình khối theo số lượng, màu sắc hoặc chỉ dẫn cụ thể)',
    circle_odd: 'khoanh đối tượng khác biệt (đưa 4 đối tượng/hình ảnh kèm emoji trong options, yêu cầu tìm và khoanh hình khác loại)',
    shadow_match: 'nối bóng / nối hình tương ứng (tạo cặp nối tương ứng giữa hình ảnh và bóng hoặc mẹ-con, cây-quả trong matchingPairs)',
    counting: 'tập đếm & chọn số lượng (content chứa chuỗi emoji con vật/đồ vật từ 1-10 để bé đếm, options là các con số lựa chọn)',
    dot_to_dot: 'nối điểm theo số/chữ (hướng dẫn bé nối theo thứ tự từ 1-5 hoặc 1-10 để tạo thành hình vẽ hoàn chỉnh)',
    maze: 'mê cung / tìm đường đi (đưa đề bài dẫn đường sinh động giúp bạn nhỏ hoặc con vật vượt mê cung)',
    pattern_sequence: 'quy luật hình vẽ (content là chuỗi emoji hình vẽ theo quy luật ví dụ "🔴 🔵 🔴 🔵 ___ ?", options là các hình/màu lựa chọn)',
    tracing: 'tập đồ nét / nối nét đứt (hướng dẫn bé tập tô các nét cơ bản nét thẳng, cong, lượn sóng hoặc chữ/số nét đứt)',
  };
  return descriptions[type] || type;
}

function buildWorksheetPrompt(request: WorksheetGenerationRequest): string {
  const types = request.questionTypes.map(t => getTypePromptDescription(t)).join(', ');
  const diffLabel = { easy: 'dễ', medium: 'trung bình', hard: 'khó' }[request.difficulty];
  const contentModeInstruction = getContentModeInstruction(request.contentMode);

  const preschoolDirective = request.gradeLevel === 'preschool' ? `
ĐẶC BIỆT DÀNH CHO CẤP HỌC MẦM NON (LỨA TUỔI 3 - 6 TUỔI):
- Sử dụng ngôn ngữ cực kỳ đơn giản, ngắn gọn, hồn nhiên, dễ thương, sinh động, dễ hiểu cho trẻ nhỏ.
- Sử dụng nhiều Emoji minh họa trực quan phong phú (con vật: 🐶 🐱 🐰 🐻 🐼 🐸 🦁 🐘, hoa quả: 🍎 🍌 🍓 🍇 🍉 🍊, đồ vật: 🚗 ✈️ 🚀 🎈 ⚽ 🎨, hình khối: ⭐ 🔴 🔷 🟩...).
- Với dạng "counting" (Tập đếm): content phải chứa các emoji xếp liền nhau (ví dụ: "Bé hãy đếm xem có bao nhiêu chú thỏ: 🐰🐰🐰🐰"), options là 4 số lựa chọn (ví dụ: ["2", "3", "4", "5"]), correctAnswer là số đúng ("4").
- Với dạng "circle_odd" (Khoanh khác biệt): content là câu hỏi (ví dụ: "Bé hãy tìm xem bạn nào KHÔNG PHẢI là con vật sống dưới nước?"), options là 4 lựa chọn kèm emoji (ví dụ: ["🐟 Cá vàng", "🐙 Bạch tuộc", "🦀 Cua biển", "🐱 Mèo con"]), correctAnswer là con khác loại ("🐱 Mèo con").
- Với dạng "pattern_sequence" (Quy luật hình): content là chuỗi emoji có quy luật (ví dụ: "Bé hãy chọn hình tiếp theo cho dãy: 🍎 🍌 🍎 🍌 ___ ?"), options là 4 hình lựa chọn (ví dụ: ["🍎 Quả táo", "🍌 Quả chuối", "🍇 Quả nho", "🍉 Quả dưa hấu"]), correctAnswer là hình đúng ("🍎 Quả táo").
- Với dạng "shadow_match" (Nối bóng/hình tương ứng): matchingPairs chứa các cặp nối sinh động (ví dụ: left: "🐶 Chó con", right: "Bóng chú chó" hoặc left: "🐔 Gà mẹ", right: "🐥 Gà con" hoặc left: "🍎 Quả táo", right: "🌳 Cây táo").
- Với dạng "coloring" (Tô màu): content nêu rõ hướng dẫn màu sắc (ví dụ: "Bé hãy tô màu ĐỎ cho quả cà chua 🍅, màu VÀNG cho quả chuối 🍌 và màu XANH LÁ cho chiếc lá 🍃 nhé!").
- Với dạng "dot_to_dot" (Nối điểm): content hướng dẫn (ví dụ: "Bé hãy dùng bút chì nối các số từ 1 → 2 → 3 → 4 → 5 để hoàn thành ngôi sao ⭐ xinh xắn nhé!").
- Với dạng "maze" (Mê cung): content nêu tình huống tìm đường (ví dụ: "Bé hãy giúp bạn Thỏ Trắng 🐰 tìm đường vượt qua mê cung để đến vườn Cà rốt 🥕 thơm ngon nhé!").
- Với dạng "tracing" (Tập đồ nét): content hướng dẫn bé đồ nét (ví dụ: "Bé hãy dùng bút màu đồ theo các đường lượn sóng ~~~~~~ để giúp đàn cá 🐟 bơi ra biển lớn nhé!").
` : '';

  return `Bạn là chuyên gia giáo dục Việt Nam. Hãy tạo ${request.questionCount} câu hỏi bài tập dạng: ${types}.

Cấp học: ${request.gradeLevel === 'preschool' ? 'Mầm non (3-6 tuổi)' : request.gradeLevel === 'primary' ? 'Tiểu học' : request.gradeLevel === 'secondary' ? 'THCS' : 'THPT'}
Nội dung/chủ đề: ${request.rawContent}

CHẾ ĐỘ TẠO BÀI: ${contentModeInstruction}
${preschoolDirective}
Yêu cầu chung:
- Độ khó: ${diffLabel}
- Ngôn ngữ: ${request.language === 'en' ? 'English' : request.language === 'fr' ? 'Français' : 'Tiếng Việt (có dấu đầy đủ)'}
- Mỗi câu hỏi phải rõ ràng, chính xác, phù hợp lứa tuổi
- Với trắc nghiệm / đếm số / khoanh khác biệt / quy luật: có đúng 4 lựa chọn trong options và chỉ 1 đáp án đúng
- QUY TẮC BẮT BUỘC VỀ ĐÁP ÁN:
  + options chỉ chứa nội dung lựa chọn, KHÔNG thêm nhãn "A.", "B)", "1." ở đầu vì ứng dụng tự đánh nhãn A, B, C, D theo thứ tự trong mảng
  + correctAnswer phải SAO CHÉP NGUYÊN VĂN một phần tử trong options, KHÔNG ghi chữ cái A/B/C/D hay số thứ tự vị trí
  + Ví dụ: options ["12", "15", "18", "20"] có đáp án đúng 15 thì correctAnswer là "15"; options ["L", "M", "N", "Q"] có đáp án đúng điểm M thì correctAnswer là "M"; options ["Hà Nội", "Huế", "Đà Nẵng", "Cần Thơ"] có đáp án đúng Huế thì correctAnswer là "Huế" (không ghi "B")
  + Trước khi trả về, hãy kiểm tra correctAnswer của từng câu có nằm trong options của câu đó và đúng về mặt kiến thức
- Với đúng/sai: options là ["Đúng", "Sai"], correctAnswer là "Đúng" hoặc "Sai"
- Với điền khuyết: dùng dấu "___" cho chỗ trống, correctAnswer chỉ gồm đúng từ/cụm/số cần điền; nếu có nhiều cách viết được chấp nhận thì ngăn cách bằng " | "
- Với nối cột/ghép thẻ/nối bóng: tạo cặp nối tương ứng trong matchingPairs
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
- QUAN TRỌNG: Nếu có công thức toán học từ cấp tiểu học trở lên, hãy viết dạng LaTeX ($...$ inline, $$...$$ block)

Trả về JSON THUẦN (không markdown, không code block) với format:
[
  {
    "content": "nội dung câu hỏi",
    "type": "mã dạng của câu này, là một trong: ${request.questionTypes.join(', ')}",
    "options": ["nội dung lựa chọn 1", "nội dung lựa chọn 2", "nội dung lựa chọn 3", "nội dung lựa chọn 4"],
    "correctAnswer": "nội dung lựa chọn 2",
    "explanation": "giải thích ngắn",
    "difficulty": "${request.difficulty}",
    "matchingPairs": [{"left": "...", "right": "..."}]
  }
]

Lưu ý: Chỉ trả về mảng JSON. 
- Trường matchingPairs chỉ dùng cho loại: matching, shadow_match, card_match.
- Trường options chỉ dùng cho loại: multiple_choice, true_false, counting, circle_odd, pattern_sequence.`;
}

const LATEX_COMMANDS_LIKE_JSON_ESCAPES = new Set([
  'frac', 'forall', 'flat',
  'beta', 'bar', 'begin', 'big', 'binom', 'bot', 'boxed', 'bullet', 'because',
  'times', 'theta', 'tan', 'tau', 'to', 'text', 'therefore', 'triangle', 'tfrac', 'top', 'tilde',
  'neq', 'ne', 'nu', 'not', 'notin', 'nabla', 'ni', 'nmid',
  'rho', 'right', 'rightarrow', 'rangle', 'root',
]);

// AI hay viết LaTeX với một dấu "\": "\frac" bị JSON đọc thành ký tự form-feed + "rac", còn "\sqrt" làm JSON lỗi hẳn
export function repairLatexEscapes(json: string): string {
  return json.replace(/\\(["\\/]|[a-zA-Z]+|[\s\S])/g, (match, token: string) => {
    if (token === '"' || token === '\\' || token === '/') return match;
    const isJsonEscape = /^[bfnrtu]/.test(token);
    if (isJsonEscape && !LATEX_COMMANDS_LIKE_JSON_ESCAPES.has(token)) return match;
    return `\\${match}`;
  });
}

function extractJsonArray(text: string): unknown[] | null {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* continue */ }

  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json|JSON)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* continue */ }
  }

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

const OPTION_QUESTION_TYPES: QuestionType[] = ['multiple_choice', 'counting', 'circle_odd', 'pattern_sequence', 'true_false'];

export function parseGeneratedQuestions(
  parsed: Record<string, unknown>[],
  request: Pick<WorksheetGenerationRequest, 'questionTypes' | 'difficulty'>
): Question[] {
  return parsed.map((q, i) => {
    const options = Array.isArray(q.options) ? (q.options as unknown[]).map(String) : undefined;
    const rawType = String(q.type);
    const fallbackType = (options && request.questionTypes.find(t => OPTION_QUESTION_TYPES.includes(t))) || request.questionTypes[0];
    const rawDifficulty = String(q.difficulty);

    return normalizeQuestionAnswer({
      id: `q_${Date.now()}_${i}`,
      content: String(q.content || ''),
      type: rawType in QUESTION_TYPE_LABELS ? rawType as QuestionType : fallbackType,
      options,
      // Dùng ?? để đáp án là số 0 không bị mất
      correctAnswer: String(q.correctAnswer ?? ''),
      explanation: q.explanation ? String(q.explanation) : undefined,
      difficulty: rawDifficulty in DIFFICULTY_LABELS ? rawDifficulty as Question['difficulty'] : request.difficulty,
      matchingPairs: Array.isArray(q.matchingPairs) ? q.matchingPairs as { left: string; right: string }[] : undefined,
    });
  });
}

export async function generateWorksheetQuestions(
  request: WorksheetGenerationRequest
): Promise<Question[]> {
  const prompt = buildWorksheetPrompt(request);
  const result = await callGoogleAi(prompt, true);

  if (!result) throw new Error('Không nhận được kết quả từ AI');

  const parsed = extractJsonArray(repairLatexEscapes(result));
  if (!parsed || parsed.length === 0) {
    console.error('AI response cannot be parsed:', result.substring(0, 500));
    throw new Error('Không thể phân tích kết quả AI. Vui lòng thử lại!');
  }

  return parseGeneratedQuestions(parsed as Record<string, unknown>[], request);
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

  const result = await callGoogleAi(prompt, true);
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
  const result = await callGoogleAi(prompt);
  if (!result) throw new Error('Không nhận được phản hồi từ AI');
  return result;
}

export async function analyzeImage(base64Data: string, mimeType: string): Promise<string> {
  const settings = getSettings();
  const provider = getProvider(settings);
  const apiKey = getActiveApiKey(settings).trim();

  if (!apiKey) throw new Error('Vui lòng cấu hình API Key trước khi sử dụng tính năng này.');
  if (!isValidGoogleAiApiKey(apiKey)) {
    throw new Error('API Key cần bắt đầu bằng AIzaSy hoặc AQ.');
  }

  const promptText = 'Hãy nhận dạng và trích xuất TOÀN BỘ nội dung văn bản từ ảnh tài liệu/sách giáo khoa này. Giữ nguyên cấu trúc, tiêu đề, đoạn văn, công thức toán (dùng LaTeX). Trả về văn bản thuần, không cần mô tả hình ảnh.';

  const text = await callGoogleAiWithFallback({
    apiKey,
    provider,
    selectedModel: settings.selectedModel,
    contents: [
      {
        role: 'user',
        parts: [
          { text: promptText },
          { inlineData: { mimeType, data: base64Data } }
        ]
      }
    ]
  });

  if (!text) throw new Error('Không nhận dạng được nội dung từ ảnh.');
  return text;
}
