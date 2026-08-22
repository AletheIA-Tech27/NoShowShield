import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export interface WhatsAppMessage {
  id: string;
  from: string;
  body: string;
  timestamp: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  metadata?: Record<string, any>;
}

export interface ConversationRecord {
  id?: string;
  whatsapp_message_id: string;
  phone_number: string;
  message_body: string;
  message_type: string;
  timestamp: string;
  intent: string | null;
  date: string | null;
  time: string | null;
  raw_summary: string | null;
  created_at?: string;
}

export interface AppointmentRecord {
  id?: string;
  phone_number: string;
  intent: string;
  date: string | null;
  time: string | null;
  summary: string | null;
  status: 'PENDING' | 'BOOKED' | 'CANCELLED' | 'RESCHEDULED';
  created_at?: string;
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function storeConversation(message: WhatsAppMessage, intentResult?: {
  intent: string;
  date: string | null;
  time: string | null;
  raw_summary: string;
}): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const conversationRecord: ConversationRecord = {
      whatsapp_message_id: message.id,
      phone_number: message.from,
      message_body: message.body,
      message_type: message.type,
      timestamp: message.timestamp,
      intent: intentResult?.intent || null,
      date: intentResult?.date || null,
      time: intentResult?.time || null,
      raw_summary: intentResult?.raw_summary || null,
    };

    const { data, error } = await supabase
      .from('conversations')
      .insert(conversationRecord)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error storing conversation:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[Supabase] Exception storing conversation:', error);
    return { success: false, error: String(error) };
  }
}

export async function storeAppointmentIntent(message: WhatsAppMessage, intentResult: {
  intent: string;
  date: string | null;
  time: string | null;
  raw_summary: string;
}): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const appointmentRecord: AppointmentRecord = {
      phone_number: message.from,
      intent: intentResult.intent,
      date: intentResult.date,
      time: intentResult.time,
      summary: intentResult.raw_summary,
      status: 'PENDING',
    };

    const { data, error } = await supabase
      .from('appointments')
      .insert(appointmentRecord)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error storing appointment intent:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[Supabase] Exception storing appointment intent:', error);
    return { success: false, error: String(error) };
  }
}

export async function getConversationsByPhone(phoneNumber: string, limit = 50): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('phone_number', phoneNumber)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Supabase] Error fetching conversations:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[Supabase] Exception fetching conversations:', error);
    return { success: false, error: String(error) };
  }
}

export async function updateConversationWithIntent(
  messageId: string,
  intentResult: {
    intent: string;
    date: string | null;
    time: string | null;
    raw_summary: string;
  }
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .update({
        intent: intentResult.intent,
        date: intentResult.date,
        time: intentResult.time,
        raw_summary: intentResult.raw_summary,
      })
      .eq('whatsapp_message_id', messageId)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error updating conversation with intent:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[Supabase] Exception updating conversation with intent:', error);
    return { success: false, error: String(error) };
  }
}