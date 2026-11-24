import { useEffect, useState } from 'react';
import { Forward } from 'lucide-react';
import { toast } from 'sonner';

import { Spinner } from '@/components/Spinner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useNote } from '@/hooks/useNote';
import { useI18n } from '@/i18n';
import { errorMessage } from '@/lib/api';
import type { TimelineItem } from '@/lib/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: TimelineItem;
  note: string;
  onSaved: (note: string) => void;
  onForward: (note: string) => void;
}

export function ItemNoteDialog({ open, onOpenChange, item, note, onSaved, onForward }: Props) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const save = useNote();

  useEffect(() => {
    if (open) setText(note);
  }, [open, note]);

  const submit = (thenForward: boolean) => {
    const value = text.trim();
    save.mutate(
      { key: item.key, note: value },
      {
        onSuccess: () => {
          onSaved(value);
          if (thenForward) onForward(value);
          else onOpenChange(false);
        },
        onError: (e) => toast.error(errorMessage(e, value ? 'Failed to save note' : 'Failed to delete note')),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (save.isPending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('note.title')}</DialogTitle>
          <DialogDescription>Private note saved to this item.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={note ? 'Clear text to delete note' : 'Write a note for this item…'}
            autoFocus
            className="min-h-28"
          />
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="outline"
              onClick={() => submit(true)}
              disabled={save.isPending || !text.trim()}
              title="Save note and forward"
            >
              <Forward className="size-4" />
              Save & Forward
            </Button>
            <Button onClick={() => submit(false)} disabled={save.isPending}>
              {save.isPending ? <Spinner /> : t('common.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
