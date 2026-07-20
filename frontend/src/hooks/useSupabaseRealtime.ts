import { useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export const useSupabaseRealtime = <T extends { [key: string]: any }>(
  table: string,
  event: RealtimeEvent,
  callback: (payload: RealtimePostgresChangesPayload<T>) => void
) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    // 1. Establish subscription channel on the schema-table parameters
    const channel = supabase
      .channel(`db-realtime-sync-${table}`)
      .on(
        'postgres_changes',
        { 
          event, 
          schema: 'public', 
          table 
        },
        (payload) => {
          callbackRef.current(payload as RealtimePostgresChangesPayload<T>);
        }
      )
      .subscribe();

    // 2. Clean up subscription on component unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event]);
};
