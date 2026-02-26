# Scripts

## `seed-dev.ts` — Development Data Seeding

Seeds a Supabase Cloud project with test data for local development. Creates auth users, organizations, a survey with questions, a deployment, and synthetic responses. Deterministic IDs ensure re-running updates rather than duplicates.

### Prerequisites

Add your **service role key** to `.env.local` (never committed):

```
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard: Settings > API > service_role secret>
```

### Commands

```sh
bun run db:seed     # create all test data
bun run db:clean    # tear down all test data
```

### What gets created

| Entity | Details |
|--------|---------|
| **Organizations** | CC+C (`ccc`) + River Valley Health (`river-valley-health`) |
| **Auth users** | 5 users across all role tiers (see below) |
| **Org memberships** | Each user mapped to their org with role |
| **Survey template** | Culture Compass Assessment (system template) |
| **Survey** | Q1 2026 Culture Assessment (active, River Valley Health) |
| **Questions** | 8 Likert (2 per dimension) + 1 open-ended |
| **Deployment** | Active anonymous link |
| **Responses** | 24 completed responses with metadata variance |

### Test accounts

All accounts use password: `TestPass123!`

| Role | Email |
|------|-------|
| `ccc_admin` | admin@collectivecommunication.ca |
| `ccc_member` | member@collectivecommunication.ca |
| `client_exec` | exec@rivervalleyhealth.ca |
| `client_director` | director@rivervalleyhealth.ca |
| `client_manager` | manager@rivervalleyhealth.ca |

### Response distribution

24 responses cycle evenly across:
- **Departments:** Nursing, Administration, Emergency, Surgery, Outpatient
- **Roles:** Director, Manager, Supervisor, Staff
- **Locations:** Main Campus, West Wing, East Annex
- **Tenure:** < 1 year through 10+ years

Likert values cluster 2–4 (skewing positive). Each response includes an open-ended answer from a pool of 12 realistic comments.
