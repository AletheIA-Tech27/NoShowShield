'use client';

import { useAppointmentsRealtime, type Appointment } from '../../hooks/useAppointmentsRealtime';
import { useMemo } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, User, Stethoscope, FileText } from 'lucide-react';

interface DashboardClientViewProps {
  clinicId: string;
}

export default function DashboardClientView({ clinicId }: DashboardClientViewProps) {
  const { appointments, loading, error } = useAppointmentsRealtime(clinicId);

  // Calculate KPIs directly from appointments array with useMemo for reactive updates
  const metrics = useMemo(() => {
    const confirmed = appointments.filter((a) => {
      const status = String(a.status || '').trim().toLowerCase();
      return status === 'confirmed' || status === 'confirm';
    }).length;

    const pending = appointments.filter((a) => {
      const status = String(a.status || '').trim().toLowerCase();
      return status === 'pending';
    }).length;

    const cancelled = appointments.filter((a) => {
      const status = String(a.status || '').trim().toLowerCase();
      return status === 'cancelled' || status === 'canceled';
    }).length;

    return {
      total: appointments.length,
      confirmed,
      pending,
      cancelled,
    };
  }, [appointments]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Dashboard de Citas</h1>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse">
                <div className="h-4 w-20 bg-slate-700 rounded mb-2"></div>
                <div className="h-8 w-12 bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-rose-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard de Citas</h1>
            <p className="text-slate-400 text-sm">Monitoreo en tiempo real de citas médicas</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg">
            <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
            <span className="text-xs text-slate-300">Conectado</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <KPICard 
            title="Total Citas" 
            value={metrics.total} 
            icon={Calendar}
            bgColor="bg-blue-500/20"
            iconColor="text-blue-300"
            borderColor="border-blue-500/30"
          />
          <KPICard 
            title="Confirmadas" 
            value={metrics.confirmed} 
            icon={CheckCircle}
            bgColor="bg-emerald-500/20"
            iconColor="text-emerald-300"
            borderColor="border-emerald-500/30"
          />
          <KPICard 
            title="Canceladas" 
            value={metrics.cancelled} 
            icon={XCircle}
            bgColor="bg-rose-500/20"
            iconColor="text-rose-300"
            borderColor="border-rose-500/30"
          />
          <KPICard 
            title="Pendientes" 
            value={metrics.pending} 
            icon={Clock}
            bgColor="bg-amber-500/20"
            iconColor="text-amber-300"
            borderColor="border-amber-500/30"
          />
        </div>

        {/* Appointments Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-800">
            <h2 className="text-base font-semibold text-white">Citas del Día</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {appointments.length} citas registradas
            </p>
          </div>
          
          {appointments.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <p>No hay citas registradas para este clinic.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-4">Paciente</th>
                    <th className="p-4">Especialidad</th>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {appointments.map((appointment: Appointment) => (
                    <AppointmentRow key={appointment.id} appointment={appointment} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface KPICardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  bgColor: string;
  iconColor: string;
  borderColor: string;
}

function KPICard({ title, value, icon: Icon, bgColor, iconColor, borderColor }: KPICardProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${bgColor} ${iconColor}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
}

interface AppointmentRowProps {
  appointment: Appointment;
}

function AppointmentRow({ appointment }: AppointmentRowProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <tr className="hover:bg-slate-800/40 transition-colors">
      <td className="p-4">
        <div className="text-sm font-medium text-white">
          {appointment.patients?.full_name || 'Paciente sin nombre'}
        </div>
        <div className="text-xs text-gray-400">
          {appointment.patients?.phone || appointment.patient_id}
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-3 w-3 text-slate-400" />
          {appointment.ai_notes || 'Especialidad'}
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3 text-slate-400" />
          {formatDate(appointment.appointment_date)}
        </div>
      </td>
      <td className="p-4">
        <span className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold ${getStatusBadge(appointment.status)}`}>
          {appointment.status}
        </span>
      </td>
    </tr>
  );
}