import {
  createContext,
  useContext,
  useState,
  useCallback,
  useId,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Info } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  InfoPanelGroup — context provider for accordion behavior                  */
/* -------------------------------------------------------------------------- */

interface InfoPanelGroupContextValue {
  openId: string | null;
  toggle: (id: string) => void;
}

const InfoPanelGroupContext = createContext<InfoPanelGroupContextValue | null>(null);

interface InfoPanelGroupProps {
  children: ReactNode;
}

/**
 * Wraps multiple InfoPanel components so only one is open at a time.
 * Opening one automatically closes any other within the same group.
 */
export function InfoPanelGroup({ children }: InfoPanelGroupProps): ReactElement {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = useCallback((id: string): void => {
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <InfoPanelGroupContext.Provider value={{ openId, toggle }}>
      {children}
    </InfoPanelGroupContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  InfoPanel — collapsible (i) icon explanation                              */
/* -------------------------------------------------------------------------- */

interface InfoPanelProps {
  id: string;
  title: string;
  content: ReactNode;
  defaultOpen?: boolean;
}

/**
 * (i) icon that expands an inline explanation below it.
 * When used inside an InfoPanelGroup, only one panel may be open at a time.
 */
export function InfoPanel({ id, title, content, defaultOpen = false }: InfoPanelProps): ReactElement {
  const group = useContext(InfoPanelGroupContext);
  const [localOpen, setLocalOpen] = useState(defaultOpen);

  const isOpen = group !== null ? group.openId === id : localOpen;

  const handleToggle = (): void => {
    if (group !== null) {
      group.toggle(id);
    } else {
      setLocalOpen((prev) => !prev);
    }
  };

  const contentId = useId();
  const titleId = `${id}-title`;

  return (
    <div>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={handleToggle}
        className="inline-flex items-center gap-1 text-[#9E9E9E] hover:text-[#757575]"
      >
        <Info size={16} aria-hidden="true" />
        <span className="sr-only">{isOpen ? `Collapse ${title}` : `Expand ${title}`}</span>
      </button>

      {isOpen && (
        <div
          id={contentId}
          role="region"
          aria-labelledby={titleId}
          className="mt-2 rounded-md bg-[#F5F5F5] p-4 text-sm text-[#424242]"
        >
          <p id={titleId} className="font-semibold">
            {title}
          </p>
          <div className="mt-1">{content}</div>
        </div>
      )}
    </div>
  );
}
