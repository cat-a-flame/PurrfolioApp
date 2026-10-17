import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Events } from '@/lib/events';

export type Profile = {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
};

const EMPTY: Profile = { name: null, email: null, avatarUrl: null, isAdmin: false };

/** Signed-in user's profile; refreshes whenever any screen emits 'profile-updated'. */
export function useProfile(): Profile & { reload: () => void } {
  const [profile, setProfile] = useState<Profile>(EMPTY);

  const reload = useCallback(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setProfile({
        name: user?.user_metadata?.name ?? user?.user_metadata?.full_name ?? null,
        email: user?.email ?? null,
        avatarUrl: user?.user_metadata?.avatar_url ?? null,
        // app_metadata can only be changed server-side (unlike user_metadata)
        isAdmin: user?.app_metadata?.role === 'admin',
      });
    });
  }, []);

  useEffect(() => {
    reload();
    return Events.on('profile-updated', reload);
  }, [reload]);

  return { ...profile, reload };
}
