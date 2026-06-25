# 📋 QUY TẮC PHÁT TRIỂN & TỐI ƯU GEMINI API (Thống Nhất)

> **Phiên bản:** 3.1 — Tháng 6/2026
> **Mục đích:** Hợp nhất LỆNH.md + API.md thành 1 tài liệu duy nhất
> **Áp dụng cho:** Mọi dự án dùng Gemini API, triển khai Vercel

---

## I. DANH SÁCH MODEL & THỨ TỰ ƯU TIÊN

### 6 Model Hỗ Trợ (theo Google AI 06/2026)

| Model | Context | Output Max | Chi phí/request* | Đặc điểm |
|-------|---------|-----------|------------------|--------|
| **gemini-3.5-flash** ⚡ | 1M | 65,536 | Cân bằng | Model ổn định mặc định cho đa số tác vụ |
| **gemini-3.1-pro-preview** 🧠 | 1M | 65,536 | Cao | Reasoning mạnh, tác vụ phức tạp |
| **gemini-3.1-flash-lite** 💨 | 1M | 65,536 | Rẻ | Nhanh, nhẹ, tiết kiệm token |
| **gemini-2.5-flash** ⚡ | 1M | 65,536 | ~$0.0044 | Cân bằng chi phí/hiệu năng |
| **gemini-2.5-flash-lite** | 128K | ~8,192 | ~$0.0018 | Nhanh nhất, rẻ nhất |
| **gemini-2.5-pro** 💎 | 1M (test 2M) | 65,536 | ~$0.0175 | Chất lượng cao nhất, coding/analysis |

*Chi phí ước tính với 2K input + 1.5K output tokens*

### Bảng Giá Chi Tiết (per 1M tokens)

| Model | Input (≤200K) | Output (≤200K) | Batch Input | Batch Output |
|-------|--------------|----------------|-------------|-------------|
| gemini-2.5-flash | $0.30 | $2.50 | $0.15 | $1.25 |
| gemini-2.5-flash-lite | ~$0.15 | ~$1.00 | ~$0.075 | ~$0.50 |
| gemini-3.5-flash | Theo bảng giá Google AI hiện tại | Theo bảng giá Google AI hiện tại | Theo bảng giá Google AI hiện tại | Theo bảng giá Google AI hiện tại |
| gemini-2.5-pro | $1.25 / $2.50(>200K) | $10.00 / $15.00(>200K) | $0.625 | $5.00 |

---

## II. CƠ CHẾ FALLBACK TỰ ĐỘNG

### Thứ tự Fallback (khi model gặp lỗi/429/quá tải)

```
[Model đã chọn] → gemini-3.5-flash → gemini-3.1-pro-preview → gemini-3.1-flash-lite → gemini-2.5-flash → gemini-2.5-flash-lite → gemini-2.5-pro
```

### Quy tắc Retry
1. Nếu model hiện tại gặp lỗi API → **tự động** thử model tiếp theo
2. Giữ nguyên kết quả các bước trước, chỉ retry bước đang lỗi
3. Nếu API Key hết quota → Thông báo:
   - Lấy API key từ Gmail khác tại https://aistudio.google.com/api-keys
   - Hoặc chờ đến hôm sau
4. Lỗi `503`, `UNAVAILABLE`, `high demand`, `overloaded` là lỗi quá tải model, không đánh dấu API key là sai.

### Endpoint chuẩn

Ứng dụng dùng Interactions API:

```http
POST https://generativelanguage.googleapis.com/v1/interactions
x-goog-api-key: <GEMINI_API_KEY>
Content-Type: application/json
```

Payload text tối thiểu:

```json
{
  "model": "gemini-3.5-flash",
  "input": "Nội dung yêu cầu",
  "store": false,
  "generation_config": {
    "temperature": 0.7,
    "max_output_tokens": 8192
  }
}
```

---

## III. QUẢN LÝ API KEY

### Cơ chế
- Người dùng nhập API key qua **nút Settings trên Header** hoặc Modal
- Lưu vào `localStorage` của trình duyệt
- Ưu tiên key từ `localStorage`
- Chấp nhận cả key cũ bắt đầu bằng `AIzaSy` và auth key mới bắt đầu bằng `AQ`

### Giao diện bắt buộc
- **Header**: Nút Settings (API Key) + dòng chữ đỏ "Lấy API key để sử dụng app"
- **Khi chưa có key**: Hiển thị Modal bắt buộc nhập + link https://aistudio.google.com/api-keys
- **Tab Cài đặt**: Hiển thị Model Selection Cards:
  1. **gemini-3.5-flash** — Ổn định mặc định ⚡
  2. **gemini-3.1-pro-preview** — Reasoning mạnh 🧠
  3. **gemini-3.1-flash-lite** — Siêu nhanh 💨
  4. **gemini-2.5-flash** — Cân bằng
  5. **gemini-2.5-flash-lite** — Rẻ nhất
  6. **gemini-2.5-pro** — Pro 💎

---

## IV. CHIẾN LƯỢC CHỌN MODEL THEO TÁC VỤ

### Quy tắc nhanh

```
Tác vụ đơn giản (FAQ, tóm tắt ngắn)     → gemini-3.1-flash-lite hoặc gemini-2.5-flash-lite
Tác vụ trung bình (chat, multimodal)      → gemini-3.5-flash hoặc gemini-2.5-flash
Tác vụ phức tạp (reasoning, analysis)     → gemini-3.1-pro-preview
Coding/Agentic/Chất lượng cao nhất        → gemini-2.5-pro hoặc gemini-3.1-pro-preview
```

### Bảng Gợi Ý Chi Tiết

| Tác Vụ | Model Khuyến Nghị | Lý Do |
|--------|-------------------|-------|
| Chatbot FAQ đơn giản | gemini-2.5-flash-lite | Nhanh, rẻ, đủ cho Q&A cơ bản |
| Tóm tắt văn bản ngắn | gemini-2.5-flash-lite | Context 128K đủ dùng |
| Tạo câu hỏi trắc nghiệm | gemini-2.5-flash | Cân bằng chi phí/chất lượng |
| Phân tích file (DOCX/PDF) | gemini-2.5-flash | Multimodal, giá tốt |
| Phân tích dữ liệu sâu | gemini-3.1-pro-preview | Reasoning tốt cho tác vụ phức tạp |
| Coding/Agentic tasks | gemini-2.5-pro | Agentic coding tốt nhất |
| Complex reasoning | gemini-2.5-pro | Suy luận đa bước phức tạp |

---

## V. TỐI ƯU CHI PHÍ

### Cấu hình tối ưu theo model

| Model | max_output_tokens | temperature | Ghi chú |
|-------|----------------|-------------|---------|
| flash-lite | 1,024 | 0.5 | Chỉ dùng 25% context window |
| flash | 2,048 | 0.7 | Dùng caching cho repeated prompts |
| 3.5 flash | 4,096 | 0.3 | Bật thinking chỉ khi cần reasoning |
| pro | 8,192 | 0.2 | Dùng cho phần quan trọng nhất |

### Chiến lược tiết kiệm
1. **Context Caching**: Tiết kiệm 20-50% cho system prompts lặp lại
2. **Batch API**: Giảm 50% chi phí cho non-real-time tasks
3. **Hybrid Approach**: Phân tích bằng Flash → chỉ dùng Pro cho phần phức tạp
4. **Budget Alert**: Cảnh báo khi chi phí đạt 80% ngân sách → tự động downgrade

### Chi phí ước tính theo quy mô

| Users/ngày | Requests/ngày | Tối ưu/tháng | Toàn Pro/tháng |
|-----------|--------------|-------------|---------------|
| 50 | 500 | ~$27 | ~$263 |
| 100 | 1,000 | ~$54 | ~$525 |
| 500 | 5,000 | ~$270 | ~$2,625 |

---

## VI. TRIỂN KHAI (DEPLOYMENT)

### Vercel
- **File bắt buộc**: `vercel.json` ở root
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
- Kiểm tra: `index.html` tham chiếu đúng entry point
- SPA routing: tất cả routes → `/index.html`

---

## VII. CHECKLIST

### ✅ Trước khi Deploy
- [ ] Phân loại tác vụ: Simple (Lite) | Medium (Flash) | Complex (Flash3/Pro)
- [ ] Cấu hình `max_output_tokens` phù hợp
- [ ] Chuẩn bị fallback chain
- [ ] Gọi Gemini qua Interactions API `/v1/interactions`
- [ ] Validator API key nhận cả `AIzaSy...` và `AQ...`
- [ ] Header có nút Settings/API Key + thông báo đỏ
- [ ] Model Selection Cards trong Cài đặt

### ✅ Sau khi Deploy
- [ ] Theo dõi: Lite + Flash ≥ 80% tổng request
- [ ] Chi phí/ngày trong ngân sách
- [ ] Fallback hoạt động đúng khi model lỗi
- [ ] API key quota cảnh báo đúng

---

> **Tham khảo:** [Google AI Docs](https://ai.google.dev/gemini-api/docs/models) | [Pricing](https://ai.google.dev/pricing) | [Batch API](https://ai.google.dev/gemini-api/docs/batch)
