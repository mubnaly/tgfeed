import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/api', () => ({
  api: { setNote: vi.fn() },
  errorMessage: (_e: unknown, fallback: string) => fallback,
}));

import { api } from '@/lib/api';
import type { TimelineItem } from '@/lib/types';

import { ItemNoteDialog } from './ItemNoteDialog';

const item: TimelineItem = {
  source: 'hn',
  key: 'hn:42',
  datetime: '2026-08-20T10:00:00Z',
  is_read: true,
  is_saved: false,
};

function mount(over: Partial<Parameters<typeof ItemNoteDialog>[0]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    item,
    note: '',
    onSaved: vi.fn(),
    onForward: vi.fn(),
    ...over,
  };
  render(
    <QueryClientProvider client={qc}>
      <ItemNoteDialog {...props} />
    </QueryClientProvider>,
  );
  return props;
}

describe('ItemNoteDialog', () => {
  it('saves the trimmed note and closes', async () => {
    vi.mocked(api.setNote).mockResolvedValue({ ok: true });
    const props = mount();
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox'), '  我的看法  ');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(api.setNote).toHaveBeenCalledWith('hn:42', '我的看法'));
    expect(props.onSaved).toHaveBeenCalledWith('我的看法');
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
    expect(props.onForward).not.toHaveBeenCalled();
  });

  it('clearing and saving deletes the note (overwrite semantics, no delete button)', async () => {
    vi.mocked(api.setNote).mockResolvedValue({ ok: true });
    const props = mount({ note: '旧评论' });
    // Seeded with the current note, and the placeholder says what clearing does.
    const box = screen.getByRole('textbox');
    expect(box).toHaveValue('旧评论');
    expect(box).toHaveAttribute('placeholder', 'Clear text to delete note');

    const user = userEvent.setup();
    await user.clear(box);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.setNote).toHaveBeenCalledWith('hn:42', ''));
    expect(props.onSaved).toHaveBeenCalledWith('');
  });

  it('Save & Forward persists the note first, then hands it to the forward chain', async () => {
    vi.mocked(api.setNote).mockResolvedValue({ ok: true });
    const props = mount();
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox'), '转发语');
    await user.click(screen.getByRole('button', { name: /Save & Forward/ }));

    await waitFor(() => expect(props.onForward).toHaveBeenCalledWith('转发语'));
    expect(api.setNote).toHaveBeenCalledWith('hn:42', '转发语');
    // The chain replaces the plain close — the pane swaps dialogs itself.
    expect(props.onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('disables Save & Forward on an empty note — nothing to prefill', () => {
    mount();
    expect(screen.getByRole('button', { name: /Save & Forward/ })).toBeDisabled();
  });

  it('keeps the dialog open and reports when the save fails', async () => {
    vi.mocked(api.setNote).mockRejectedValue(new Error('boom'));
    const props = mount();
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox'), 'x');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(api.setNote).toHaveBeenCalled());
    expect(props.onSaved).not.toHaveBeenCalled();
    expect(props.onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
