import { afterEach, describe, expect, test, mock } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ProgressSquares } from './progress-squares';

describe('ProgressSquares', () => {
  afterEach(cleanup);
  test('renders correct number of buttons', () => {
    render(
      <ProgressSquares total={10} currentIndex={0} answeredIndices={new Set()} onJump={() => {}} />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(10);
  });

  test('renders group with aria-label', () => {
    render(
      <ProgressSquares total={5} currentIndex={0} answeredIndices={new Set()} onJump={() => {}} />,
    );
    expect(screen.getByRole('group', { name: 'Survey progress' })).toBeTruthy();
  });

  test('current question has "current" in aria-label', () => {
    render(
      <ProgressSquares total={5} currentIndex={2} answeredIndices={new Set()} onJump={() => {}} />,
    );
    expect(screen.getByLabelText('Question 3 of 5, current')).toBeTruthy();
  });

  test('answered question has "answered" in aria-label', () => {
    render(
      <ProgressSquares total={5} currentIndex={0} answeredIndices={new Set([1, 3])} onJump={() => {}} />,
    );
    expect(screen.getByLabelText('Question 2 of 5, answered')).toBeTruthy();
    expect(screen.getByLabelText('Question 4 of 5, answered')).toBeTruthy();
  });

  test('unanswered non-current question has "unanswered" in aria-label', () => {
    render(
      <ProgressSquares total={3} currentIndex={0} answeredIndices={new Set()} onJump={() => {}} />,
    );
    expect(screen.getByLabelText('Question 2 of 3, unanswered')).toBeTruthy();
    expect(screen.getByLabelText('Question 3 of 3, unanswered')).toBeTruthy();
  });

  test('clicking an answered square calls onJump with correct index', () => {
    const onJump = mock(() => {});
    render(
      <ProgressSquares total={5} currentIndex={0} answeredIndices={new Set([2])} onJump={onJump} />,
    );

    fireEvent.click(screen.getByLabelText('Question 3 of 5, answered'));
    expect(onJump).toHaveBeenCalledWith(2);
  });

  test('clicking an unanswered square does not call onJump', () => {
    const onJump = mock(() => {});
    render(
      <ProgressSquares total={5} currentIndex={0} answeredIndices={new Set()} onJump={onJump} />,
    );

    fireEvent.click(screen.getByLabelText('Question 4 of 5, unanswered'));
    expect(onJump).not.toHaveBeenCalled();
  });

  test('handles fully answered survey', () => {
    const { container } = render(
      <ProgressSquares total={3} currentIndex={2} answeredIndices={new Set([0, 1, 2])} onJump={() => {}} />,
    );
    const darkSquares = (container.innerHTML.match(/bg-\[var\(--grey-700\)\]/g) ?? []).length;
    expect(darkSquares).toBe(3);
  });
});
