import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Compass, Loader2, Plus, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';

interface SuggestedChannel {
  id: number;
  username: string;
  title: string;
  category: string;
  description: string;
  is_subscribed: boolean;
}

export function SuggestedChannels() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [subscribingId, setSubscribingId] = useState<number | null>(null);

  const { data: channels, isLoading } = useQuery<SuggestedChannel[]>({
    queryKey: ['suggested-channels'],
    queryFn: async () => {
      const res = await fetch('/api/telegram/suggested-channels');
      if (!res.ok) throw new Error('Failed to fetch suggested channels');
      return res.json();
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: async (channel: SuggestedChannel) => {
      setSubscribingId(channel.id);
      const res = await fetch('/api/telegram/subscribe-suggested', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: channel.id,
          username: channel.username,
          title: channel.title,
          description: channel.description,
        }),
      });
      if (!res.ok) throw new Error('Failed to subscribe');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggested-channels'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      setSubscribingId(null);
    },
    onError: () => {
      setSubscribingId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Compass className="size-5 text-emerald-500" />
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{t('channels.suggestedTitle')}</h2>
          <p className="text-xs text-muted-foreground">{t('channels.suggestedSubtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(channels ?? []).map((ch) => {
          const isPending = subscribingId === ch.id;
          return (
            <div
              key={ch.id}
              className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-3.5 shadow-xs transition-all hover:border-emerald-500/40"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400">
                      <Send className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm leading-tight text-foreground">{ch.title}</h3>
                      <span className="text-[11px] text-muted-foreground" dir="ltr">
                        @{ch.username}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {ch.category}
                  </span>
                </div>

                <p dir="auto" className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {ch.description}
                </p>
              </div>

              <div className="mt-3.5 flex items-center justify-end border-t border-border/40 pt-2.5">
                {ch.is_subscribed ? (
                  <Button variant="secondary" size="sm" disabled className="h-7 gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                    <Check className="size-3.5" />
                    {t('channels.subscribed')}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => subscribeMutation.mutate(ch)}
                    className="h-7 gap-1 text-xs hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    {isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                    {t('channels.subscribe')}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
