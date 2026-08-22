export type Database = {
  public: {
    Tables: {
      clinics: {
        Row: {
          id: string;
          name: string;
          phone_number: string | null;
          created_at: string;
        };
        Insert: {
          name: string;
          phone_number?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          phone_number?: string;
          created_at?: string;
        };
      };
      patients: {
        Row: {
          id: string;
          clinic_id: string | null;
          full_name: string;
          phone: string;
          created_at: string;
        };
        Insert: {
          clinic_id?: string;
          full_name: string;
          phone: string;
          created_at?: string;
        };
        Update: {
          clinic_id?: string;
          full_name?: string;
          phone?: string;
          created_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          tenant_id: string | null;
          patient_id: string | null;
          specialty: string;
          scheduled_at: string;
          status: 'PENDING' | 'CONFIRM' | 'RESCHEDULE' | 'CANCEL' | 'UNKNOWN';
          last_ai_reason: string | null;
          last_whatsapp_msg_id: string | null;
          updated_at: string | null;
          created_at: string;
        };
        Insert: {
          tenant_id?: string;
          patient_id?: string;
          specialty: string;
          scheduled_at: string;
          status?: 'PENDING' | 'CONFIRM' | 'RESCHEDULE' | 'CANCEL' | 'UNKNOWN';
          last_ai_reason?: string;
          last_whatsapp_msg_id?: string;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          tenant_id?: string;
          patient_id?: string;
          specialty?: string;
          scheduled_at?: string;
          status?: 'PENDING' | 'CONFIRM' | 'RESCHEDULE' | 'CANCEL' | 'UNKNOWN';
          last_ai_reason?: string;
          last_whatsapp_msg_id?: string;
          updated_at?: string;
          created_at?: string;
        };
      };
      ai_logs: {
        Row: {
          id: string;
          appointment_id: string | null;
          raw_message: string;
          detected_intent: string;
          confidence: number;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          appointment_id?: string;
          raw_message: string;
          detected_intent: string;
          confidence: number;
          reason?: string;
          created_at?: string;
        };
        Update: {
          appointment_id?: string;
          raw_message?: string;
          detected_intent?: string;
          confidence?: number;
          reason?: string;
          created_at?: string;
        };
      };
      tenants: {
        Row: {
          id: string;
          whatsapp_phone_number_id: string;
          created_at: string;
        };
        Insert: {
          whatsapp_phone_number_id: string;
          created_at?: string;
        };
        Update: {
          whatsapp_phone_number_id?: string;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
};