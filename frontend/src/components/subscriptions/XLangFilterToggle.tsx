import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Languages } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useAppMeta } from '@/hooks/useAppMeta';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

/** PATCH For You's `config.lang_filter` (the global language list lives in Settings). */
export function useSetXLangFilter(feed: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (langFilter: boolean) => api.xSetConfig(feed, { lang_filter: langFilter }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['x-subscriptions'] }),
    onError: (e) => toast.error(errorMessage(e, 'Failed to update language filter')),
  });
}

/** For You's global language filter toggle, sitting beside `XAggregateMenu`.
 *
 *  The language list itself is a global preference (Settings → Language); this switch
 *  only says "For You obeys it". Filtering happens at ingest — a tweet outside the
 *  list is never archived — so flipping it changes future pushes, not history.
 *  With the switch on but no languages picked the filter is inert (fail-open),
 *  which is why that state gets a visible hint instead of silently doing nothing. */
export function XLangFilterToggle({ feed, enabled }: { feed: string; enabled: boolean }) {
  const meta = useAppMeta();
  const setFilter = useSetXLangFilter(feed);
  const languages = meta.data?.languages ?? [];
  const needsLanguages = enabled && languages.length === 0;
  const title = enabled
    ? needsLanguages
      ? 'Filter by global languages: ON — Select languages in Settings first'
      : `Filter by global languages: ON (${languages.join(', ')})`
    : 'Filter by global languages: OFF — All tweets admitted';

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'h-8 gap-1 px-2 text-xs',
        enabled ? (needsLanguages ? 'text-amber-600 dark:text-amber-500' : 'text-foreground') : 'text-muted-foreground',
      )}
      disabled={setFilter.isPending}
      aria-pressed={enabled}
      title={title}
      onClick={() => setFilter.mutate(!enabled)}
    >
      <Languages className="size-3.5" />
      {enabled ? (needsLanguages ? 'Select languages in Settings' : 'Filter by language') : 'Language filter off'}
    </Button>
  );
}
