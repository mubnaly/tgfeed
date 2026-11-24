// The full-info block at the top of the item detail pane: a label/value list of
// everything known about the item (channel/author, timestamps, ranks, ids).
import { type ReactNode } from 'react';

import { ChannelAvatar } from '@/components/ChannelAvatar';
import { HnGlyph } from '@/components/HnGlyph';
import { RssGlyph } from '@/components/RssGlyph';
import { XAvatar } from '@/components/XAvatar';
import { useI18n } from '@/i18n';
import { channelName, compactNumber, fullDateLabel } from '@/lib/format';
import { FEEDBACK_REASON_LABELS, hnCommentsUrl, rssFeedLabel, xProfileUrl, X_FORYOU_FEED } from '@/lib/sources';
import type { Subscription, TimelineItem } from '@/lib/types';
import { hnLinkAttrs } from '@/lib/vibeReader';

import { XVerdictDetail } from './XVerdictDetail';

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <dt className="w-20 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-foreground/90">{children}</dd>
    </div>
  );
}

interface Props {
  item: TimelineItem;
  /** The item's TG subscription row, when one is loaded (resolves the channel name). */
  sub?: Subscription | null;
}

/** Source-dispatched detail list for the open item. */
export function ItemDetailInfo({ item, sub }: Props) {
  const { t } = useI18n();
  const msg = item.telegram;
  const hn = item.hn;
  const tweet = item.x;
  const rss = item.rss;

  if (msg) {
    const fwd = msg.forward_info;
    const fwdName = fwd?.from_channel_name || fwd?.from_user_name || fwd?.post_author || null;
    const title = sub ? channelName(sub) : channelName(msg.channel);
    return (
      <dl className="space-y-1.5">
        <DetailRow label={t('detail.channel')}>
          <span className="inline-flex items-center gap-1.5">
            <ChannelAvatar channelId={msg.channel_id} name={title} className="size-4 text-[8px]" />
            <span>{title}</span>
            {sub?.username && <span className="text-muted-foreground">@{sub.username}</span>}
          </span>
        </DetailRow>
        {msg.sender_name && <DetailRow label={t('detail.author')}>{msg.sender_name}</DetailRow>}
        <DetailRow label={t('detail.publishedAt')}>{fullDateLabel(msg.date)}</DetailRow>
        {msg.is_edited && msg.edit_date && <DetailRow label={t('detail.editedAt')}>{fullDateLabel(msg.edit_date)}</DetailRow>}
        {msg.is_forwarded && (
          <DetailRow label={t('detail.forwardedFrom')}>
            {fwdName ?? t('detail.unknownSource')}
            {fwd?.original_date && <span className="text-muted-foreground"> · {fullDateLabel(fwd.original_date)}</span>}
          </DetailRow>
        )}
        {msg.media_items.length > 0 && (
          <DetailRow label={t('detail.media')}>{t('detail.mediaCount', { count: msg.media_items.length })}</DetailRow>
        )}
        <DetailRow label="ID">{item.key}</DetailRow>
      </dl>
    );
  }

  if (tweet) {
    const m = tweet.metrics;
    return (
      <dl className="space-y-1.5">
        <DetailRow label={t('detail.author')}>
          <span className="inline-flex items-center gap-1.5">
            <XAvatar handle={tweet.author_handle} name={tweet.author_name} className="size-4 text-[8px]" />
            <span>{tweet.author_name ?? t('common.unknown')}</span>
            {tweet.author_handle && (
              <a
                href={xProfileUrl(tweet.author_handle)}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:underline"
              >
                @{tweet.author_handle}
              </a>
            )}
          </span>
        </DetailRow>
        <DetailRow label={t('detail.source')}>
          {tweet.feed === X_FORYOU_FEED ? 'X · For You' : `X · @${tweet.feed}`}
        </DetailRow>
        {tweet.created_at && <DetailRow label={t('detail.publishedAt')}>{fullDateLabel(tweet.created_at)}</DetailRow>}
        <DetailRow label="Indexed">{fullDateLabel(tweet.first_seen_at)}</DetailRow>
        {m && (
          <DetailRow label="Engagement">
            {compactNumber(m.like_count)} Likes · {compactNumber(m.retweet_count)} Reposts · {compactNumber(m.reply_count)} Replies
          </DetailRow>
        )}
        {tweet.rt_of_handle && <DetailRow label="Repost of">@{tweet.rt_of_handle}</DetailRow>}
        {tweet.quote && <DetailRow label="Quote">@{tweet.quote.author_handle ?? t('common.unknown')}</DetailRow>}
        {tweet.reply_to_id && <DetailRow label="Reply">This tweet is a reply</DetailRow>}
        {tweet.media && tweet.media.length > 0 && (
          <DetailRow label={t('detail.media')}>{t('detail.mediaCount', { count: tweet.media.length })}</DetailRow>
        )}
        {item.feedback && (
          <DetailRow label="Feedback">
            {item.feedback === 'up' ? 'Like' : 'Dislike'}
            {item.feedback_reason && ` · ${FEEDBACK_REASON_LABELS[item.feedback_reason]}`}
          </DetailRow>
        )}
        {tweet.verdict && (
          <DetailRow label="Verdict">
            <XVerdictDetail verdict={tweet.verdict} meta={tweet.verdict_meta} />
          </DetailRow>
        )}
        <DetailRow label="ID">{item.key}</DetailRow>
      </dl>
    );
  }

  if (rss) {
    return (
      <dl className="space-y-1.5">
        <DetailRow label={t('detail.feed')}>
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <RssGlyph className="size-4" />
            <span className="truncate">{rssFeedLabel(rss.feed_url, rss.feed_title)}</span>
          </span>
        </DetailRow>
        {rss.author && <DetailRow label={t('detail.author')}>{rss.author}</DetailRow>}
        {rss.published_at && <DetailRow label={t('detail.publishedAt')}>{fullDateLabel(rss.published_at)}</DetailRow>}
        <DetailRow label="Indexed">{fullDateLabel(rss.first_seen_at)}</DetailRow>
        {rss.published_at && rss.published_at !== item.datetime && (
          <DetailRow label="Ordered">
            {fullDateLabel(item.datetime)}
            <span className="text-muted-foreground"> · Sorted by indexed time</span>
          </DetailRow>
        )}
        <DetailRow label="Feed">
          <span className="break-all text-muted-foreground">{rss.feed_url}</span>
        </DetailRow>
        <DetailRow label="ID">{item.key}</DetailRow>
      </dl>
    );
  }

  if (!hn) return null;
  return (
    <dl className="space-y-1.5">
      <DetailRow label={t('detail.source')}>
        <span className="inline-flex items-center gap-1.5">
          <HnGlyph className="size-4 text-[8px]" />
          <span>Hacker News</span>
          {hn.type === 'job' && <span className="text-muted-foreground">(Job)</span>}
        </span>
      </DetailRow>
      {hn.author && <DetailRow label={t('detail.author')}>{hn.author}</DetailRow>}
      {hn.submitted_at && <DetailRow label="Submitted">{fullDateLabel(hn.submitted_at)}</DetailRow>}
      <DetailRow label="Front page">{fullDateLabel(hn.first_seen_at)}</DetailRow>
      {hn.qualified_at && <DetailRow label="Admitted">{fullDateLabel(hn.qualified_at)}</DetailRow>}
      <DetailRow label={t('detail.score')}>
        {hn.score} points ·{' '}
        <a
          href={hnCommentsUrl(hn.id)}
          target="_blank"
          rel="noreferrer"
          {...hnLinkAttrs(hn)}
          className="hover:underline"
        >
          {hn.comments_count} comments
        </a>
      </DetailRow>
      {(hn.day_rank != null || hn.peak_rank != null) && (
        <DetailRow label="Rank">
          {hn.day_rank != null && <span>Day #{hn.day_rank}</span>}
          {hn.day_rank != null && hn.peak_rank != null && <span aria-hidden> · </span>}
          {hn.peak_rank != null && <span>Peak #{hn.peak_rank}</span>}
        </DetailRow>
      )}
      {hn.domain && <DetailRow label="Domain">{hn.domain}</DetailRow>}
      <DetailRow label="ID">{item.key}</DetailRow>
    </dl>
  );
}
