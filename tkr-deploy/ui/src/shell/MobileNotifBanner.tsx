/**
 * MobileNotifBanner — lock-screen-style notification for the mobile homepage.
 *
 * Renders the "is my push green?" headline notification: glyph + title +
 * description + relative timestamp. Visually styled to evoke an iOS lock-
 * screen banner, using the elevated surface tier for separation from the
 * page canvas.
 *
 * @module shell/MobileNotifBanner
 */

import type { JSX } from 'preact';

export interface MobileNotifBannerProps {
  /** Headline — e.g. "Run #447 started" or "Run #446 failed". */
  title: string;
  /** Sub-line — e.g. commit message. */
  description?: string;
  /** Relative time — e.g. "now", "1m", "5m ago". */
  time?: string;
  /** Single-character glyph for the leading square (default ▶). */
  glyph?: string;
}

export function MobileNotifBanner(props: MobileNotifBannerProps): JSX.Element {
  const { title, description, time, glyph = '▶' } = props;
  return (
    <aside class="mob-notif" role="status" aria-live="polite">
      <span class="mob-notif__glyph" aria-hidden="true">{glyph}</span>
      <div class="mob-notif__body">
        <p class="mob-notif__title">{title}</p>
        {description !== undefined && (
          <p class="mob-notif__desc">{description}</p>
        )}
      </div>
      {time !== undefined && <span class="mob-notif__time">{time}</span>}
    </aside>
  );
}
