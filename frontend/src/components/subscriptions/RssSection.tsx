import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Spinner } from '@/components/Spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, errorMessage } from '@/lib/api';
import { fullDateLabel } from '@/lib/format';
import type { RssStatus, RssSubscription } from '@/lib/types';

import { RssSubscriptionRow } from './RssSubscriptionRow';

/** How often the subscription list re-polls: fast while a feed still has no verdict,
 *  slow once they all have one.
 *
 *  A round finishes seconds after an import and minutes after that on its own
 *  schedule, and the fetch state each row shows (title, last fetch, error streak) is
 *  written by that round — without the fast phase the rows sit on "waiting for the
 *  first fetch" until the reader reloads, which reads as a feed that never ran.
 *
 *  "No verdict yet" is all three fields, not just `fetched_at`. A failed round leaves
 *  `fetched_at` NULL on purpose (it means "last time we actually saw this feed"), so
 *  a permanently broken feed used to keep the page at 5s forever — the 10 dead feeds
 *  in a 77-feed import did exactly that on 2026-08-22. A feed paused before its first
 *  round is the same bug through a second door: nothing will ever fetch it. */
export function rssRefetchInterval(subs: RssSubscription[] | undefined): number {
  const undecided = (subs ?? []).some((s) => s.enabled && !s.fetched_at && s.error_count === 0);
  return undecided ? 5_000 : 60_000;
}

/** The row order: abnormal feeds first, then merely failing ones, everything else
 *  left as the server sent it (`added_at desc`).
 *
 *  A dead feed is never unsubscribed or paused automatically — that is still the
 *  reader's call — but since 2026-09-16 the server backs it off (toward weekly) and
 *  marks it abnormal past a streak, so the top tier is the to-do list proper and the
 *  second is "retrying on its own, watch". In a 77-row list the broken ones are
 *  otherwise scattered and the reader has to read every row to find them. A paused
 *  feed keeps its tier (`error_count` does not reset) — "handled, still broken".
 *  Deliberately no filter and no group heading: another control is another piece of
 *  state to keep.
 *
 *  Stable by contract, not by accident: the list refetches while the page is open, and
 *  an order that reshuffles on every round moves the switch the reader is reaching for. */
export function sortRssSubscriptions(subs: RssSubscription[]): RssSubscription[] {
  const tier = (s: RssSubscription) => (s.abnormal ? 0 : s.error_count > 0 ? 1 : 2);
  return [...subs].sort((a, b) => tier(a) - tier(b));
}

/** The RSS tab on the Subscriptions page: add a feed by URL, bulk-import an OPML
 *  export, pause or drop a feed, and see whether polling is actually running.
 *
 *  The OPML file is read **in the browser** and posted as text — the server parses
 *  the same string a manual add would produce a URL from, so an import cannot create
 *  a subscription that typing one could not. */
export function RssSection() {
  const qc = useQueryClient();
  const { data: status } = useQuery({ queryKey: ['rss-status'], queryFn: api.rssStatus, refetchInterval: 60_000 });
  // Both queries poll — the status line and the rows are both written by a round
  // that lands after the page is already open (see rssRefetchInterval).
  const { data: subs, isPending } = useQuery({
    queryKey: ['rss-subscriptions'],
    queryFn: api.listRssSubscriptions,
    refetchInterval: (query) => rssRefetchInterval(query.state.data),
  });
  const [url, setUrl] = useState('');
  const [pendingDelete, setPendingDelete] = useState<RssSubscription | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['rss-status'] });
    qc.invalidateQueries({ queryKey: ['rss-subscriptions'] });
    // the sidebar, the /s/rss view and the aggregate all render from these
    qc.invalidateQueries({ queryKey: ['sources'] });
    qc.invalidateQueries({ queryKey: ['timeline'] });
  };
  const subscribe = useMutation({
    mutationFn: api.rssSubscribe,
    onSuccess: (sub) => {
      setUrl('');
      toast.success(`Subscribed to ${sub.name ?? sub.url}`);
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e, 'Subscription failed')),
  });
  const importOpml = useMutation({
    mutationFn: api.rssImportOpml,
    onSuccess: (r) => {
      // All three counts, always: "added 40" alone hides that 12 were unusable.
      toast.success(`Import complete: ${r.added} added, ${r.skipped_existing} existing, ${r.invalid} invalid`);
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e, 'OPML import failed')),
  });
  const setEnabled = useMutation({
    mutationFn: ({ url: feedUrl, enabled }: { url: string; enabled: boolean }) => api.rssSetEnabled(feedUrl, enabled),
    onError: (e) => toast.error(errorMessage(e, 'Update failed')),
    onSettled: invalidate,
  });
  const refresh = useMutation({
    mutationFn: api.rssRefresh,
    onSuccess: (r) => {
      const label = r.subscription.name ?? r.subscription.url;
      if (r.ok) toast.success(`${label} fetched successfully${r.new > 0 ? ` (+${r.new} new)` : ' (no new content)'}`);
      else toast.error(`${label} failed: ${r.subscription.last_error ?? 'Unknown error'}`);
    },
    onError: (e) => toast.error(errorMessage(e, 'Fetch failed')),
    onSettled: invalidate,
  });
  const unsubscribe = useMutation({
    mutationFn: api.rssUnsubscribe,
    onSuccess: () => toast.success('Unsubscribed — archived entries preserved'),
    onError: (e) => toast.error(errorMessage(e, 'Unsubscribe failed')),
    onSettled: invalidate,
  });

  const disabled = !status?.source_enabled;
  const rows = useMemo(() => sortRssSubscriptions(subs ?? []), [subs]);

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    importOpml.mutate(await file.text());
    // Let the same file be picked again after a failed import.
    if (fileInput.current) fileInput.current.value = '';
  }

  return (
    <section>
      <div className="space-y-3 border-b px-4 py-3 sm:px-5">
        <p className="text-xs text-muted-foreground">
          Standard RSS / Atom feeds, polled on a regular schedule using conditional HTTP requests.
        </p>
        {disabled && (
          <p className="text-xs text-destructive">
            RSS source is disabled on server (CONDENSER_RSS_ENABLED=false).
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (url.trim()) subscribe.mutate(url.trim());
            }}
          >
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/feed.xml"
              className="h-8 w-64"
              disabled={disabled}
              aria-label="Feed URL"
            />
            <Button type="submit" variant="outline" size="sm" disabled={!url.trim() || disabled}>
              {subscribe.isPending ? <Spinner className="size-4" /> : <Plus className="size-4" />}
              Add feed
            </Button>
          </form>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || importOpml.isPending}
            onClick={() => fileInput.current?.click()}
          >
            {importOpml.isPending ? <Spinner className="size-4" /> : <Upload className="size-4" />}
            Import OPML
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".opml,.xml,text/xml,application/xml"
            className="hidden"
            onChange={(e) => void onPickFile(e.target.files?.[0])}
          />
        </div>
      </div>

      {isPending ? (
        <div className="flex justify-center py-8">
          <Spinner className="size-5 text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">No RSS subscriptions yet.</p>
      ) : (
        <div className="divide-y">
          {rows.map((sub) => (
            <RssSubscriptionRow
              key={sub.url}
              sub={sub}
              busy={setEnabled.isPending}
              refreshing={refresh.isPending && refresh.variables === sub.url}
              onToggle={(enabled) => setEnabled.mutate({ url: sub.url, enabled })}
              onRefresh={() => refresh.mutate(sub.url)}
              onDelete={() => setPendingDelete(sub)}
            />
          ))}
        </div>
      )}

      {status && <RssStatusLine status={status} />}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Unsubscribe from this feed?"
        description="Polling will stop. Previously archived entries remain."
        destructive
        confirmLabel="Unsubscribe"
        pending={unsubscribe.isPending}
        onConfirm={() =>
          pendingDelete && unsubscribe.mutate(pendingDelete.url, { onSuccess: () => setPendingDelete(null) })
        }
      />
    </section>
  );
}

/** Polling state on one line, the summary pipeline on the next: archive size, last
 *  round, broken feeds — then whether the billed half is running and how far behind
 *  it is. The second line is the only place a reader can tell "the server never had
 *  a summary key" apart from "these entries are too short to need one". */
function RssStatusLine({ status }: { status: RssStatus }) {
  const parts: string[] = [`${status.feeds_enabled}/${status.feeds_total} feeds`, `${status.entries_total} archived`];
  if (status.last_poll_at) parts.push(`polled ${fullDateLabel(status.last_poll_at)}`);
  else parts.push('not polled yet');
  if (status.last_round) {
    parts.push(`+${status.last_round.new_entries} last round`);
    // How many requests the backoff saved this round — the number that says the
    // dead feeds have stopped costing anything.
    if (status.last_round.deferred > 0) parts.push(`${status.last_round.deferred} deferred`);
  }
  return (
    <div className="space-y-1 border-t px-4 py-3 text-xs text-muted-foreground sm:px-5">
      <div>
        {parts.join(' · ')}
        {status.feeds_error > 0 && <span className="text-destructive"> · {status.feeds_error} feeds failing</span>}
        {status.feeds_abnormal > 0 && (
          <span className="text-amber-600 dark:text-amber-500"> · {status.feeds_abnormal} degraded feeds backed off</span>
        )}
        {status.last_error && <span className="text-destructive"> · {status.last_error}</span>}
      </div>
      <RssSummaryLine summary={status.summary} />
    </div>
  );
}

/** The summary pipeline's line: off (and what it would do), or on with its backlog. */
function RssSummaryLine({ summary }: { summary: RssStatus['summary'] }) {
  if (!summary.enabled) {
    return (
      <div>
        AI summary disabled (CONDENSER_SUMMARY_API_KEY not set)
        {summary.pending > 0 && ` · ${summary.pending} articles pending`}
      </div>
    );
  }
  return (
    <div>
      {`AI summary ${summary.model} · ${summary.done} generated`}
      {summary.pending > 0 && ` · ${summary.pending} pending`}
      {summary.failed > 0 && <span className="text-amber-600 dark:text-amber-500"> · ${summary.failed} discarded</span>}
    </div>
  );
}
