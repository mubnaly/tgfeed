import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Circle, Globe, Lock, LogIn, LogOut, Minus, Monitor, Moon, Phone, Puzzle, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DeviceList } from '@/components/DeviceList';
import { LanguageOption } from '@/components/LanguageOption';
import { SegmentedOption } from '@/components/SegmentedOption';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAppMeta, useSetForwardChannel, useSetLanguages } from '@/hooks/useAppMeta';
import { useTgStatus } from '@/hooks/useTgStatus';
import { useVibeReader } from '@/hooks/useVibeReader';
import { useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { queryClient, TG_STATUS_KEY } from '@/lib/queryClient';
import { type Theme, useTheme } from '@/lib/theme';
import { type UnreadIndicatorMode, useUnreadIndicator } from '@/lib/unreadIndicator';

const THEME_OPTIONS: { value: Theme; labelKey: string; icon: typeof Sun }[] = [
  { value: 'light', labelKey: 'settings.theme.light', icon: Sun },
  { value: 'dark', labelKey: 'settings.theme.dark', icon: Moon },
  { value: 'system', labelKey: 'settings.theme.system', icon: Monitor },
];

const UNREAD_OPTIONS: { value: UnreadIndicatorMode; labelKey: string; icon: typeof Circle }[] = [
  { value: 'divider', labelKey: 'settings.unreadIndicator.divider', icon: Minus },
  { value: 'dot', labelKey: 'settings.unreadIndicator.dot', icon: Circle },
];

/** English and Arabic exclusively */
export const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
];

export function vibeReaderStatusText(
  s: { available: boolean; linked: boolean; version: number | null },
  t: (k: string, v?: Record<string, string | number>) => string,
): string {
  if (s.available) {
    return s.linked ? t('settings.vibeReader.status.connectedLinked') : t('settings.vibeReader.status.connectedUnlinked');
  }
  if (s.version != null) {
    return t('settings.vibeReader.status.versionMismatch', { version: s.version });
  }
  return t('settings.vibeReader.status.notDetected');
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-medium tracking-wide text-muted-foreground/70 uppercase">{children}</div>;
}

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, locale, setLocale } = useI18n();
  const { data: status } = useTgStatus();
  const tgConnected = status?.status === 'authorized';
  const { theme, setTheme } = useTheme();
  const { mode: unreadMode, setMode: setUnreadMode } = useUnreadIndicator();
  const [confirmTgLogout, setConfirmTgLogout] = useState(false);

  const vibe = useVibeReader();

  const meta = useAppMeta();
  const setForward = useSetForwardChannel();
  const setLanguages = useSetLanguages();
  const languages = meta.data?.languages ?? [];
  const toggleLanguage = (code: string) =>
    setLanguages.mutate(languages.includes(code) ? languages.filter((c) => c !== code) : [...languages, code]);
  const [forwardChannel, setForwardChannel] = useState('');
  // Sync the input from the server value on load and on every reopen (drops unsaved edits).
  useEffect(() => {
    setForwardChannel(meta.data?.forward_channel ?? '');
  }, [meta.data?.forward_channel, open]);
  const forwardDirty = forwardChannel.trim() !== (meta.data?.forward_channel ?? '');

  const tgLogout = useMutation({
    mutationFn: () => api.tgLogout(),
    onSuccess: () => {
      setConfirmTgLogout(false);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: TG_STATUS_KEY });
    },
  });

  const appLock = useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: TG_STATUS_KEY });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
          <DialogDescription>{t('settings.section.appearance')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5">
          <SectionLabel>{t('settings.section.telegram')}</SectionLabel>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="size-4 text-muted-foreground" />
            <span>{tgConnected ? (status?.phone ?? t('common.done')) : t('settings.telegram.notConnected')}</span>
          </div>
          {tgConnected ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={() => setConfirmTgLogout(true)}
            >
              <LogOut className="size-4" />
              {t('settings.telegram.disconnect')}
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="w-full justify-start" asChild>
              <Link to="/connect-telegram" onClick={() => onOpenChange(false)}>
                <LogIn className="size-4" />
                {t('settings.telegram.connect')}
              </Link>
            </Button>
          )}
        </div>

        {/* UI Language Selection */}
        <div className="space-y-2">
          <SectionLabel>{t('settings.uiLanguage')}</SectionLabel>
          <div className="grid grid-cols-2 gap-1.5">
            <SegmentedOption
              icon={Globe}
              label={t('settings.uiLanguage.en')}
              active={locale === 'en'}
              onClick={() => setLocale('en')}
            />
            <SegmentedOption
              icon={Globe}
              label={t('settings.uiLanguage.ar')}
              active={locale === 'ar'}
              onClick={() => setLocale('ar')}
            />
          </div>
        </div>

        {/* Theme Appearance */}
        <div className="space-y-2">
          <SectionLabel>{t('settings.theme')}</SectionLabel>
          <div className="grid grid-cols-3 gap-1.5">
            {THEME_OPTIONS.map((opt) => (
              <SegmentedOption
                key={opt.value}
                icon={opt.icon}
                label={t(opt.labelKey)}
                active={theme === opt.value}
                onClick={() => setTheme(opt.value)}
              />
            ))}
          </div>
        </div>

        {/* Unread Indicator */}
        <div className="space-y-2">
          <SectionLabel>{t('settings.unreadIndicator')}</SectionLabel>
          <div className="grid grid-cols-2 gap-1.5">
            {UNREAD_OPTIONS.map((opt) => (
              <SegmentedOption
                key={opt.value}
                icon={opt.icon}
                label={t(opt.labelKey)}
                active={unreadMode === opt.value}
                onClick={() => setUnreadMode(opt.value)}
              />
            ))}
          </div>
        </div>

        {/* Content Language Filter */}
        <div className="space-y-2">
          <SectionLabel>{t('settings.contentLanguages')}</SectionLabel>
          <div className="grid grid-cols-2 gap-1.5">
            {LANGUAGE_OPTIONS.map((opt) => (
              <LanguageOption
                key={opt.value}
                label={opt.label}
                selected={languages.includes(opt.value)}
                onToggle={() => toggleLanguage(opt.value)}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t('settings.contentLanguages.desc')}</p>
        </div>

        {/* Forward Channel Target */}
        <div className="space-y-2">
          <SectionLabel>{t('settings.section.forward')}</SectionLabel>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setForward.mutate(forwardChannel.trim(), {
                onSuccess: () => toast.success(t('common.saved')),
              });
            }}
          >
            <Input
              value={forwardChannel}
              onChange={(e) => setForwardChannel(e.target.value)}
              placeholder={t('settings.forwardChannel.placeholder')}
            />
            <Button type="submit" variant="outline" disabled={!forwardDirty || setForward.isPending}>
              {t('common.save')}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">{t('settings.forwardChannel.desc')}</p>
        </div>

        {/* Vibe Reader Integration */}
        <div className="space-y-2">
          <SectionLabel>{t('settings.section.vibeReader')}</SectionLabel>
          <div className="flex items-center gap-2 text-sm">
            <Puzzle className="size-4 text-muted-foreground" />
            <span className="flex-1">{vibeReaderStatusText(vibe, t)}</span>
            <Switch
              aria-label="Vibe Reader Sync"
              checked={vibe.linked}
              disabled={!vibe.available}
              onCheckedChange={(v) => vibe.setLink(v)}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t('settings.vibeReader.desc')}</p>
        </div>

        {/* Authorized Devices */}
        <div className="space-y-2">
          <SectionLabel>{t('settings.section.devices')}</SectionLabel>
          <DeviceList />
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={() => appLock.mutate()}
        >
          <Lock className="size-4" />
          {t('nav.logout')}
        </Button>

        <ConfirmDialog
          open={confirmTgLogout}
          onOpenChange={setConfirmTgLogout}
          title={t('settings.telegram.disconnect')}
          description={t('settings.telegram.confirmDisconnect')}
          destructive
          confirmLabel={t('settings.telegram.disconnect')}
          pending={tgLogout.isPending}
          onConfirm={() => tgLogout.mutate()}
        />
      </DialogContent>
    </Dialog>
  );
}
