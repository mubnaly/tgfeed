import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

export function useItemSummary(itemKey: string, initialSummary?: string | null) {
  const { t } = useI18n();
  const [summary, setSummary] = useState<string | null>(initialSummary || null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSummary, setShowSummary] = useState(Boolean(initialSummary));
  const [summaryCached, setSummaryCached] = useState(Boolean(initialSummary));
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const toggleOrSummarize = async (fallback?: { title?: string | null; text?: string | null }) => {
    if (summary) {
      setShowSummary((prev) => !prev);
      return;
    }
    const hasContent = Boolean(fallback?.title?.trim() || fallback?.text?.trim());
    if (!hasContent) {
      setSummaryError(t('summary.noText'));
      setShowSummary(true);
      return;
    }
    setIsSummarizing(true);
    setSummaryError(null);
    setShowSummary(true);

    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: itemKey,
          title: fallback?.title || undefined,
          text: fallback?.text || undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSummary(data.summary);
      setSummaryCached(Boolean(data.cached));
    } catch {
      setSummaryError(t('summary.error'));
    } finally {
      setIsSummarizing(false);
    }
  };

  return {
    summary,
    isSummarizing,
    showSummary,
    summaryCached,
    summaryError,
    toggleOrSummarize,
  };
}

export function AiSummaryButton({
  onClick,
  active,
  loading,
  title,
  className,
}: {
  onClick: () => void;
  active: boolean;
  loading: boolean;
  title: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title={title}
      aria-label={title}
      className={cn(
        'relative cursor-pointer rounded p-1 transition-colors',
        active
          ? 'text-emerald-500 hover:bg-emerald-500/10'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        className,
      )}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin text-emerald-500" />
      ) : (
        <Sparkles className={cn('size-4', active && 'fill-emerald-500/20 text-emerald-500')} />
      )}
    </button>
  );
}

export function SummaryBox({
  show,
  isSummarizing,
  summary,
  cached,
  error,
  className,
}: {
  show: boolean;
  isSummarizing: boolean;
  summary: string | null;
  cached: boolean;
  error: string | null;
  className?: string;
}) {
  const { t } = useI18n();
  if (!show) return null;

  return (
    <div
      className={cn(
        'mt-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs dark:border-emerald-500/20 dark:bg-emerald-950/25 transition-all',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5">
        <Sparkles className="size-3.5" />
        <span>{t('summary.title')}</span>
        {cached && (
          <span className="ms-auto text-[10px] text-muted-foreground font-normal bg-muted/60 px-1.5 py-0.5 rounded">
            {t('summary.cached')}
          </span>
        )}
      </div>
      {isSummarizing ? (
        <div className="flex items-center gap-2 text-muted-foreground py-1">
          <Loader2 className="size-3.5 animate-spin text-emerald-500" />
          <span>{t('summary.loading')}</span>
        </div>
      ) : error ? (
        <p className="text-destructive">{error}</p>
      ) : (
        <p dir="auto" className="leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {summary}
        </p>
      )}
    </div>
  );
}
