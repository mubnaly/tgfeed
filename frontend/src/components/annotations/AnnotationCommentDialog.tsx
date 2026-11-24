import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Spinner } from '@/components/Spinner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '@/lib/api';
import type { ItemAnnotation } from '@/lib/types';

interface Props {
  /** The highlight being commented; null = closed. */
  annotation: ItemAnnotation | null;
  onClose: () => void;
  /** Persist the whole comment ('' clears); rejects on failure. */
  onSave: (comment: string) => Promise<void>;
}

/**
 * 高亮评论编辑框（iOS `AnnotationCommentSheet` 的对应物）：顶部引文块提醒在评论什么，
 * 覆盖语义和条目评论一致 —— 清空保存即删除评论，高亮本身保留（删除高亮是正文菜单里的
 * 另一个动作）。
 */
export function AnnotationCommentDialog({ annotation, onClose, onSave }: Props) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  // Seed from the stored comment each time a highlight is picked.
  useEffect(() => {
    if (annotation) setText(annotation.comment ?? '');
  }, [annotation]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(text.trim());
      onClose();
    } catch (e) {
      toast.error(errorMessage(e, 'Failed to save comment, please retry'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!annotation} onOpenChange={(next) => !next && !saving && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Highlight Comment</DialogTitle>
          <DialogDescription>Add your notes or commentary on this highlight.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <blockquote className="line-clamp-4 rounded-md bg-yellow-400/15 px-3 py-2 text-sm leading-relaxed text-foreground/90">
            {annotation?.quote}
          </blockquote>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={annotation?.comment ? 'Clear and save to delete comment (highlight remains)' : 'Write a comment on this highlight...'}
            autoFocus
            className="min-h-24"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Spinner /> : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
