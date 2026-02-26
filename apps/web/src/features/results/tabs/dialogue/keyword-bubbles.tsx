/**
 * Keyword bubble cloud — renders keyword spans sized proportionally to frequency.
 * Click a bubble to filter responses containing that keyword.
 * Max 30 keywords displayed, font size scaled between 14px and 40px.
 */

import { useMemo, type ReactElement } from 'react';

/** Single keyword with its occurrence count. */
export interface Keyword {
  text: string;
  count: number;
}

interface KeywordBubblesProps {
  keywords: Keyword[];
  activeKeyword: string | null;
  onKeywordClick: (keyword: string | null) => void;
}

const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 40;
const MAX_KEYWORDS = 30;

/** Keyword bubble cloud sized by frequency. */
export function KeywordBubbles({
  keywords,
  activeKeyword,
  onKeywordClick,
}: KeywordBubblesProps): ReactElement {
  const displayed = useMemo(() => {
    const sorted = [...keywords].sort((a, b) => b.count - a.count);
    return sorted.slice(0, MAX_KEYWORDS);
  }, [keywords]);

  const { minCount, maxCount } = useMemo(() => {
    if (displayed.length === 0) return { minCount: 0, maxCount: 0 };
    const counts = displayed.map((k) => k.count);
    return { minCount: Math.min(...counts), maxCount: Math.max(...counts) };
  }, [displayed]);

  function getFontSize(count: number): number {
    if (maxCount === minCount) return (MIN_FONT_SIZE + MAX_FONT_SIZE) / 2;
    const ratio = (count - minCount) / (maxCount - minCount);
    return MIN_FONT_SIZE + ratio * (MAX_FONT_SIZE - MIN_FONT_SIZE);
  }

  if (displayed.length === 0) return <div />;

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Keyword filters">
      {displayed.map((keyword) => {
        const isActive = activeKeyword === keyword.text;
        return (
          <button
            key={keyword.text}
            type="button"
            role="button"
            aria-label={`Filter by ${keyword.text}, mentioned ${keyword.count} times`}
            aria-pressed={isActive}
            onClick={() => onKeywordClick(isActive ? null : keyword.text)}
            className={`inline-block cursor-pointer rounded-full px-3 py-1 transition-colors ${
              isActive
                ? 'bg-[#424242] text-white'
                : 'bg-[#F5F5F5] text-[#424242] hover:bg-[#E5E4E0]'
            }`}
            style={{ fontSize: `${getFontSize(keyword.count)}px` }}
          >
            {keyword.text}
          </button>
        );
      })}
    </div>
  );
}
