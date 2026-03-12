import { userEvent, expect, within } from '@storybook/test';

type Canvas = ReturnType<typeof within>;

/** Fill multiple form fields by label */
export async function fillForm(
  canvas: Canvas,
  fields: Record<string, string>,
): Promise<void> {
  for (const [label, value] of Object.entries(fields)) {
    const field = canvas.getByLabelText(label);
    await userEvent.clear(field);
    await userEvent.type(field, value);
  }
}

/** Assert an inline error message appears near a field */
export async function expectInlineError(
  canvas: Canvas,
  fieldLabel: string,
  errorText: string,
): Promise<void> {
  const field = canvas.getByLabelText(fieldLabel);
  const fieldContainer = field.closest('[data-field]') || field.parentElement;
  const error = fieldContainer
    ? within(fieldContainer as HTMLElement).getByText(errorText)
    : canvas.getByText(errorText);
  await expect(error).toBeVisible();
}

/** Assert a button is disabled */
export async function expectDisabled(
  canvas: Canvas,
  buttonName: string,
): Promise<void> {
  const button = canvas.getByRole('button', { name: buttonName });
  await expect(button).toBeDisabled();
}

/** Assert a button is enabled */
export async function expectEnabled(
  canvas: Canvas,
  buttonName: string,
): Promise<void> {
  const button = canvas.getByRole('button', { name: buttonName });
  await expect(button).toBeEnabled();
}

/** Select a Likert scale option by value (1-4) */
export async function selectLikertOption(
  canvas: Canvas,
  value: number,
): Promise<void> {
  const options = canvas.getAllByRole('radio');
  const target = options[value - 1];
  if (!target) throw new Error(`Likert option ${value} not found (${options.length} options available)`);
  await userEvent.click(target);
}

/** Assert text content is visible */
export async function expectVisible(
  canvas: Canvas,
  text: string,
): Promise<void> {
  await expect(canvas.getByText(text)).toBeVisible();
}

/** Assert text content is NOT visible */
export async function expectNotVisible(
  canvas: Canvas,
  text: string,
): Promise<void> {
  const elements = canvas.queryAllByText(text);
  for (const el of elements) {
    await expect(el).not.toBeVisible();
  }
}
