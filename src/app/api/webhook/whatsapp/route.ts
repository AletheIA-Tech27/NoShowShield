import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Robust phone number sanitization for Mexican WhatsApp numbers
function sanitizePhoneNumber(rawPhone: string): string {
  const cleanNumber = rawPhone.replace(/\D/g, ''); // Strip all non-digits

  // Handle Mexican mobile numbers with legacy '1' prefix (521XXXXXXXXXX -> 52XXXXXXXXXX)
  if (cleanNumber.startsWith('521') && cleanNumber.length === 13) {
    return '52' + cleanNumber.slice(3);
  }

  // If 10 digits provided without country code, prefix '52'
  if (cleanNumber.length === 10) {
    return '52' + cleanNumber;
  }

  return cleanNumber;
}

// Normalize user intent to appointment status
function normalizeIntent(response: string): 'confirmed' | 'cancelled' | null {
  const normalized = response.trim().toUpperCase();
  if (normalized === '1' || normalized === 'SI' || normalized === 'CONFIRMAR') {
    return 'confirmed';
  }
  if (normalized === '2' || normalized === 'NO' || normalized === 'CANCELAR') {
    return 'cancelled';
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || process.env.WEBHOOK_VERIFICATION_TOKEN || 'NoShowShield_Token_2026';

  console.log(`[HANDSHAKE ATTEMPT] mode: ${mode}, token: ${token}, expected: ${expectedToken}`);

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[HANDSHAKE SUCCESS] Responding with challenge text');
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.error('[HANDSHAKE FAILED] Token mismatch or invalid mode');
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    // DEBUG: Log raw request body at the very top to capture ANY incoming request
    const rawBody = await req.text();
    console.log('[DEBUG] Incoming Webhook Body:', rawBody);
    
    const body = JSON.parse(rawBody);
    console.log('[WEBHOOK_EVENT]', JSON.stringify(body, null, 2));

    // Extract message details from Meta webhook payload
    const messages = body?.entry?.[0]?.changes?.[0]?.value?.messages;

    if (!messages || messages.length === 0) {
      console.log('[WEBHOOK] No messages in payload');
      return NextResponse.json({ status: 'EVENT_PROCESSED' }, { status: 200 });
    }

    const message = messages[0];
    const wamid = message?.id;
    const rawFrom = message?.from;
    const messageBody = message?.text?.body || '';

    // Idempotency check - check if message already processed
    const { data: existingAppointment, error: checkError } = await supabase
      .from('appointments')
      .select('id')
      .eq('last_whatsapp_msg_id', wamid)
      .single();

    if (existingAppointment) {
      console.log('[IDEMPOTENCY] Message already processed');
      return NextResponse.json({ status: 'ALREADY_PROCESSED' }, { status: 200 });
    }

    // Sanitize phone number with robust normalization
    const sanitizedPhone = sanitizePhoneNumber(rawFrom);
    console.log(`[WEBHOOK] Processing message from ${rawFrom} (sanitized: ${sanitizedPhone})`);

    // Normalize user intent
    const newStatus = normalizeIntent(messageBody);
    if (!newStatus) {
      console.log(`[WEBHOOK] Unrecognized response: "${messageBody}"`);
      return NextResponse.json({ status: 'EVENT_PROCESSED' }, { status: 200 });
    }

    // Lookup patient to get clinic_id - try both sanitized and 10-digit formats
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, clinic_id, phone')
      .or(`eq(phone, ${sanitizedPhone}), eq(phone, ${sanitizedPhone.slice(-10)})`)
      .single();

    if (patientError || !patient) {
      console.log(`[WEBHOOK] No patient found for phone ${sanitizedPhone}`);
      return NextResponse.json({ status: 'EVENT_PROCESSED' }, { status: 200 });
    }

    const clinicId = patient.clinic_id;
    const patientId = patient.id;

    console.log(`[WEBHOOK] Found patient ${patientId} with clinic_id: ${clinicId}`);

    // Fetch latest pending appointment for this patient and clinic
    // Note: Using lowercase 'pending' to match PostgreSQL ENUM definition
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, status, clinic_id, patient_id')
      .eq('patient_id', patientId)
      .eq('clinic_id', clinicId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (appointmentError) {
      console.error('[WEBHOOK] Error fetching appointment:', appointmentError);
      return NextResponse.json({ status: 'EVENT_PROCESSED' }, { status: 200 });
    }

    if (!appointment) {
      console.log(`[WEBHOOK] No pending appointment found for patient ${patientId} in clinic ${clinicId}`);
      return NextResponse.json({ status: 'EVENT_PROCESSED' }, { status: 200 });
    }

    // Update appointment status and store message ID, explicitly including clinic_id
    // Note: Status values are lowercase to match PostgreSQL ENUM definition
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ 
        status: newStatus,
        last_whatsapp_msg_id: wamid,
        clinic_id: clinicId,
        patient_id: patientId
      })
      .eq('id', appointment.id)
      .eq('clinic_id', clinicId)
      .eq('patient_id', patientId);

    if (updateError) {
      console.error('[WEBHOOK] Error updating appointment:', updateError);
      return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
    }

    console.log(`[WEBHOOK] Successfully updated appointment ${appointment.id} to ${newStatus}`);

    return NextResponse.json({ status: 'EVENT_PROCESSED' }, { status: 200 });
  } catch (error) {
    console.error('[WEBHOOK_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}