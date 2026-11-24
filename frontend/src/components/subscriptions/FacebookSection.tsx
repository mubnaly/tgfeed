import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, Loader2, Plus, Users } from 'lucide-react';

import { FbGlyph } from '@/components/FbGlyph';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FacebookPageItem {
  handle: string;
  title: string;
  url: string;
  rss_url: string;
  followers_count: number;
  followers_formatted: string;
  category: string;
  description: string | null;
  avatar_url: string | null;
  is_subscribed: boolean;
}

export function FacebookSection() {
  const queryClient = useQueryClient();

  const [inputUrl, setInputUrl] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [submittingHandle, setSubmittingHandle] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ pages: FacebookPageItem[]; total: number }>({
    queryKey: ['facebook-pages'],
    queryFn: async () => {
      const res = await fetch('/api/facebook/pages');
      if (!res.ok) throw new Error('Failed to fetch Facebook pages');
      return res.json();
    },
  });

  const addPageMutation = useMutation({
    mutationFn: async () => {
      if (!inputUrl.trim()) throw new Error('يرجى إدخال رابط أو معرّف الصفحة');
      setFormError(null);
      const res = await fetch('/api/facebook/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: inputUrl.trim(),
          title: inputTitle.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'فشل إضافة الصفحة');
      }
      return res.json();
    },
    onSuccess: () => {
      setInputUrl('');
      setInputTitle('');
      queryClient.invalidateQueries({ queryKey: ['facebook-pages'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
    onError: (err: any) => {
      setFormError(err.message || 'حدث خطأ أثناء إضافة الصفحة');
    },
  });

  const toggleSubscribeMutation = useMutation({
    mutationFn: async ({ handle, isSubscribed }: { handle: string; isSubscribed: boolean }) => {
      setSubmittingHandle(handle);
      const endpoint = isSubscribed ? '/api/facebook/unsubscribe' : '/api/facebook/subscribe';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle }),
      });
      if (!res.ok) throw new Error('Failed to update subscription');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facebook-pages'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      setSubmittingHandle(null);
    },
    onError: () => {
      setSubmittingHandle(null);
    },
  });

  return (
    <div className="p-4 sm:p-5">
      {/* Header banner */}
      <div className="mb-6 rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 via-sky-500/5 to-transparent p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <FbGlyph className="mt-0.5 size-7 text-sm" />
            <div>
              <h2 className="text-base font-semibold text-foreground">
                صفحات فيسبوك العامة (Facebook RSS-Bridge)
              </h2>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                تابع كبرى الصفحات العامة على فيسبوك مرتبة حسب عدد المتابعين، أو أضف صفحة عامة جديدة عبر رابطها لتُحفظ بقاعدة البيانات وتظهر لك وللآخرين كاقتراح للمتابعة مع إمكانية التلخيص بالذكاء الاصطناعي ✨
              </p>
            </div>
          </div>
        </div>

        {/* Add new page form */}
        <div className="mt-4 rounded-xl border border-border/80 bg-background/80 p-3 sm:p-4 backdrop-blur-xs">
          <div className="mb-2 text-xs font-medium text-foreground">إضافة صفحة عامة جديدة للمنظومة:</div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addPageMutation.mutate();
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <Input
              type="text"
              placeholder="رابط الصفحة (مثال: https://facebook.com/techdir أو المعرف Techdir)"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="flex-1 text-xs"
              dir="ltr"
            />
            <Input
              type="text"
              placeholder="اسم اختياري للصفحة (مثال: عالم التقنية)"
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
              className="sm:w-56 text-xs"
            />
            <Button
              type="submit"
              disabled={addPageMutation.isPending || !inputUrl.trim()}
              className="gap-1.5 bg-[#1877F2] hover:bg-[#166fe5] text-white shrink-0"
              size="sm"
            >
              {addPageMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              <span>إضافة ومتابعة</span>
            </Button>
          </form>
          {formError && <p className="mt-1.5 text-xs text-red-500">{formError}</p>}
        </div>
      </div>

      {/* Pages Section Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-blue-500" />
          <h3 className="text-sm font-semibold tracking-tight">
            الصفحات المقترحة (مرتبة حسب عدد المتابعين)
          </h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {data?.total ?? 0} صفحة مسجلة
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.pages ?? []).map((page) => {
            const isPending = submittingHandle === page.handle;
            return (
              <div
                key={page.handle}
                className="flex flex-col justify-between rounded-xl border border-border/70 bg-card p-3.5 shadow-xs transition-all hover:border-blue-500/40"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                        f
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm leading-tight text-foreground truncate">
                          {page.title}
                        </h4>
                        <span className="text-[11px] text-muted-foreground" dir="ltr">
                          @{page.handle}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 px-2 py-0.5 text-[10px] font-medium">
                      {page.category}
                    </span>
                  </div>

                  {page.description && (
                    <p className="mt-2.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {page.description}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-foreground/80">
                    <Users className="size-3.5 text-muted-foreground" />
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      {page.followers_formatted}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 gap-2">
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>فتح في فيسبوك</span>
                    <ExternalLink className="size-3" />
                  </a>

                  <Button
                    size="sm"
                    variant={page.is_subscribed ? 'outline' : 'default'}
                    disabled={isPending}
                    onClick={() =>
                      toggleSubscribeMutation.mutate({
                        handle: page.handle,
                        isSubscribed: page.is_subscribed,
                      })
                    }
                    className={
                      page.is_subscribed
                        ? 'h-7 text-xs border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                        : 'h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1'
                    }
                  >
                    {isPending ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : page.is_subscribed ? (
                      <>
                        <Check className="size-3" />
                        <span>مُتابَع</span>
                      </>
                    ) : (
                      <>
                        <Plus className="size-3" />
                        <span>متابعة</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
