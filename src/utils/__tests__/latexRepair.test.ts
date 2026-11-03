import { describe, expect, it } from 'vitest';
import { repairLatexEscapes } from '../geminiApi';

const parse = (json: string) => JSON.parse(repairLatexEscapes(json));

describe('repairLatexEscapes', () => {
  it('giữ nguyên lệnh LaTeX trùng với mã thoát của JSON', () => {
    expect(parse('["$\\frac{1}{4}$"]')).toEqual(['$\\frac{1}{4}$']);
    expect(parse('["$\\beta \\times \\neq \\rightarrow$"]')).toEqual(['$\\beta \\times \\neq \\rightarrow$']);
  });

  it('sửa lệnh LaTeX làm JSON không đọc được', () => {
    expect(parse('["$\\sqrt{2} \\alpha \\{x\\}$"]')).toEqual(['$\\sqrt{2} \\alpha \\{x\\}$']);
  });

  it('không đụng vào JSON đã đúng', () => {
    expect(parse('["$\\\\frac{1}{4}$"]')).toEqual(['$\\frac{1}{4}$']);
    expect(parse('["dòng 1\\nDòng 2\\tcột", "\\"trích\\"", "\\u00e1"]')).toEqual(['dòng 1\nDòng 2\tcột', '"trích"', 'á']);
  });
});
