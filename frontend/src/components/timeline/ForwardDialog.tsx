import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Spinner } from '@/components/Spinner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/i18n';
import { api, errorMessage } from '@/lib/api';
import { patchItem } from '@/lib/itemCaches';
import type { TimelineItem } from '@/lib/types';

interface ForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: TimelineItem;
  initialComment?: string;
}

export function ForwardDialog({ open, onOpenChange, item, initialComment }: ForwardDialogProps) {
  const { t } = useI18n();
  const [comment, setComment] = useState('');
  const isTelegram = item.source === 'telegram';
  const qc = useQueryClient();

  useEffect(() => {
    if (open) setComment(initialComment ?? '');
  }, [open, initialComment]);

  const forward = useMutation({
    mutationFn: () => api.forwardItem(item.key, comment.trim() || undefined),
    onSuccess: (res) => {
      setComment('');
      onOpenChange(false);
      const openAction = { label: t('common.open'), onClick: () => window.open(res.link, '_blank') };
      if (res.recorded === false) {
        toast.warning('Sent, but local forward record failed to save', { action: openAction });
        return;
      }
      patchItem(qc, item.key, { forwarded_by_me: true });
      void qc.invalidateQueries({ queryKey: ['forwards'] });
      toast.success(res.mode === 'quote' ? 'Posted message with commentary' : 'Forwarded to your channel', {
        action: openAction,
      });
    },
    onError: (e) => toast.error(errorMessage(e, t('forward.error'))),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setComment('');
          forward.reset();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('forward.title')}</DialogTitle>
          <DialogDescription>
            {isTelegram
              ? 'Adding commentary will post a new message with text and quoted link.'
              : 'Adding commentary will post a new message with your text, title, and link.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={isTelegram ? 'Leave empty to forward directly…' : 'Leave empty to post title and link only…'}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={forward.isPending}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => forward.mutate()} disabled={forward.isPending}>
              {forward.isPending ? <Spinner /> : t('forward.send')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
