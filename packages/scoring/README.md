# @compass/scoring

Scoring algorithm pipeline that transforms raw survey responses into dimension scores, sub-dimension scores, archetype matches, risk flags, trust ladder positions, and segmented breakdowns.

## Public API

### Functions

- `normalizeAnswer` — Apply reverse scoring normalization to a Likert answer
- `calculateDimensionScore` — Score a single dimension from weighted answers
- `calculateAllDimensionScores` — Score all four dimensions from grouped answers
- `calculateSubDimensionScores` — Score sub-dimensions within each dimension
- `classifyCoreHealth` — Classify core dimension as healthy, fragile, or broken
- `computeSurveyScores` — Full scoring pipeline (normalize, score, classify, identify)
- `euclideanDistance` — Euclidean distance between score vectors
- `distanceToConfidence` — Convert archetype distance to confidence level
- `identifyArchetype` — Match scores to the closest archetype
- `evaluateRiskFlags` — Identify risk flags from dimension scores
- `segmentKey` — Build a segment lookup key
- `groupResponsesBySegment` — Group responses by demographic segments
- `computeSegmentedScores` — Score all segments
- `calculateTrustLadderPosition` — Determine position on the trust ladder

### Constants

- `LIKERT_MIN`, `LIKERT_MAX`, `LIKERT_RANGE`, `SCORE_DECIMALS` — Default scoring constants
- `buildScoringConstants` — Build scoring constants for a given Likert scale size
- `DEFAULT_RISK_THRESHOLDS` — Default thresholds for risk flag evaluation
- `SEGMENT_TYPES`, `OVERALL_SEGMENT` — Segment type constants

### Types

- `DimensionCode`, `DimensionScore`, `DimensionScoreMap`, `CoreHealthStatus`, `SurveyScoreResult`, `AnswerWithMeta`, `SubDimensionScore`
- `ScoringConstants`, `ScoringErrorCode`, `ScoringError`
- `ArchetypeVector`, `ArchetypeMatch`
- `RiskSeverity`, `RiskFlag`, `RiskThresholds`
- `SegmentType`, `SegmentTypeWithOverall`, `Segment`, `SegmentScoreResult`, `SegmentedSurveyResult`, `ResponseWithMeta`
- `TrustRungStatus`, `TrustRungScore`, `TrustLadderResult`

## Key Dependencies

- None (pure TypeScript, zero runtime dependencies)
