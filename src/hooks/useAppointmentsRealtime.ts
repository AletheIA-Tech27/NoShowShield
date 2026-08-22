'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getBrowserClient } from '../lib/supabase/client';

export interface Patient {
  full_name: string;
  phone: string;
}

export interface Appointment {
  id: string;
  clinic_id: string | null;
  patient_id: string | null;
  appointment_date: string;
  status: 'PENDING' | 'CONFIRM' | 'RESCHEDULE' | 'CANCEL' | 'UNKNOWN';
  ai_notes: string | null;
  created_at: string;
  patients?: Patient | null;
}

export interface KPIMetrics {
  total: number;
  confirmed: number;
  cancelled: number;
  pending: number;
}

// Map function to execute on fetched data
const normalizeAppointment = (item: any): Appointment => {
  // Handle both object and single-element array returns from Supabase joins
  const patientObj = Array.isArray(item.patients) 
    ? item.patients[0] 
    : item.patients;

  return {
    id: item.id,
    clinic_id: item.clinic_id,
    patient_id: item.patient_id,
    appointment_date: item.appointment_date,
    status: String(item.status || '').trim().toLowerCase() as Appointment['status'],
    ai_notes: item.ai_notes,
    created_at: item.created_at,
    patients: patientObj ? {
      full_name: patientObj.full_name || 'Paciente de Prueba',
      phone: patientObj.phone || ''
    } : null,
  };
};

export function useAppointmentsRealtime(clinicId: string | null) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const appointmentsRef = useRef<Appointment[]>([]);

  // Fetch initial appointments
  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      setError(null);

      try {
        const client = getBrowserClient();
        if (!client) {
          setError('Supabase client not configured');
          setLoading(false);
          return;
        }

        const { data, error: fetchError } = await client
          .from('appointments')
          .select('*, patients(full_name, phone)')
          .order('appointment_date', { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        // Handle empty/null data gracefully
        const dataArray = data || [];
        const formattedAppointments: Appointment[] = dataArray.map(normalizeAppointment);

        setAppointments(formattedAppointments);
        appointmentsRef.current = formattedAppointments;
      } catch (err) {
        // Print exact error for DevTools
        console.error('Supabase fetch details:', JSON.stringify(err, null, 2));
        console.error('Error fetching appointments:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Set empty array to prevent render errors
        setAppointments([]);
        appointmentsRef.current = [];
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [clinicId]);

  // Subscribe to real-time changes
  useEffect(() => {
    const client = getBrowserClient();
    if (!client) return;

    const channel = client
      .channel('appointments-all')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        async (payload: any) => {
          console.log('Real-time appointment change:', payload);
          
          // For UPDATE events, preserve existing patients data from state
          // since Realtime UPDATE payloads don't include foreign key joins
          if (payload.eventType === 'UPDATE') {
            const updatedRecord = payload.new as any;
            const existingAppointment = appointmentsRef.current.find(
              (a) => a.id === updatedRecord.id
            );
            
            // Merge the update with existing patients data
            const mergedAppointment: Appointment = {
              id: updatedRecord.id,
              clinic_id: updatedRecord.clinic_id,
              patient_id: updatedRecord.patient_id,
              appointment_date: updatedRecord.appointment_date,
              status: String(updatedRecord.status || '').trim().toLowerCase() as Appointment['status'],
              ai_notes: updatedRecord.ai_notes,
              created_at: updatedRecord.created_at,
              patients: existingAppointment?.patients || (updatedRecord.patients ? {
                full_name: Array.isArray(updatedRecord.patients) 
                  ? (updatedRecord.patients[0]?.full_name || 'Paciente de Prueba')
                  : (updatedRecord.patients.full_name || 'Paciente de Prueba'),
                phone: Array.isArray(updatedRecord.patients) 
                  ? (updatedRecord.patients[0]?.phone || '')
                  : (updatedRecord.patients.phone || '')
              } : null),
            };
            
            const updatedAppointments = appointmentsRef.current.map((a) =>
              a.id === mergedAppointment.id ? mergedAppointment : a
            );
            
            setAppointments(updatedAppointments);
            appointmentsRef.current = updatedAppointments;
            return;
          }
          
          // For INSERT/DELETE events, re-fetch with full join
          client
            .from('appointments')
            .select('*, patients(full_name, phone)')
            .order('appointment_date', { ascending: true })
            .then(({ data, error }: { data: any; error: any }) => {
              if (error) {
                console.error('Supabase realtime fetch error:', JSON.stringify(error, null, 2));
                return;
              }
              // Handle empty/null data gracefully
              const dataArray = data || [];
              const formattedAppointments: Appointment[] = dataArray.map(normalizeAppointment);
              setAppointments(formattedAppointments);
              appointmentsRef.current = formattedAppointments;
            });
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [clinicId]);

  // Calculate KPIs from appointments
  const kpiMetrics: KPIMetrics = {
    total: appointments.length,
    confirmed: appointments.filter((a) => a.status?.toLowerCase() === 'confirm').length,
    pending: appointments.filter((a) => a.status?.toLowerCase() === 'pending').length,
    cancelled: appointments.filter((a) => a.status?.toLowerCase() === 'cancel').length,
  };

  return {
    appointments,
    kpiMetrics,
    loading,
    error,
  };
}