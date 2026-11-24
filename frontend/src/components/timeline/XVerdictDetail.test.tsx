import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import type { XVerdictMeta } from '@/lib/types';

import { XVerdictDetail } from './XVerdictDetail';

// The single-channel shape every verdict written before step 4 has — and the shape
// production still writes with the default CONDENSER_VERDICT_CHANNELS=b.
const singleChannel: XVerdictMeta = {
  score: -0.72,
  neighbors: [
    { tweet_id: '11', distance: 0.21, label: 'down', handle: 'someone' },
    { tweet_id: '12', distance: 0.3, label: 'down' },
  ],
  model: 'text-embedding-v4@256',
  algo: 'knn-v1',
};

// The ensemble shape (plan v2 step 4): the top level still carries channel B's
// evidence for old clients, and the channels block carries every vote.
const ensemble: XVerdictMeta = {
  reason: 'out_of_domain',
  score: 0,
  neighbors: [],
  channels: {
    d: {
      verdict: 'negative',
      score: -0.81,
      tokens: [
        ['save this', -1.1],
        ['🧵', -0.9],
      ],
    },
    c: {
      verdict: 'neutral',
      score: -0.14,
      driver: 'promo_cta',
      flags: [['promo_cta', -0.14]],
    },
  },
  model: 'text-embedding-v4@256',
  algo: 'vote-v1',
};

describe('XVerdictDetail', () => {
  it('renders a pre-ensemble verdict exactly as before', () => {
    render(<XVerdictDetail verdict="negative" meta={singleChannel} />);

    expect(screen.getByText('Likely not interested')).toBeInTheDocument();
    expect(screen.getByText('@someone')).toBeInTheDocument();
    // no channels block in the meta -> no per-channel section invented for it
    expect(screen.queryByText(/Channel votes/)).not.toBeInTheDocument();
  });

  it('lists each channels vote with its evidence', () => {
    render(<XVerdictDetail verdict="negative" meta={ensemble} />);

    expect(screen.getByText(/Channel votes/)).toBeInTheDocument();
    // channel D: named in the reader's terms, with the words that moved it
    expect(screen.getByText('Lexical style')).toBeInTheDocument();
    expect(screen.getByText(/save this/)).toBeInTheDocument();
    // channel C: the deciding attribute is the evidence
    expect(screen.getByText('Content attributes')).toBeInTheDocument();
    expect(screen.getByText(/promo_cta/)).toBeInTheDocument();
    // votes are labeled per channel
    expect(screen.getByText('Negative')).toBeInTheDocument();
  });

  it('renders the author prior as a record rather than as weights', () => {
    // Channel A (2026-07-29) reads the account, never the tweet, so its evidence is
    // neither words nor attributes — it is "your record with this account", the one
    // piece of evidence in the whole pane that needs no metric to interpret.
    const authorPrior: XVerdictMeta = {
      reason: 'out_of_domain',
      score: 0,
      neighbors: [],
      channels: { a: { verdict: 'negative', score: -0.5625, handle: 'ibkr', down: 6, up: 0 } },
      algo: 'vote-v1',
    };
    render(<XVerdictDetail verdict="negative" meta={authorPrior} />);

    expect(screen.getByText('Author history')).toBeInTheDocument();
    expect(screen.getByText('@ibkr · Disliked 6 times, liked 0 times')).toBeInTheDocument();
  });

  it('marks a shadow channel so its score is not read as a vote', () => {
    // Step 5b: a channel measured on real traffic without being allowed to badge
    // anyone. Its score is real evidence, its silence is not an opinion — and the
    // detail pane is the only place that difference is visible.
    const shadowed: XVerdictMeta = {
      score: 0.4,
      neighbors: [],
      channels: { d: { verdict: null, score: -0.81, shadow: true, tokens: [['save this', -1.1]] } },
      algo: 'knn-v1',
    };
    render(<XVerdictDetail verdict="positive" meta={shadowed} />);

    expect(screen.getByText('Shadow (non-voting)')).toBeInTheDocument();
    expect(screen.queryByText('Negative')).not.toBeInTheDocument();
  });

  it('keeps the abstain explanation when only the topic channel stayed silent', () => {
    // out_of_domain describes channel B; the ensemble may still have spoken
    render(<XVerdictDetail verdict="negative" meta={ensemble} />);

    expect(screen.getByText('Dissimilar to previously labeled items; neutral')).toBeInTheDocument();
  });
});
