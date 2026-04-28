/**
 * keywords — Pure keyword extraction for open-ended dialogue entries.
 *
 * No I/O, no Supabase client. Tokenises response texts, counts word
 * frequencies per dimension group (plus a cross-dimension "overall" group),
 * filters low-frequency tokens, and classifies sentiment from curated word lists.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum word occurrences required for a keyword to be included. */
const MIN_FREQUENCY = 2;

/** Maximum keywords returned per dimension group (and the overall group). */
const MAX_KEYWORDS_PER_GROUP = 25;

// ─── Stop Words ───────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  // Original set from client-side extraction
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'as', 'be', 'was', 'are',
  'been', 'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'that', 'this', 'these',
  'those', 'i', 'we', 'you', 'they', 'he', 'she', 'my', 'our', 'your',
  'their', 'its', 'not', 'no', 'so', 'if', 'all', 'more', 'some', 'any',
  'very', 'just', 'about', 'up', 'out', 'when', 'what', 'how', 'which',
  'who', 'there', 'than', 'also', 'into', 'only', 'other', 'then',
  'them', 'me', 'him', 'her', 'us', 'like', 'get', 'make', 'one',
  'much', 'many', 'well', 'being', 'don', 'really', 'think', 'know',
  // Extended articles / prepositions
  'onto', 'upon', 'over', 'under', 'between', 'through', 'around',
  'before', 'after', 'during', 'since', 'until', 'within', 'without',
  'against', 'across', 'along', 'behind', 'below', 'beside', 'besides',
  'beyond', 'despite', 'except', 'following', 'inside', 'near', 'outside',
  'past', 'regarding', 'throughout', 'toward', 'towards', 'underneath',
  'unlike', 'per', 'plus', 'via', 'off', 'down',
  // Extended common verbs
  'get', 'make', 'go', 'come', 'see', 'say', 'feel', 'want', 'need',
  'use', 'work', 'give', 'take', 'put', 'keep', 'let', 'seem', 'show',
  'try', 'ask', 'turn', 'move', 'live', 'help', 'hold', 'bring',
  'happen', 'look', 'play', 'run', 'set', 'start', 'stop', 'talk',
  'become', 'leave', 'find', 'call', 'change', 'follow', 'allow',
  'support', 'continue', 'provide', 'create', 'consider', 'include',
  'ensure', 'require', 'enable', 'build',
  // Common survey fillers
  'quite', 'rather', 'somewhat', 'fairly', 'pretty', 'even', 'often',
  'never', 'always', 'sometimes', 'still', 'already', 'yet', 'again',
  'however', 'therefore', 'perhaps', 'maybe', 'usually', 'generally',
  'currently', 'recently', 'actually', 'basically', 'simply', 'mostly',
  'mainly', 'certainly', 'especially', 'particularly', 'further',
  'overall', 'together', 'back', 'both', 'each', 'few', 'most',
  'such', 'nor', 'own', 'same', 'because', 'while', 'although',
  'though', 'unless', 'where', 'whether',
]);

// ─── Sentiment Word Lists ─────────────────────────────────────────────────────

const SENTIMENT_POSITIVE = new Set([
  'engaged', 'motivated', 'collaborative', 'supportive', 'transparent',
  'innovative', 'clear', 'efficient', 'trusted', 'empowered', 'valued',
  'inclusive', 'aligned', 'growth', 'improvement', 'positive', 'excellent',
  'strong', 'productive', 'committed', 'enthusiastic', 'proactive',
  'responsive', 'trust', 'teamwork', 'leadership', 'communication',
  'clarity', 'purpose', 'belonging', 'recognition', 'autonomy',
  'flexibility', 'progress', 'culture', 'wellbeing', 'impact',
  'meaningful', 'success', 'celebrate', 'appreciate', 'respect', 'open',
  'honest', 'safe', 'forward', 'excited', 'inspired', 'thriving',
  'connected', 'energized', 'purposeful', 'recognized', 'understood',
  'empathy', 'agile', 'diverse', 'learning', 'accessible', 'cohesive',
  'effective', 'organized', 'focused', 'balanced', 'healthy',
]);

const SENTIMENT_NEGATIVE = new Set([
  'confused', 'unclear', 'disconnected', 'isolated', 'frustrated',
  'stressed', 'overwhelmed', 'unsupported', 'ignored', 'micromanaged',
  'siloed', 'inefficient', 'inconsistent', 'poor', 'lack', 'missing',
  'failed', 'difficult', 'challenging', 'problematic', 'burnout',
  'pressure', 'conflict', 'distrust', 'miscommunication', 'disorganized',
  'unfair', 'reactive', 'negative', 'broken', 'toxic', 'blame', 'fear',
  'anxiety', 'uncertainty', 'exhausted', 'disengaged', 'demotivated',
  'undervalued', 'invisible', 'bureaucratic', 'unhealthy', 'dysfunctional',
  'struggling', 'failing', 'lacking', 'lost', 'excluded', 'marginalized',
  'alienated', 'undermined', 'overworked', 'underpaid', 'chaotic',
  'vague', 'slow', 'stuck', 'resistant', 'rigid', 'wasteful',
  'redundant', 'unheard',
]);

// ─── Exported Types ───────────────────────────────────────────────────────────

/** A single open-ended dialogue entry with its optional dimension association. */
export interface DialogueEntry {
  text: string;
  dimensionId: string | null;
}

/** A keyword record ready for persistence to `dialogue_keywords`. */
export interface KeywordRecord {
  /** null = cross-dimension "overall" group. */
  dimensionId: string | null;
  keyword: string;
  frequency: number;
  sentiment: 'positive' | 'negative' | 'neutral';
}

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Tokenise a text string into filtered lowercase words.
 *
 * @param text - Raw response text to tokenise.
 * @returns Array of lowercase tokens with stop words and short tokens removed.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
}

/**
 * Classify a keyword's sentiment using curated positive and negative word lists.
 *
 * @param keyword - Lowercase keyword token to classify.
 * @returns The sentiment label for the keyword.
 */
export function classifySentiment(keyword: string): 'positive' | 'negative' | 'neutral' {
  if (SENTIMENT_POSITIVE.has(keyword)) return 'positive';
  if (SENTIMENT_NEGATIVE.has(keyword)) return 'negative';
  return 'neutral';
}

/**
 * Extract keywords from open-ended dialogue entries.
 *
 * Groups entries by dimensionId, counts word frequencies within each group,
 * and also computes an overall (dimensionId = null) group across all entries.
 * Returns top {@link MAX_KEYWORDS_PER_GROUP} per group, filtered to
 * {@link MIN_FREQUENCY}.
 *
 * @param entries - Dialogue entries to process.
 * @returns Flat array of keyword records across all groups (dimension + overall).
 */
export function extractKeywords(entries: DialogueEntry[]): KeywordRecord[] {
  // dimensionId (or the sentinel '__overall__') → keyword → count
  const groups = new Map<string, Map<string, number>>();
  const overallKey = '__overall__';

  for (const entry of entries) {
    const dimKey = entry.dimensionId ?? overallKey;
    if (!groups.has(dimKey)) groups.set(dimKey, new Map());
    if (!groups.has(overallKey)) groups.set(overallKey, new Map());

    const dimMap = groups.get(dimKey)!;
    const overallMap = groups.get(overallKey)!;

    for (const word of tokenize(entry.text)) {
      dimMap.set(word, (dimMap.get(word) ?? 0) + 1);
      if (dimKey !== overallKey) {
        overallMap.set(word, (overallMap.get(word) ?? 0) + 1);
      }
    }
  }

  const result: KeywordRecord[] = [];

  for (const [groupKey, wordMap] of groups) {
    const dimensionId = groupKey === overallKey ? null : groupKey;

    const topKeywords = Array.from(wordMap.entries())
      .filter(([, count]) => count >= MIN_FREQUENCY)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_KEYWORDS_PER_GROUP);

    for (const [keyword, frequency] of topKeywords) {
      result.push({
        dimensionId,
        keyword,
        frequency,
        sentiment: classifySentiment(keyword),
      });
    }
  }

  return result;
}
