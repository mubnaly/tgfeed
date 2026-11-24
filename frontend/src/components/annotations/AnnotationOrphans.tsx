import { Highlighter, Trash2 } from 'lucide-react';

import type { ItemAnnotation } from '@/lib/types';

interface RowProps {
  annotation: ItemAnnotation;
  onDelete: (id: number) => void;
}

/** One orphaned highlight: the quote (soft yellow, the highlight's own color), its
 *  comment when there is one, and the delete action. */
function OrphanRow({ annotation, onDelete }: RowProps) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-yellow-400/10 px-3 py-2">
      <div className="min-w-0 flex-1">
        <blockquote className="line-clamp-3 text-sm leading-relaxed text-foreground/80">{annotation.quote}</blockquote>
        {annotation.comment && <p className="mt-1 text-sm text-muted-foreground">{annotation.comment}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDelete(annotation.id)}
        aria-label="Delete this highlight"
        className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

interface Props {
  orphans: ItemAnnotation[];
  onDelete: (id: number) => void;
}

/**
 * Highlights whose positions can no longer be located in the body.
 */
export function AnnotationOrphans({ orphans, onDelete }: Props) {
  if (orphans.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Highlighter className="size-3.5" />
        Orphaned highlights (original text changed, quotes preserved)
      </p>
      {orphans.map((a) => (
        <OrphanRow key={a.id} annotation={a} onDelete={onDelete} />
      ))}
    </div>
  );
}
