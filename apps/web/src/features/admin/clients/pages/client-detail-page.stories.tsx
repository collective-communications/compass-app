import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SubTabNav } from '../../../../components/navigation/sub-tab-nav';

/* -------------------------------------------------------------------------- */
/*  AdminDetailDecorator                                                      */
/*  Static layout approximation for admin detail pages: drilldown header +     */
/*  SubTabNav with client detail tabs (Overview/Surveys/Users).               */
/* -------------------------------------------------------------------------- */

const AdminDetailDecorator: Decorator = (Story, context) => {
  const activeTabId = context.args?.activeTabId ?? 'overview';

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--grey-50)',
        fontFamily: 'var(--font-body)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Drilldown header */}
      <div
        style={{
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--grey-100)',
          backgroundColor: 'var(--grey-0, #ffffff)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ← Back to clients
          </span>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--grey-900)',
              margin: 0,
            }}
          >
            River Valley Health
          </h1>
        </div>
        <span
          style={{
            color: 'var(--text-tertiary)',
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          ⋯
        </span>
      </div>

      {/* SubTabNav */}
      <div style={{ padding: '0 24px', backgroundColor: 'var(--grey-0, #ffffff)' }}>
        <SubTabNav
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'surveys', label: 'Surveys' },
            { id: 'users', label: 'Users' },
          ]}
          activeId={activeTabId}
          onSelect={fn()}
          ariaLabel="Client detail tabs"
        />
      </div>

      {/* Tab content */}
      <main style={{ flex: 1, padding: '24px' }}>
        <Story />
      </main>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Placeholder content components                                            */
/* -------------------------------------------------------------------------- */

const OverviewContent = () => (
  <div style={{ display: 'flex', gap: '24px' }}>
    <div style={{ flex: '0 0 65%' }}>
      <div
        style={{
          padding: '24px',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid var(--grey-100)',
          marginBottom: '16px',
        }}
      >
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--grey-900)',
          }}
        >
          Organization Info
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: 'var(--text-secondary)',
          }}
        >
          River Valley Health • Healthcare • 2,500 employees
        </p>
      </div>
      <div
        style={{
          padding: '24px',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid var(--grey-100)',
        }}
      >
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--grey-900)',
          }}
        >
          Key Metrics
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: 'var(--text-secondary)',
          }}
        >
          3 surveys • Score: 72 • 1 active
        </p>
      </div>
    </div>
    <div style={{ flex: '0 0 35%' }}>
      <div
        style={{
          padding: '24px',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid var(--grey-100)',
        }}
      >
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--grey-900)',
          }}
        >
          Assigned Consultant
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: 'var(--text-secondary)',
          }}
        >
          Sarah Chen
        </p>
      </div>
    </div>
  </div>
);

const SurveysContent = () => (
  <div
    style={{
      padding: '24px',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid var(--grey-100)',
    }}
  >
    <h3
      style={{
        margin: '0 0 16px',
        fontSize: '16px',
        fontWeight: 600,
        color: 'var(--grey-900)',
      }}
    >
      Surveys
    </h3>
    <p
      style={{
        margin: 0,
        fontSize: '14px',
        color: 'var(--text-secondary)',
      }}
    >
      3 surveys for this organization
    </p>
  </div>
);

const UsersContent = () => (
  <div
    style={{
      padding: '24px',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid var(--grey-100)',
    }}
  >
    <h3
      style={{
        margin: '0 0 16px',
        fontSize: '16px',
        fontWeight: 600,
        color: 'var(--grey-900)',
      }}
    >
      Team Members
    </h3>
    <p
      style={{
        margin: 0,
        fontSize: '14px',
        color: 'var(--text-secondary)',
      }}
    >
      5 users with platform access
    </p>
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Storybook meta and stories                                                */
/* -------------------------------------------------------------------------- */

const meta = {
  title: 'Features/Admin/ClientDetailPage',
  decorators: [AdminDetailDecorator],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  args: { activeTabId: 'overview' },
  render: () => <OverviewContent />,
};

export const Surveys: Story = {
  args: { activeTabId: 'surveys' },
  render: () => <SurveysContent />,
};

export const Users: Story = {
  args: { activeTabId: 'users' },
  render: () => <UsersContent />,
};
