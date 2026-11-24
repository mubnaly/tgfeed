import { useState } from 'react';
import { CheckCheck, History, MoreVertical, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';

import { ChannelAvatar } from '@/components/ChannelAvatar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Spinner } from '@/components/Spinner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBulkRead } from '@/hooks/useBulkRead';
import { useFetchOlder, useRefreshChannel, useResetChannel } from '@/hooks/useRefresh';
import { useDeleteSubscription, useSetSubscriptionEnabled } from '@/hooks/useSubscriptionMutations';
import { channelName } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Subscription } from '@/lib/types';

const OLDER_FETCH_COUNT = 200;

/** A single subscribed channel on the Manage channels page, with its actions menu. */
export function SubscriptionRow({ sub }: { sub: Subscription }) {
  const setEnabled = useSetSubscriptionEnabled();
  const del = useDeleteSubscription();
  const bulkRead = useBulkRead();
  const refresh = useRefreshChannel();
  const fetchOlder = useFetchOlder();
  const reset = useResetChannel();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const label = channelName(sub);
  // These all pull synchronously and can take a few seconds, so reflect progress on the row.
  const fetching = refresh.isPending || fetchOlder.isPending || reset.isPending;

  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <ChannelAvatar channelId={sub.channel_id} name={label} />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{label}</div>
        {sub.username && <div className="truncate text-xs text-muted-foreground">@{sub.username}</div>}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {fetching && <Spinner className="size-3.5 text-muted-foreground" />}
        {!sub.backfill_done && <span className="text-xs text-amber-500">backfilling…</span>}
        <Tooltip>
          <TooltipTrigger asChild>
            {/* Wrap in a span so the Trigger's data-state lands here, not on the Switch
                (the Switch's bg color is driven by its own data-[state=checked/unchecked]). */}
            <span className="inline-flex">
              <Switch
                checked={sub.enabled}
                onCheckedChange={(enabled) => setEnabled.mutate({ channelId: sub.channel_id, enabled })}
                aria-label={sub.enabled ? 'Disable channel' : 'Enable channel'}
              />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {sub.enabled ? (
              <>
                Enabled: real-time sync, shown in timeline.
                <br />
                Click to pause (history preserved).
              </>
            ) : (
              <>
                Paused: sync stopped, hidden from timeline.
                <br />
                Click to resume sync.
              </>
            )}
          </TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label="Channel actions">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={fetching} onClick={() => refresh.mutate(sub.channel_id)}>
              <RefreshCw className={cn(refresh.isPending && 'animate-spin')} />
              Refresh channel
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={fetching}
              onClick={() => fetchOlder.mutate({ channelId: sub.channel_id, count: OLDER_FETCH_COUNT })}
            >
              <History />
              Fetch older ({OLDER_FETCH_COUNT} messages)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => bulkRead.mutate({ channel_id: sub.channel_id })}>
              <CheckCheck />
              Mark all read
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" disabled={fetching} onClick={() => setResetConfirmOpen(true)}>
              <RotateCcw />
              Reset data
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
              <Trash2 />
              Unsubscribe
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Unsubscribe from ${label}?`}
        description="Already-fetched messages are kept; the channel stops syncing and leaves your timeline. Saved items are never affected."
        destructive
        confirmLabel="Unsubscribe"
        pending={del.isPending}
        onConfirm={() => del.mutate(sub.channel_id, { onSuccess: () => setConfirmOpen(false) })}
      />
      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title={`Reset data for ${label}?`}
        description="Deletes cached messages and read states for this channel, then re-syncs. Saved items and keyword filters remain intact. This action cannot be undone."
        destructive
        confirmLabel="Reset data"
        pending={reset.isPending}
        onConfirm={() => reset.mutate(sub.channel_id, { onSuccess: () => setResetConfirmOpen(false) })}
      />
    </li>
  );
}
