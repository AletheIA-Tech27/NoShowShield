'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface IntentResult {
  intent: 'CONFIRM' | 'CANCEL' | 'RESCHEDULE' | 'UNKNOWN';
  confidence: number;
  reason: string;
}

interface Appointment {
  id: string;
  patient_name: string;
  appointment_date: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'rescheduled';
}

interface KPIStats {
  total: number;
  confirmed: number;
  rescheduled: number;
  cancelled: number;
  retentionRate: number;
}

export default function Dashboard() {
  const [patientName, setPatientName] = useState('Carlos Gómez');
  const [appointmentDate, setAppointmentDate] = useState('2026-08-14 16:00');
  const [message, setMessage] = useState('Hola, se me complicó el día. ¿Podemos cambiar la cita para el viernes?');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IntentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para citas y KPIs
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [kpis, setKpis] = useState<KPIStats>({
    total: 0,
    confirmed: 0,
    rescheduled: 0,
    cancelled: 0,
    retentionRate: 0,
  });
  
  const channelRef = useRef<any>(null);

  // Función para cargar citas desde la base de datos
  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          status,
          scheduled_at,
          patients (full_name)
        `)
        .gte('scheduled_at', new Date().toISOString().split('T')[0])
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      const formattedAppointments: Appointment[] = (data || []).map((item: any) => ({
        id: item.id,
        patient_name: item.patients?.full_name || 'Desconocido',
        appointment_date: item.scheduled_at,
        status: item.status.toLowerCase() as 'pending' | 'confirmed' | 'cancelled' | 'rescheduled',
      }));

      setAppointments(formattedAppointments);

      // Calcular KPIs
      const total = formattedAppointments.length;
      const confirmed = formattedAppointments.filter(a => a.status === 'confirmed').length;
      const rescheduled = formattedAppointments.filter(a => a.status === 'rescheduled').length;
      const cancelled = formattedAppointments.filter(a => a.status === 'cancelled').length;
      const retentionRate = total > 0 ? ((confirmed / total) * 100).toFixed(1) : '0';

      setKpis({
        total,
        confirmed,
        rescheduled,
        cancelled,
        retentionRate: parseFloat(retentionRate),
      });
    } catch (err) {
      console.error('Error al cargar citas:', err);
    }
  };

  // Suscripción en tiempo real con Supabase Realtime
  useEffect(() => {
    // Cargar datos iniciales
    fetchAppointments();

    // Crear canal para suscripciones
    channelRef.current = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        (payload: any) => {
          console.log('Cambio en appointments:', payload);
          fetchAppointments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_logs'
        },
        (payload: any) => {
          console.log('Cambio en ai_logs:', payload);
          fetchAppointments();
        }
      )
      .subscribe();

    // Cleanup al desmontar
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const handleTestIntent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/ai/intent-parser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, patientName, appointmentDate }),
      });

      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Error al procesar la intención.');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const getIntentBadge = (intent: string) => {
    switch (intent) {
      case 'CONFIRM':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'RESCHEDULE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'CANCEL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'rescheduled':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'cancelled':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 md:p-10">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-8 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-3.5 w-3.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight text-white">
              NoShowShield <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">v1.0 MVP</span>
            </h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">Consola Agéntica de Recuperación de Citas Médicas</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg text-xs text-slate-300">
          <span className="text-slate-400">Estado del Sistema:</span>
          <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span> API Conectada
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto mt-8 space-y-8">
        {/* Métricas Rápidas (KPIs) */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Métricas Rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
              <p className="text-xs font-medium text-slate-400">Total Citas</p>
              <p className="text-3xl font-bold text-white mt-2">{kpis.total}</p>
              <span className="text-[11px] text-slate-500 mt-1 block">Registradas Hoy</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
              <p className="text-xs font-medium text-slate-400">Confirmadas</p>
              <p className="text-3xl font-bold text-emerald-400 mt-2">{kpis.confirmed}</p>
              <span className="text-[11px] text-emerald-500/80 mt-1 block">Auto-confirmadas</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
              <p className="text-xs font-medium text-slate-400">Reagendadas</p>
              <p className="text-3xl font-bold text-amber-400 mt-2">{kpis.rescheduled}</p>
              <span className="text-[11px] text-amber-500/80 mt-1 block">Ingresos Rescatados</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
              <p className="text-xs font-medium text-slate-400">Canceladas</p>
              <p className="text-3xl font-bold text-rose-400 mt-2">{kpis.cancelled}</p>
              <span className="text-[11px] text-rose-500/80 mt-1 block">Slots Liberados</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
              <p className="text-xs font-medium text-slate-400">Tasa de Retención</p>
              <p className="text-3xl font-bold text-indigo-400 mt-2">{kpis.retentionRate}%</p>
              <span className="text-[11px] text-indigo-400/80 mt-1 block">Efectividad IA</span>
            </div>
          </div>
        </section>

        {/* Simulador de Intenciones en Vivo */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-1">Simulador de Intenciones en Vivo</h2>
            <p className="text-xs text-slate-400 mb-6">Prueba cómo el parser de IA interpreta la intención del paciente a partir de un mensaje de WhatsApp.</p>

            <form onSubmit={handleTestIntent} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Nombre del Paciente</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Fecha de Cita</label>
                  <input
                    type="text"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="AAAA-MM-DD HH:MM"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Mensaje del Paciente (WhatsApp)</label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="Escribe la respuesta del paciente..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-medium py-3 rounded-lg text-sm transition-all shadow-lg shadow-indigo-600/20 flex justify-center items-center gap-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analizando con Gemini IA...
                  </span>
                ) : (
                  <span>Analizar Intención en Tiempo Real</span>
                )}
              </button>
            </form>
          </div>

          {/* Panel de Resultado */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Resultado de la Extracción</h3>
              
              {loading && (
                <div className="h-52 flex flex-col items-center justify-center text-slate-400 text-xs gap-3">
                  <div className="h-6 w-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                  <span>Procesando mensaje semántico...</span>
                </div>
              )}

              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
                  <p className="font-semibold mb-1">Error de procesamiento:</p>
                  <p>{error}</p>
                </div>
              )}

              {result && !loading && (
                <div className="space-y-5">
                  <div>
                    <span className="text-xs text-slate-400 block mb-1.5">Intención Clasificada:</span>
                    <span className={`inline-block px-3.5 py-1.5 rounded-lg text-xs font-bold border ${getIntentBadge(result.intent)}`}>
                      {result.intent}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block mb-1.5">Grado de Confianza:</span>
                    <div className="flex items-center gap-3">
                      <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-800 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(result.confidence || 0) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {((result.confidence || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block mb-1.5">Razonamiento de la IA:</span>
                    <p className="text-xs text-slate-300 bg-slate-950 border border-slate-800 p-3.5 rounded-lg leading-relaxed">
                      {result.reason}
                    </p>
                  </div>
                </div>
              )}

              {!result && !loading && !error && (
                <div className="h-52 flex items-center justify-center text-slate-500 text-xs text-center border border-dashed border-slate-800 rounded-lg p-6">
                  Presiona "Analizar Intención" para evaluar el mensaje de prueba.
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 mt-6 text-[11px] text-slate-500 flex justify-between">
              <span>Endpoint: /api/ai/intent-parser</span>
              <span>REST Gemini 2.5 Flash</span>
            </div>
          </div>
        </section>

        {/* Tabla Monitor de Citas */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="text-base font-semibold text-white">Agenda del Día - Monitor en Vivo</h2>
              <p className="text-xs text-slate-400 mt-0.5">Seguimiento automatizado de confirmaciones por WhatsApp</p>
            </div>
            <span className="text-xs bg-slate-950 border border-slate-800 px-3 py-1 rounded-full text-slate-300">{appointments.length} Citas hoy</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Paciente</th>
                  <th className="p-4">Hora Cita</th>
                  <th className="p-4">Especialidad</th>
                  <th className="p-4">Estado Confirmación</th>
                  <th className="p-4">Acción Automática Sugerida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {appointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-medium text-white">{appointment.patient_name}</td>
                    <td className="p-4">16:00 PM</td>
                    <td className="p-4">Odontología General</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold ${getStatusBadge(appointment.status)}`}>
                        {appointment.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">
                      {appointment.status === 'rescheduled' 
                        ? 'Ofrecer agenda disponible para Viernes 10:00 AM'
                        : appointment.status === 'cancelled'
                          ? 'Slot liberado - Notificando a paciente en lista de espera'
                          : appointment.status === 'confirmed'
                            ? 'Recordatorio de preparación pre-consulta enviado'
                            : 'WhatsApp enviado (esperando respuesta)'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}