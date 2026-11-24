import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, errorMessage } from '@/lib/api';
import { X_FOLLOWING_FEED } from '@/lib/sources';
import type { XAggregateMode } from '@/lib/types';

type ModeOption = { value: XAggregateMode; label: string; hint: string };

/** How much of a synthetic feed reaches the aggregate timeline.
 *
 *  For You was kept out of the main timeline entirely because it re-samples on
 *  every probe call — a firehose that would bury Telegram and HN. The verdict
 *  changes that arithmetic: only ~13% of arrivals are judged positive, which is
 *  roughly a fifth added to the aggregate rather than a flood. It stays a setting
 *  rather than a constant because the right answer depends on how good the
 *  classifier currently is, and that moves with every label.
 *
 *  Following gets the same control but not the same options: it is a stable window
 *  (~100-200/day, all from accounts you picked by hand) and it is never judged, so
 *  「只进推荐的」 would silently hide the whole feed. */
const FORYOU_MODES: ModeOption[] = [
  { value: 'none', label: 'Excluded', hint: 'View For You only in the X feed' },
  { value: 'positive', label: 'Recommended only', hint: 'Include tweets marked as Recommended into All / Unread' },
  { value: 'all', label: 'Include all', hint: 'Include entire For You feed in the main timeline' },
];

const FOLLOWING_MODES: ModeOption[] = [
  { value: 'none', label: 'Excluded', hint: 'View Following only in the X feed' },
  { value: 'all', label: 'Include all', hint: 'Include all posts from followed accounts in the main timeline' },
];

export function xAggregateModes(feed: string): ModeOption[] {
  return feed === X_FOLLOWING_FEED ? FOLLOWING_MODES : FORYOU_MODES;
}

export function xAggregateLabel(feed: string, mode: XAggregateMode): string {
  return xAggregateModes(feed).find((m) => m.value === mode)?.label ?? mode;
}

/** PATCH a feed's aggregate mode. The admitted set is query-time on the backend,
 *  so the timeline, the calendar and both unread badges all derive from it and
 *  must refetch. */
export function useSetXAggregate(feed: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mode: XAggregateMode) => api.xSetConfig(feed, { aggregate: mode }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] });
      qc.invalidateQueries({ queryKey: ['x-subscriptions'] });
      qc.invalidateQueries({ queryKey: ['timeline'] });
      qc.invalidateQueries({ queryKey: ['timeline-days'] });
    },
    onError: (e) => toast.error(errorMessage(e, 'Failed to update timeline aggregate mode')),
  });
}
