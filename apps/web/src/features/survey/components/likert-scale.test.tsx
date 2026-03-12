import { afterEach, describe, expect, test, mock } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { LikertScale } from './likert-scale';

describe('LikertScale', () => {
  afterEach(cleanup);
  test('renders 4 radio buttons', () => {
    render(<LikertScale value={undefined} onChange={() => {}} name="q1" />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
  });

  test('renders radiogroup container', () => {
    render(<LikertScale value={undefined} onChange={() => {}} name="q1" />);
    expect(screen.getByRole('radiogroup')).toBeTruthy();
  });

  test('marks selected value as aria-checked="true"', () => {
    render(<LikertScale value={3} onChange={() => {}} name="q1" />);
    const radios = screen.getAllByRole('radio');
    const checked = radios.filter((r) => r.getAttribute('aria-checked') === 'true');
    const unchecked = radios.filter((r) => r.getAttribute('aria-checked') === 'false');
    expect(checked).toHaveLength(1);
    expect(unchecked).toHaveLength(3);
  });

  test('no value selected marks all as aria-checked="false"', () => {
    render(<LikertScale value={undefined} onChange={() => {}} name="q1" />);
    const radios = screen.getAllByRole('radio');
    const checked = radios.filter((r) => r.getAttribute('aria-checked') === 'true');
    expect(checked).toHaveLength(0);
  });

  test('renders all four labels', () => {
    render(<LikertScale value={undefined} onChange={() => {}} name="q1" />);
    expect(screen.getByLabelText('Strongly Disagree')).toBeTruthy();
    expect(screen.getByLabelText('Disagree')).toBeTruthy();
    expect(screen.getByLabelText('Agree')).toBeTruthy();
    expect(screen.getByLabelText('Strongly Agree')).toBeTruthy();
  });

  test('clicking an option calls onChange with correct value', () => {
    const onChange = mock(() => {});
    render(<LikertScale value={undefined} onChange={onChange} name="q1" />);

    fireEvent.click(screen.getByLabelText('Agree'));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  test('clicking a different option calls onChange with that value', () => {
    const onChange = mock(() => {});
    render(<LikertScale value={undefined} onChange={onChange} name="q1" />);

    fireEvent.click(screen.getByLabelText('Strongly Disagree'));
    expect(onChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByLabelText('Strongly Agree'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  test('applies selected styling class on chosen value', () => {
    const { container } = render(<LikertScale value={2} onChange={() => {}} name="q1" />);
    const html = container.innerHTML;
    expect(html).toContain('bg-[var(--color-core)] text-white');
  });

  test('each button has an aria-label matching its option label', () => {
    render(<LikertScale value={undefined} onChange={() => {}} name="q1" />);
    expect(screen.getByLabelText('Strongly Disagree')).toBeTruthy();
    expect(screen.getByLabelText('Disagree')).toBeTruthy();
    expect(screen.getByLabelText('Agree')).toBeTruthy();
    expect(screen.getByLabelText('Strongly Agree')).toBeTruthy();
  });
});
