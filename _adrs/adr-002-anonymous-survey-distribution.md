# ADR-002: Anonymous Survey Distribution for V1

**Date:** February 2026
**Status:** Accepted
**Deciders:** Tucker, Amanda

---

## Context

CC+C currently distributes surveys by drafting an invitation email, handing it to the client's internal team (usually HR or internal comms), and having them BCC it to employees with a single shared link. Everyone gets the same URL. CC+C does not receive or manage the client's employee list.

The industry standard for employee survey platforms (Culture Amp, Glint, Lattice, Peakon) is **confidential** surveys: each person receives a unique link, the platform tracks who has completed the survey, but responses are architecturally separated from identity. This enables reminders, accurate completion rates, duplicate prevention, and access control.

The Feb 3rd meeting surfaced a tension: unique links improve survey administration but risk undermining perceived anonymity. Amanda noted that even if the architecture separates tracking from responses, employees may see a personalized URL and assume they're being watched. CC+C's credibility depends on respondent trust.

## Decision

**V1 will use anonymous survey distribution (single shared link, BCC process).** The platform will support confidential surveys with unique links as a client-selectable option in a future release, and can fast-track this if an early client requires it.

## Rationale

**Operational fit.** The BCC process matches how CC+C has been operating. No new workflows, no employee list handoff, no change to the client relationship dynamic. The platform generates a link, CC+C drafts the email, the client sends it.

**Trust preservation.** Anonymous links carry zero perception risk. There is no URL parameter that could be interpreted as a personal identifier. This matters most while CC+C is establishing the platform with early clients.

**Reduced V1 scope.** Anonymous distribution requires no email sending infrastructure, no respondent roster management, no completion-tracking UI per individual, and no unique link generation system. This removes significant engineering work from the critical path.

**Confidential is additive, not a rewrite.** The data model already defines `deployment_type` as an enum with `anonymous_link`, `tracked_link`, and `email_invite` values. The `responses` table has no `user_id` column â€” anonymity is architectural. Adding confidential surveys later means building the respondent roster and unique link generation on top of the existing structure, not changing the response storage model.

## Consequences

### What we gain
- Simpler V1 with fewer moving parts
- No dependency on client providing employee data
- Maximum respondent trust out of the gate
- Faster time to first client deployment

### What we give up (until confidential is added)
- **No targeted reminders.** We can't nudge non-respondents because we don't know who they are. Workaround: CC+C asks the client contact to send a general reminder via BCC.
- **No per-person completion tracking.** We can show total response count but not "47 of 120 people." Workaround: CC+C gets the approximate employee count from the client and calculates an estimated rate.
- **Imperfect duplicate prevention.** A browser cookie catches accidental resubmissions, but someone clearing cookies or switching devices could submit twice. IP hashing is unreliable behind corporate NATs. Workaround: metadata-pattern flagging during score calculation can surface suspicious duplicates for CC+C review.
- **No access control on the link.** If the URL is forwarded outside the organization, anyone could submit. Workaround: low practical risk for an internal culture survey â€” outsiders lack context and motivation.

### Duplicate prevention strategy (V1)
1. Clear confirmation UX on submission (completion token / reference number) to eliminate "did it go through?" resubmissions
2. Browser cookie/localStorage marker â€” returning visitors see "you've already completed this survey" with a contact option
3. `ip_hash` stored as an analytics signal, not an enforcement mechanism
4. Post-hoc metadata-pattern flagging as a stretch goal during score calculation

## Path to Confidential Surveys

When a client requires completion tracking, reminders, or guaranteed one-per-person responses, the platform will add confidential surveys. The implementation path:

1. **Respondent roster.** Client provides employee list via spreadsheet upload (CSV/XLSX with email, department, role, location, tenure). This mirrors the list they already maintain for BCC â€” they share it with the platform instead of their email client. Manual entry in the platform UI serves as a lightweight alternative for smaller groups.
2. **Unique link generation.** Each respondent gets a `tracked_link` deployment with a unique token. The `deployments` table already supports this type.
3. **Completion tracking.** When a unique link is used, mark it as completed. Responses remain in the same `responses` table with no `user_id` â€” the link-to-person mapping and the response storage stay in separate systems.
4. **Reminders.** Platform can identify unused links and trigger reminder emails to non-respondents.
5. **Future: HRIS integration, SSO/directory sync.** These replace the manual spreadsheet upload with automated roster management. Only justified once platform traction warrants the engineering investment and client trust supports that level of data access.

## References

- [Data Model â€” Deployments & Responses](./data-model.md)
- [Feature Specifications â€” S3: Survey Taking, S5: Completion Tracking](./feature-specifications.md)
- [Security & Compliance â€” Anonymity Architecture](./security-compliance.md)
- [Unexplored Ideas â€” HRIS Integration, Email Campaign Builder](./unexplored-ideas.md)
- Anonymous vs. Confidential Surveys (stakeholder document for Amanda)
