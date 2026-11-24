import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { NafiLogo } from '@/components/NafiLogo';
import { Spinner } from '@/components/Spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/i18n';
import { api, ApiError } from '@/lib/api';
import { queryClient, TG_STATUS_KEY } from '@/lib/queryClient';

export function AppLogin() {
  const { t } = useI18n();
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: () => api.login(password),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TG_STATUS_KEY }),
  });

  const error =
    login.error instanceof ApiError
      ? login.error.status === 401
        ? t('auth.invalidPassword')
        : login.error.message
      : login.error
        ? t('auth.unauthorizedError')
        : null;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center">
            <NafiLogo size={64} className="shadow-md" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t('auth.unlockTitle')}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t('app.tagline')}</p>
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (password) login.mutate();
          }}
        >
          <Input
            type="password"
            autoFocus
            autoComplete="current-password"
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!error}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={!password || login.isPending}>
            {login.isPending && <Spinner />}
            {t('auth.unlockButton')}
          </Button>
        </form>
      </div>
    </div>
  );
}
