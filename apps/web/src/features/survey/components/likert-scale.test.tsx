import { afterEach, describe, expect, test, mock } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { buildLikertScale } from '@compass/types';
import { LikertScale } from './likert-scale';

const scale4 = buildLikertScale(4);
const scale5 = buildLikertScale(5);

describe('LikertScale', () => {
  afterEach(cleanup);

  test('renders 4 radio buttons with 4-point scale', () => {
    render(<LikertScale value={undefined} onChange={() => {}} name="q1" scale={scale4} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
  });

  test('renders 5 radio buttons with 5-point scale', () => {
    render(<LikertScale value={undefined} onChange={() => {}} name="q1" scale={scale5} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(5);
  });

  test('renders radiogroup container', () => {
    render(<LikertScale value={undefined} onChange={() => {}} name="q1" scale={scale4} />);
    expect(screen.getByRole('radiogroup')).toBeTruthy();
  });

  test('marks selected value as aria-checked="true"', () => {
    render(<LikertScale value={3} onChange={() => {}} name="q1" scale={scale4} />);
    const radios = screen.getAllByRole('radio');
    const checked = radios.filter((r) => r.getAttribute('aria-checked') === 'true');
    const unchecked = radios.filter((r) => r.getAttribute('aria-checked') === 'false');
    expect(checked).toHaveLength(1);
    expect(unchecked).toHaveLength(3);
  });

  test('no value selected marks all as aria-checked="false"', () => {
    render(<LikertScale value={undefined} onChange={() => {}} name="q1" scale={scale4} />);
    const radios = screen.getAllByRole('radio');
    const checked = radios.filter((r) => r.getAttribute('aria-checked') === 'true');
    expect(checked).toHaveLength(0);
  });

  test('renders all four labels for 4-point scale', () => {
    render(<LikertScale value={undefined} onChange={() => {}} name="q1" scale={scale4} />);
    expect(screen.getByLabelText('Strongly Disagree')).toBeTruthy();
    expect(screen.getByLabelText('Disagree')).toBeTruthy();
    expect(screen.getByLabelText('Agree')).toBeTruthy();
    expect(screen.getByLabelText('Strongly Agree')).toBeTruthy();
  });

  test('clicking an option calls onChange with correct value', () => {
    const onChange = mock(() => {});
    render(<LikertScale value={undefined} onChange={onChange} name="q1" scale={scale4} />);

    fireEvent.click(screen.getByLabelText('Agree'));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  test('clicking a different option calls onChange with that value', () => {
    const onChange = mock(() => {});
    render(<LikertScale value={undefined} onChange={onChange} name="q1" scale={scale4} />);

    fireEvent.click(screen.getByLabelText('Strongly Disagree'));
    expect(onChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByLabelText('Strongly Agree'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  test('applies selected styling class on chosen value', () => {
    const { container } = render(<LikertScale value={2} onChange={() => {}} name="q1" scale={scale4} />);
    const html = container.innerHTML;
    expect(html).toContain('bg-[var(--grey-700)] text-white');
  });

  test('each button has an aria-label matching its option label', () => {
    render(<LikertScale value={undefined} onChange={() => {}} name="q1" scale={scale4} />);
    expect(screen.getByLabelText('Strongly Disagree')).toBeTruthy();
    expect(screen.getByLabelText('Disagree')).toBeTruthy();
    expect(screen.getByLabelText('Agree')).toBeTruthy();
    expect(screen.getByLabelText('Strongly Agree')).toBeTruthy();
  });

  test('5-point scale includes neutral option', () => {
    render(<LikertScale value={undefined} onChange={() => {}} name="q1" scale={scale5} />);
    expect(screen.getByLabelText('Neither Agree nor Disagree')).toBeTruthy();
  });

  test('renders all five labels for 5-point scale', () => {
    render(<LikertScale value={undefined} onChange={() => {}} name="q1" scale={scale5} />);
    expect(screen.getByLabelText('Strongly Disagree')).toBeTruthy();
    expect(screen.getByLabelText('Disagree')).toBeTruthy();
    expect(screen.getByLabelText('Neither Agree nor Disagree')).toBeTruthy();
    expect(screen.getByLabelText('Agree')).toBeTruthy();
    expect(screen.getByLabelText('Strongly Agree')).toBeTruthy();
  });

  test('5-point onChange fires with value 5 for Strongly Agree', () => {
    const onChange = mock(() => {});
    render(<LikertScale value={undefined} onChange={onChange} name="q1" scale={scale5} />);
    fireEvent.click(screen.getByLabelText('Strongly Agree'));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  test('5-point onChange fires with correct value for each option', () => {
    const onChange = mock(() => {});
    render(<LikertScale value={undefined} onChange={onChange} name="q1" scale={scale5} />);

    fireEvent.click(screen.getByLabelText('Strongly Disagree'));
    expect(onChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByLabelText('Disagree'));
    expect(onChange).toHaveBeenCalledWith(2);

    fireEvent.click(screen.getByLabelText('Neither Agree nor Disagree'));
    expect(onChange).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByLabelText('Agree'));
    expect(onChange).toHaveBeenCalledWith(4);

    fireEvent.click(screen.getByLabelText('Strongly Agree'));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  test('4-point scale still works after 5-point additions (backward compat)', () => {
    const onChange = mock(() => {});
    render(<LikertScale value={2} onChange={onChange} name="q1" scale={scale4} />);

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);

    const checked = radios.filter((r) => r.getAttribute('aria-checked') === 'true');
    expect(checked).toHaveLength(1);

    fireEvent.click(screen.getByLabelText('Strongly Agree'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  test('5-point marks correct value as selected', () => {
    render(<LikertScale value={3} onChange={() => {}} name="q1" scale={scale5} />);
    const radios = screen.getAllByRole('radio');
    const checked = radios.filter((r) => r.getAttribute('aria-checked') === 'true');
    const unchecked = radios.filter((r) => r.getAttribute('aria-checked') === 'false');
    expect(checked).toHaveLength(1);
    expect(unchecked).toHaveLength(4);
  });
});
