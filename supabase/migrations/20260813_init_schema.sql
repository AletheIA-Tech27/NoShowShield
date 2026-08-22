-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Clínicas (Tenants)
CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Pacientes
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enum para los estados de la cita
CREATE TYPE appointment_status AS ENUM ('PENDING', 'CONFIRM', 'RESCHEDULE', 'CANCEL', 'UNKNOWN');

-- 4. Tabla de Citas
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  specialty VARCHAR(100) NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status appointment_status DEFAULT 'PENDING',
  last_ai_reason TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de Mensajes / Logs de IA (Auditoría)
CREATE TABLE IF NOT EXISTS ai_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  raw_message TEXT NOT NULL,
  detected_intent VARCHAR(50) NOT NULL,
  confidence NUMERIC(3,2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clinics
CREATE POLICY "clinics_select_policy" ON clinics
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "clinics_insert_policy" ON clinics
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "clinics_update_policy" ON clinics
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "clinics_delete_policy" ON clinics
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for patients
CREATE POLICY "patients_select_policy" ON patients
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "patients_insert_policy" ON patients
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "patients_update_policy" ON patients
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "patients_delete_policy" ON patients
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for appointments
CREATE POLICY "appointments_select_policy" ON appointments
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "appointments_insert_policy" ON appointments
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "appointments_update_policy" ON appointments
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "appointments_delete_policy" ON appointments
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for ai_logs
CREATE POLICY "ai_logs_select_policy" ON ai_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "ai_logs_insert_policy" ON ai_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "ai_logs_update_policy" ON ai_logs
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "ai_logs_delete_policy" ON ai_logs
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Enable Realtime publication for appointments table
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;