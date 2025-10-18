import { useEffect } from 'react';
import { supabase } from '../client';

export function useRealtimeUpdates(table, filter, callback) {
  useEffect(() => {
    // Create a channel for real-time updates
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filter
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, callback]);
}

export function useRealtimeVendorRequests(vendorId, callback) {
  return useRealtimeUpdates(
    'vendor_requests',
    `vendor_id=eq.${vendorId}`, 
    callback
  );
}

export function useRealtimeContracts(contractId, callback) {
  return useRealtimeUpdates(
    'contracts',
    `id=eq.${contractId}`,
    callback
  );
}

export function useRealtimeEvents(userId, callback) {
  return useRealtimeUpdates(
    'events',
    `planner_id=eq.${userId}`,
    callback
  );
}
