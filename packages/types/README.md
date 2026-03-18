# @compass/types

Shared TypeScript type definitions and domain constants for the Culture Compass platform.

## Public API

### Enums and Constants

- `UserRole` — User role enum (respondent, analyst, admin, super_admin)
- `SurveyStatus` — Survey lifecycle states
- `QuestionType` — Question type discriminator (likert, open_ended)
- `DeploymentType` — Deployment method (link, email)
- `DimensionCode` — The four compass dimensions
- `ReportFormat` — Report output formats
- `ReportGenerationStatus` — Report generation lifecycle
- `ReportSectionId` — Report section identifiers
- `DEFAULT_LIKERT_SIZE` — Default Likert scale size
- `LIKERT_SCALE`, `LIKERT_LABELS` — Default scale items and labels
- `DEFAULT_METADATA_CONFIG`, `DEFAULT_SURVEY_ENGINE_CONFIG` — Default configuration objects

### Functions

- `getTierFromRole` — Map a role to its access tier
- `getTierHomeRoute` — Get the home route for a tier
- `buildLikertScale`, `buildLikertLabels` — Build scale items for a given scale size
- `isValidLikertValue` — Validate a Likert response value
- `reverseScore` — Reverse-score a Likert value
- `getSessionCookieName` — Get the cookie name for survey session persistence
- `getDefaultReportSections` — Get default report section configuration

### Types

- `AppEnv`, `UserTier`, `AuthUser`, `SessionContext`
- `Organization`, `OrganizationSummary`, `CreateOrganizationParams`
- `LikertValue`, `LikertScaleItem`, `Dimension`, `SubDimension`, `SurveySettings`, `Survey`, `Question`, `QuestionDimension`, `QuestionWithDimension`
- `DeploymentSettings`, `Deployment`, `RespondentMetadata`, `AnswerMap`, `SurveyResponse`, `SurveyTemplate`
- `MetadataConfig`, `DeploymentResolution`, `SurveyRecipient`, `SurveyEngineConfig`, `SurveyEngineService`
- `ReportSection`, `ReportConfig`, `ReportStatus`, `ReportPayload`
- `TrustRungStatus`, `TrustRungScore`, `TrustLadderResult`

## Key Dependencies

- None (pure TypeScript type definitions)
