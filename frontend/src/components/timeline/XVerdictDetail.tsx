// The "why" behind a For You verdict, in the item detail pane (plan Phase 4).
import { xTweetUrl } from '@/lib/sources';
import type { XVerdict, XVerdictChannel, XVerdictMeta, XVerdictNeighbor } from '@/lib/types';

export const VERDICT_LABEL: Record<XVerdict, string> = {
  positive: 'Recommended',
  neutral: 'Neutral',
  negative: 'Likely not interested',
};

// The channels in the reader's terms. Keyed by the backend's channel letters.
export const CHANNEL_LABEL: Record<string, string> = {
  a: 'Author history',
  b: 'Topic similarity',
  c: 'Content attributes',
  d: 'Lexical style',
};

export const VOTE_LABEL: Record<XVerdict, string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
};

// The two ways the judge declines to commit.
export const REASON_LABEL: Record<string, string> = {
  out_of_domain: 'Dissimilar to previously labeled items; neutral',
  no_text: 'No evaluable text',
};

const LABEL_MARK: Record<XVerdictNeighbor['label'], string> = {
  up: '👍',
  down: '👎',
  save: '🔖',
};

function NeighborRow({ neighbor }: { neighbor: XVerdictNeighbor }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden>{LABEL_MARK[neighbor.label]}</span>
      <a
        href={xTweetUrl(neighbor.tweet_id, neighbor.handle)}
        target="_blank"
        rel="noreferrer"
        className="truncate hover:underline"
        title={`${neighbor.tweet_id} · distance ${neighbor.distance}`}
      >
        {neighbor.handle ? `@${neighbor.handle}` : neighbor.tweet_id}
      </a>
      <span className="ms-auto shrink-0 text-muted-foreground tabular-nums">{neighbor.distance.toFixed(2)}</span>
    </li>
  );
}

function evidenceLine(channel: XVerdictChannel): string | null {
  if (channel.handle) {
    return `@${channel.handle} · Disliked ${channel.down ?? 0} times, liked ${channel.up ?? 0} times`;
  }
  const pairs = channel.tokens ?? channel.flags ?? [];
  if (pairs.length === 0) return null;
  return pairs.map(([name, weight]) => `${name} ${weight > 0 ? '+' : ''}${weight.toFixed(2)}`).join(' · ');
}

function ChannelRow({ channelKey, channel }: { channelKey: string; channel: XVerdictChannel }) {
  const evidence = evidenceLine(channel);
  return (
    <li>
      <div className="flex items-center gap-2">
        <span>{CHANNEL_LABEL[channelKey] ?? channelKey}</span>
        {channel.verdict && (
          <span className={channel.verdict === 'negative' ? 'text-destructive' : 'text-muted-foreground'}>
            {VOTE_LABEL[channel.verdict]}
          </span>
        )}
        {channel.shadow && <span className="text-muted-foreground">Shadow (non-voting)</span>}
        <span className="ms-auto shrink-0 text-muted-foreground tabular-nums">{channel.score.toFixed(2)}</span>
      </div>
      {evidence && <div className="truncate text-xs text-muted-foreground">{evidence}</div>}
    </li>
  );
}

interface Props {
  verdict: XVerdict;
  meta: XVerdictMeta | null;
}

export function XVerdictDetail({ verdict, meta }: Props) {
  const neighbors = meta?.neighbors ?? [];
  const reason = meta?.reason ? REASON_LABEL[meta.reason] : null;
  const channels = Object.entries(meta?.channels ?? {});

  return (
    <div className="space-y-1">
      <div>
        {VERDICT_LABEL[verdict]}
        {typeof meta?.score === 'number' && (
          <span className="ms-1.5 text-muted-foreground tabular-nums">score {meta.score.toFixed(2)}</span>
        )}
      </div>
      {reason && <div className="text-muted-foreground">{reason}</div>}
      {neighbors.length > 0 && (
        <>
          <div className="text-muted-foreground">Evidence (nearest labeled tweets):</div>
          <ul className="space-y-0.5">
            {neighbors.map((neighbor) => (
              <NeighborRow key={neighbor.tweet_id} neighbor={neighbor} />
            ))}
          </ul>
        </>
      )}
      {channels.length > 0 && (
        <>
          <div className="text-muted-foreground">Channel votes:</div>
          <ul className="space-y-0.5">
            {channels.map(([key, channel]) => (
              <ChannelRow key={key} channelKey={key} channel={channel} />
            ))}
          </ul>
        </>
      )}
      {meta?.model && (
        <div className="text-xs text-muted-foreground">
          {meta.model}
          {meta.algo ? ` / ${meta.algo}` : ''}
        </div>
      )}
    </div>
  );
}
