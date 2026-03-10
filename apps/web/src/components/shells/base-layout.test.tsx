import { afterEach, describe, expect, test } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { BaseLayout } from './base-layout';

describe('BaseLayout', () => {
  afterEach(cleanup);

  test('renders header content', () => {
    render(
      <BaseLayout header={<span>App Header</span>}>
        <p>Body</p>
      </BaseLayout>,
    );
    expect(screen.getByText('App Header')).toBeTruthy();
  });

  test('renders children in main element', () => {
    render(
      <BaseLayout header={<span>H</span>}>
        <p>Main Content</p>
      </BaseLayout>,
    );
    const main = screen.getByRole('main');
    expect(main).toBeTruthy();
    expect(screen.getByText('Main Content')).toBeTruthy();
  });

  test('renders footer when provided', () => {
    render(
      <BaseLayout header={<span>H</span>} footer={<span>Footer Content</span>}>
        <p>Body</p>
      </BaseLayout>,
    );
    expect(screen.getByText('Footer Content')).toBeTruthy();
  });

  test('does not render footer element when footer prop is omitted', () => {
    const { container } = render(
      <BaseLayout header={<span>H</span>}>
        <p>Body</p>
      </BaseLayout>,
    );
    const footers = container.querySelectorAll('footer');
    expect(footers).toHaveLength(0);
  });

  test('applies custom className', () => {
    const { container } = render(
      <BaseLayout header={<span>H</span>} className="custom-class">
        <p>Body</p>
      </BaseLayout>,
    );
    const root = container.firstElementChild;
    expect(root?.className).toContain('custom-class');
  });

  test('has sticky header', () => {
    const { container } = render(
      <BaseLayout header={<span>H</span>}>
        <p>Body</p>
      </BaseLayout>,
    );
    const header = container.querySelector('header');
    expect(header?.className).toContain('sticky');
  });
});
