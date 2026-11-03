// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QuestionCard from '../QuestionCard';
import QuestionEditor from '../QuestionEditor';
import type { Question } from '../../types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const question = (overrides: Partial<Question>): Question => ({
  id: 'q1',
  content: 'Câu hỏi',
  type: 'multiple_choice',
  options: ['L', 'M', 'N', 'Q'],
  correctAnswer: 'M',
  difficulty: 'easy',
  ...overrides,
});

function render(element: JSX.Element) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  act(() => createRoot(container).render(element));
  return container;
}

function saveButton(container: HTMLElement) {
  return Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('Lưu thay đổi')) as HTMLButtonElement;
}

function typeInto(input: HTMLInputElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('QuestionEditor', () => {
  it('đánh dấu sẵn đáp án hiện tại', () => {
    const container = render(<QuestionEditor question={question({})} onSave={vi.fn()} onClose={vi.fn()} />);
    const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(Array.from(radios).map(r => r.checked)).toEqual([false, true, false, false]);
  });

  it('lưu đúng nội dung lựa chọn, kể cả khi giáo viên sửa chữ của lựa chọn đó', () => {
    const onSave = vi.fn();
    const container = render(<QuestionEditor question={question({})} onSave={onSave} onClose={vi.fn()} />);
    const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    act(() => radios[2].click());
    typeInto(container.querySelector('input[placeholder="Lựa chọn C"]') as HTMLInputElement, 'N mới');
    act(() => saveButton(container).click());
    expect(onSave.mock.calls[0][0].correctAnswer).toBe('N mới');
    expect(onSave.mock.calls[0][0].options).toEqual(['L', 'M', 'N mới', 'Q']);
  });

  it('không cho lưu khi chưa chọn đáp án đúng', () => {
    const onSave = vi.fn();
    const container = render(<QuestionEditor question={question({ correctAnswer: '' })} onSave={onSave} onClose={vi.fn()} />);
    expect(saveButton(container).disabled).toBe(true);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Chưa chọn đáp án đúng');
    act(() => container.querySelectorAll<HTMLInputElement>('input[type="radio"]')[0].click());
    expect(saveButton(container).disabled).toBe(false);
  });

  it('xóa lựa chọn đứng trước thì đáp án đã chọn vẫn giữ nguyên', () => {
    const onSave = vi.fn();
    const container = render(<QuestionEditor question={question({ correctAnswer: 'N' })} onSave={onSave} onClose={vi.fn()} />);
    const firstOptionRow = (container.querySelector('input[placeholder="Lựa chọn A"]') as HTMLElement).parentElement as HTMLElement;
    act(() => (firstOptionRow.querySelector('button') as HTMLButtonElement).click());
    act(() => saveButton(container).click());
    expect(onSave.mock.calls[0][0].correctAnswer).toBe('N');
    expect(onSave.mock.calls[0][0].options).toEqual(['M', 'N', 'Q']);
  });

  it('câu tự luận vẫn nhập đáp án bằng ô chữ', () => {
    const onSave = vi.fn();
    const container = render(
      <QuestionEditor question={question({ type: 'short_answer', options: undefined, correctAnswer: 'cũ' })} onSave={onSave} onClose={vi.fn()} />
    );
    typeInto(container.querySelector('input[placeholder="Nhập đáp án đúng"]') as HTMLInputElement, 'mới');
    act(() => saveButton(container).click());
    expect(onSave.mock.calls[0][0].correctAnswer).toBe('mới');
  });
});

describe('QuestionCard', () => {
  it('cảnh báo giáo viên khi đáp án không khớp lựa chọn nào', () => {
    const container = render(<QuestionCard question={question({ options: ['Mèo', 'Chó'], correctAnswer: 'Gà' })} index={0} />);
    expect(container.textContent).toContain('Chưa xác định được đáp án đúng (AI ghi "Gà")');
  });

  it('tô đúng một lựa chọn và ghi đáp án kèm nhãn', () => {
    const container = render(<QuestionCard question={question({ options: ['1', '10', '12', '15'], correctAnswer: '1' })} index={0} showAnswer />);
    const highlighted = Array.from(container.querySelectorAll('.border-emerald-300'));
    expect(highlighted.map(el => el.textContent)).toEqual(['A.1']);
    expect(container.textContent).toContain('Đáp án: A. 1');
  });

  it('nối cột không để đáp án nằm cùng hàng', () => {
    const pairs = [{ left: 'Mèo', right: 'Kêu meo' }, { left: 'Chó', right: 'Sủa' }, { left: 'Gà', right: 'Gáy' }];
    const container = render(<QuestionCard question={question({ type: 'matching', options: undefined, matchingPairs: pairs })} index={0} />);
    const rights = Array.from(container.querySelectorAll('.bg-emerald-50.border-emerald-100')).map(el => el.textContent);
    pairs.forEach((pair, i) => expect(rights[i]).not.toContain(pair.right));
  });
});
