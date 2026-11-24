import { useState } from 'react';
import { Bookmark, Compass, Filter, Inbox, Radio, Repeat2, Search, Send, Settings, Sparkles } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

import { SettingsDialog } from '@/components/SettingsDialog';
import { NafiLogo } from '@/components/NafiLogo';
import { navLinkClass } from '@/components/SidebarChannelLink';
import { SidebarSourceGroup } from '@/components/SidebarSourceGroup';
import { UnreadBadge } from '@/components/UnreadBadge';
import { Button } from '@/components/ui/button';
import { VibeReaderDot } from '@/components/VibeReaderDot';
import { useCollapsedSources } from '@/hooks/useCollapsedSources';
import { useSources } from '@/hooks/useSources';
import { useTgStatus } from '@/hooks/useTgStatus';
import { useI18n } from '@/i18n';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const { data: sources } = useSources();
  const { data: tgStatus } = useTgStatus();
  const isTgAuthorized = tgStatus?.status === 'authorized';
  const { collapsed, toggle } = useCollapsedSources();
  // aggregate_unread, not unread: this badge stands above the All/Unread links, so
  // it must promise what those views can produce. They differ for X's For You,
  // which contributes only the tweets its aggregate mode admits.
  const totalUnread = (sources ?? [])
    .flatMap((g) => g.subscriptions)
    .reduce((n, s) => n + (s.enabled ? s.aggregate_unread : 0), 0);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const location = useLocation();
  // "/" is the Unread home view; "?all=1" flips the aggregate view to All.
  const allActive = location.pathname === '/' && new URLSearchParams(location.search).get('all') === '1';
  const unreadActive = location.pathname === '/' && !allActive;

  return (
    <div className="flex h-full flex-col gap-4 p-3">
      <div className="flex items-center gap-2.5 px-1.5 pt-1">
        <NafiLogo size={24} />
        <span className="font-bold tracking-tight text-foreground">{t('app.name')}</span>
      </div>

      <nav className="flex flex-col gap-0.5">
        {!isTgAuthorized ? (
          <NavLink
            to="/connect-telegram"
            className="mb-1 flex items-center gap-2 rounded-lg bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-600 transition-colors hover:bg-sky-500/25 dark:text-sky-400"
            onClick={onNavigate}
          >
            <Send className="size-4 shrink-0" />
            <span>{t('channels.connectBtn')}</span>
          </NavLink>
        ) : (
          <div className="mb-1 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t('nav.source.telegram')} {t('nav.connected')}</span>
          </div>
        )}
        <NavLink to="/" end className={navLinkClass({ isActive: unreadActive })} onClick={onNavigate}>
          <Sparkles className="size-4" />
          {t('nav.unread')}
          <UnreadBadge count={totalUnread} />
        </NavLink>
        <NavLink to="/?all=1" className={navLinkClass({ isActive: allActive })} onClick={onNavigate}>
          <Inbox className="size-4" />
          {t('common.all')}
        </NavLink>
        <NavLink to="/saved" className={navLinkClass} onClick={onNavigate}>
          <Bookmark className="size-4" />
          {t('detail.saved')}
        </NavLink>
        {/* Forward log directly follows Saved: both are archives of actions taken on items. */}
        <NavLink to="/forwards" className={navLinkClass} onClick={onNavigate}>
          <Repeat2 className="size-4" />
          {t('nav.forwards')}
        </NavLink>
        <NavLink to="/search" className={navLinkClass} onClick={onNavigate}>
          <Search className="size-4" />
          {t('nav.search')}
        </NavLink>
        <NavLink to="/filters" className={navLinkClass} onClick={onNavigate}>
          <Filter className="size-4" />
          {t('nav.filters')}
        </NavLink>
        <NavLink to="/subscriptions" className={navLinkClass} onClick={onNavigate}>
          <Radio className="size-4" />
          {t('nav.subscriptions')}
        </NavLink>
        <NavLink to="/subscriptions" className={navLinkClass} onClick={onNavigate}>
          <Compass className="size-4 text-emerald-500" />
          {t('nav.suggestedChannels')}
        </NavLink>
      </nav>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        {(sources ?? []).map((g) => (
          <SidebarSourceGroup
            key={g.source}
            group={g}
            collapsed={collapsed.has(g.source)}
            onToggleCollapsed={() => toggle(g.source)}
            onNavigate={onNavigate}
          />
        ))}
        {sources && sources.length === 0 && (
          <p className="px-2.5 py-1 text-xs text-muted-foreground/70">No subscriptions yet.</p>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="justify-start text-muted-foreground"
        onClick={() => setSettingsOpen(true)}
      >
        <Settings className="size-4" />
        {t('nav.settings')}
        <VibeReaderDot className="ms-auto" />
      </Button>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
