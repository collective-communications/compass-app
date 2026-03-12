# Interaction Testing Convention

## Planning Story → Storybook Play Function

| Planning Field | Storybook Equivalent |
|---|---|
| `actor` | Story description / test context |
| `intent` | JSDoc on play function |
| `preconditions` | Story args + decorator setup |
| `trigger_action` | First `userEvent` call |
| `steps[].action` | Sequential `userEvent` calls |
| `steps[].system_response` | `expect()` assertion after each action |
| `acceptance_criteria[].given` | Story args / initial state |
| `acceptance_criteria[].when` | `userEvent` call |
| `acceptance_criteria[].then` | `expect()` assertion |
| `wireframe_refs[].screen` | Target `.stories.tsx` file |
| `wireframe_refs[].element` | `getByRole` / `getByLabelText` selector |

## Workflow

1. Get planning story: `/planning command=get_story id="..."`
2. Identify target component from `wireframe_refs`
3. Create/update `.stories.tsx` with named export per acceptance criterion
4. Implement `play` function using helpers from `test-utils/interaction-helpers`
5. Verify in Storybook Interactions panel

## Example

Planning story:
```json
{
  "actor": "Respondent",
  "steps": [
    { "action": "selects option 3", "system_response": "option highlighted" },
    { "action": "clicks Next", "system_response": "advances to next question" }
  ],
  "acceptance_criteria": [
    { "given": "question is displayed", "when": "option selected and Next clicked", "then": "next question appears" }
  ]
}
```

Storybook play function:
```typescript
export const AnswerAndAdvance: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await selectLikertOption(canvas, 3);
    await userEvent.click(canvas.getByRole('button', { name: /next/i }));
    await expectVisible(canvas, 'Question 2');
  },
};
```
