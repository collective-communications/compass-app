import type { ReactElement, ReactNode } from 'react';

interface BaseLayoutProps {
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function BaseLayout({ header, children, footer, className }: BaseLayoutProps): ReactElement {
  return (
    <div className={`flex min-h-screen flex-col ${className ?? ''}`}>
      <header className="sticky top-0 z-10 border-b border-[var(--grey-300)] bg-white">
        {header}
      </header>
      <main className="flex flex-1 flex-col">
        {children}
      </main>
      {footer && (
        <footer className="border-t border-[var(--grey-300)] bg-white">
          {footer}
        </footer>
      )}
    </div>
  );
}
