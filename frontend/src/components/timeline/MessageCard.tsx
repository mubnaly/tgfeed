import { memo, useCallback, useMemo, useState } from 'react';
import { Bookmark, Forward } from 'lucide-react';

import { ChannelAvatar } from '@/components/ChannelAvatar';
import { useSaveToggle } from '@/hooks/useSaveToggle';
import { fullDateLabel, timeLabel } from '@/lib/format';
import { extractUrls } from '@/lib/extractUrls';
import { linkify } from '@/lib/linkify';
import { useItemDetailPane } from '@/lib/itemDetailPane';
import { useUnreadIndicator } from '@/lib/unreadIndicator';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import type { DisplayMessage, ReadTarget, TimelineItem } from '@/lib/types';

import { AnnotationBadge } from './AnnotationBadge';
import { ForwardedBadge } from './ForwardedBadge';
import { VibeReaderBadge } from './VibeReaderBadge';
import { MessageMedia } from './MessageMedia';
import { WebPagePreview } from './WebPagePreview';
import { AiSummaryButton, SummaryBox, useItemSummary } from './AiSummaryAction';

interface Props {
  /** Envelope with `telegram` present; read/saved flags live here, payload in `item.telegram`. */
  item: TimelineItem;
  channelLabel: string;
  /** Attach for scroll-past-to-read; omit in the saved view. Returns a ref cleanup. */
  observe?: (el: Element | null, target: ReadTarget) => (() => void) | void;
  /** Keys judged read but awaiting server confirmation (green "syncing" state). */
  pendingKeys?: Set<string>;
}

function forwardSourceName(msg: DisplayMessage): string | null {
  if (!msg.is_forwarded) return null;
  const f = msg.forward_info;
  return f?.from_channel_name || f?.from_user_name || f?.post_author || null;
}

function getTruncatedText(text: string, maxLen = 280, maxLines = 4): { isLong: boolean; preview: string } {
  if (!text) return { isLong: false, preview: '' };
  const lines = text.split('\n');
  if (lines.length > maxLines) {
    return { isLong: true, preview: lines.slice(0, maxLines).join('\n') };
  }
  if (text.length > maxLen) {
    const cut = text.lastIndexOf(' ', maxLen);
    const idx = cut > maxLen * 0.7 ? cut : maxLen;
    return { isLong: true, preview: text.slice(0, idx) };
  }
  return { isLong: false, preview: text };
}

function MessageCardImpl({ item, channelLabel, observe, pendingKeys }: Props) {
  const { t } = useI18n();
  const msg = item.telegram!;
  const save = useSaveToggle();

  const [isExpanded, setIsExpanded] = useState(false);
  const { summary, isSummarizing, showSummary, summaryCached, summaryError, toggleOrSummarize } = useItemSummary(
    item.key,
    msg.summary,
  );

  const { isLong, preview } = useMemo(() => getTruncatedText(msg.text || ''), [msg.text]);

  const handleSummaryClick = () => {
    toggleOrSummarize({
      text: msg.text || msg.webpage?.description || msg.webpage?.title || null,
    });
  };

  // Every link the text carries (the same set `linkify` renders) + the preview's,
  // for the Vibe Reader badge.
  const vrUrls = useMemo(() => {
    const urls = extractUrls(msg.text);
    if (msg.webpage?.url && !urls.includes(msg.webpage.url)) urls.push(msg.webpage.url);
    return urls;
  }, [msg.text, msg.webpage?.url]);
  const { mode } = useUnreadIndicator();
  const { open, openPane } = useItemDetailPane();
  const fwdName = forwardSourceName(msg);

  const isActive = open?.key === item.key;
  // Three read states: pending (judged read, sync unconfirmed) > unread > read.
  const isPending = pendingKeys?.has(item.key) ?? false;

  const attach = useCallback(
    (el: HTMLElement | null) => {
      if (observe && el && !item.is_read) return observe(el, { key: item.key, channelId: msg.channel_id });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [observe, item.is_read, item.key, msg.channel_id],
  );

  // Text + media + webpage; reused inside the forward box or rendered bare otherwise.
  const body = (
    <>
      <SummaryBox
        show={showSummary}
        isSummarizing={isSummarizing}
        summary={summary}
        cached={summaryCached}
        error={summaryError}
      />
      {msg.text && (
        <div dir="auto" className="mt-1 text-sm leading-relaxed whitespace-pre-wrap break-words">
          {linkify(isExpanded || !isLong ? msg.text : `${preview}… `)}
          {isLong && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="cursor-pointer font-medium text-emerald-600 hover:underline dark:text-emerald-400 ms-1 inline-block"
            >
              {isExpanded ? t('common.less') : t('common.more')}
            </button>
          )}
        </div>
      )}
      <MessageMedia channelId={msg.channel_id} items={msg.media_items} />
      {msg.webpage && <WebPagePreview channelId={msg.channel_id} messageId={msg.id} webpage={msg.webpage} />}
    </>
  );

  return (
    <article
      ref={attach}
      data-read={item.is_read ? '' : undefined}
      className={cn(
        'group relative border-b px-4 py-3 transition-colors duration-500 sm:px-5',
        mode !== 'divider'
          ? 'border-border/50'
          : isPending
            ? 'border-emerald-500 dark:border-emerald-400'
            : !item.is_read
              ? 'border-sky-500 dark:border-sky-400'
              : 'border-border/50',
        isActive && 'bg-muted/40',
      )}
    >
      <header className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="relative flex items-center gap-2">
          {mode === 'dot' && (
            <span
              aria-hidden
              className={cn(
                'absolute top-1/2 end-full me-1.5 size-2 -translate-y-1/2 rounded-full transition-colors duration-500',
                isPending ? 'bg-emerald-500 dark:bg-emerald-400' : !item.is_read && 'bg-sky-500 dark:bg-sky-400',
              )}
            />
          )}
          <ChannelAvatar channelId={msg.channel_id} name={channelLabel} className="size-5 text-[10px]" />
          <span className="font-medium text-foreground/80">{channelLabel}</span>
        </div>
        <span aria-hidden>·</span>
        <button
          type="button"
          onClick={() => openPane(item)}
          title={fullDateLabel(msg.date)}
          aria-label="Open message details"
          className="cursor-pointer rounded underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          <time>{timeLabel(msg.date)}</time>
        </button>
        <ForwardedBadge item={item} />
        <AnnotationBadge item={item} />
        <VibeReaderBadge urls={vrUrls} />
        <AiSummaryButton
          onClick={handleSummaryClick}
          active={Boolean(summary || showSummary)}
          loading={isSummarizing}
          title={summary ? t('summary.title') : t('summary.btn')}
          className="ms-auto"
        />
        <button
          type="button"
          onClick={() => save.mutate({ key: item.key, saved: !item.is_saved })}
          aria-label={item.is_saved ? 'Remove from saved' : 'Save'}
          aria-pressed={item.is_saved}
          className={cn(
            'rounded p-1 transition-colors hover:bg-accent hover:text-accent-foreground',
            item.is_saved ? 'text-amber-500' : 'text-muted-foreground',
          )}
        >
          <Bookmark className={cn('size-4', item.is_saved && 'fill-current')} />
        </button>
      </header>

      {msg.is_forwarded ? (
        <>
          <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground/80">
            <Forward className="size-3" />
            Forwarded
          </div>
          <div className="mt-1 rounded-lg border bg-muted/30 p-3">
            {fwdName && <div className="text-xs font-medium text-foreground/80">{fwdName}</div>}
            {body}
          </div>
        </>
      ) : (
        body
      )}
    </article>
  );
}

export const MessageCard = memo(MessageCardImpl);
