# ArgTypes Reference

Common ArgTypes patterns for Culture Compass components.

## Card (severity indicator)
```ts
argTypes: {
  severity: { control: 'select', options: [undefined, 'critical', 'high', 'medium', 'healthy'] },
  children: { control: 'text' },
  className: { control: 'text' },
}
```

## Pill Bar (navigation)
```ts
argTypes: {
  items: { control: 'object' },
  activeIndex: { control: 'number' },
  onSelect: { action: 'selected' },
}
```

## Form Field
```ts
argTypes: {
  label: { control: 'text' },
  value: { control: 'text' },
  error: { control: 'text' },
  disabled: { control: 'boolean' },
  required: { control: 'boolean' },
  onChange: { action: 'changed' },
}
```

## Likert Scale (4-point, no neutral)
```ts
argTypes: {
  question: { control: 'text' },
  selected: { control: { type: 'number', min: 1, max: 4 } },
  labels: { control: 'object' },  // e.g., ['Strongly Disagree', 'Disagree', 'Agree', 'Strongly Agree']
  onSelect: { action: 'selected' },
}
```

## Sidebar Organization

Stories should use title paths matching the source directory:

| Title prefix | Source directory |
|---|---|
| `Components/Brand/` | `src/components/brand/` |
| `Components/Navigation/` | `src/components/navigation/` |
| `Components/Shells/` | `src/components/shells/` |
| `Components/Survey/` | `src/components/survey/` |
| `Components/Help/` | `src/components/help/` |
| `Components/UI/` | `src/components/ui/` |
| `Features/Auth/` | `src/features/auth/` |
| `Features/Survey/` | `src/features/survey/` |
| `Features/Results/` | `src/features/results/` |
| `Features/Dashboard/` | `src/features/dashboard/` |
| `Features/Admin/` | `src/features/admin/` |
| `Features/Reports/` | `src/features/reports/` |
| `Packages/Compass/` | `packages/compass/` |
| `Packages/Scoring/` | `packages/scoring/` |
| `Packages/UI/` | `packages/ui/` |
| `Compositions/` | Multi-component compositions |
| `Pages/` | Full page with shell decorator |
