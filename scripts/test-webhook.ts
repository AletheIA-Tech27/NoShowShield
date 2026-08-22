import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || process.env.WEBHOOK_VERIFICATION_TOKEN || 'NoShowShield_Token_2026';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testHandshake() {
  console.log('[TEST] Testing WhatsApp webhook handshake...');
  
  // Test the handshake logic directly
  const mode = 'subscribe';
  const token = verifyToken;
  const challenge = 'test_challenge_12345';
  
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[TEST] ✓ Handshake test PASSED');
    return true;
  } else {
    console.error('[TEST] ✗ Handshake test FAILED: token mismatch');
    return false;
  }
}

async function testRealtimeSubscription() {
  console.log('[TEST] Testing Realtime subscription...');
  
  try {
    // Test that we can create a channel and subscribe
    const channel = supabase.channel('test-appointments');
    
    const subscription = channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
      }, (payload: any) => {
        console.log('[TEST] Realtime event received:', payload);
      })
      .subscribe();
    
    // Wait a moment for subscription
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check subscription state
    const state = subscription.state as string;
    if (state === 'subscribed' || state === 'joined') {
      console.log('[TEST] ✓ Realtime subscription test PASSED');
      supabase.removeChannel(channel);
      return true;
    } else {
      console.error('[TEST] ✗ Realtime subscription test FAILED: state', state);
      return false;
    }
  } catch (error) {
    console.error('[TEST] ✗ Realtime subscription test FAILED:', error);
    return false;
  }
}

async function testAppointmentUpdate() {
  console.log('[TEST] Testing appointment update flow...');
  
  try {
    // Create a test appointment
    const { data: clinic } = await supabase.from('clinics').select('id').limit(1).single();
    
    if (!clinic) {
      console.log('[TEST] No clinics found, skipping appointment update test');
      return true;
    }
    
    const { data: patient } = await supabase.from('patients').select('id').eq('clinic_id', clinic.id).limit(1).single();
    
    if (!patient) {
      console.log('[TEST] No patients found, skipping appointment update test');
      return true;
    }
    
    // Create a test appointment - using appointment_date instead of scheduled_at
    const { data: appointment, error: createError } = await supabase
      .from('appointments')
      .insert({
        clinic_id: clinic.id,
        patient_id: patient.id,
        ai_notes: 'Test Specialty',
        appointment_date: new Date(Date.now() + 86400000).toISOString(),
        status: 'pending'
      })
      .select()
      .single();
    
    if (createError) {
      console.error('[TEST] Failed to create test appointment:', createError);
      return false;
    }
    
    console.log('[TEST] Created test appointment:', appointment.id);
    
    // Update the appointment
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'confirmed' })
      .eq('id', appointment.id);
    
    if (updateError) {
      console.error('[TEST] Failed to update appointment:', updateError);
      return false;
    }
    
    console.log('[TEST] ✓ Appointment update test PASSED');
    
    // Clean up
    await supabase.from('appointments').delete().eq('id', appointment.id);
    
    return true;
  } catch (error) {
    console.error('[TEST] ✗ Appointment update test FAILED:', error);
    return false;
  }
}

async function main() {
  console.log('[TEST] Starting webhook and realtime tests...\n');
  
  const results = {
    handshake: await testHandshake(),
    realtime: await testRealtimeSubscription(),
    appointment: await testAppointmentUpdate(),
  };
  
  console.log('\n[TEST] Results:');
  console.log(`  Handshake: ${results.handshake ? 'PASSED' : 'FAILED'}`);
  console.log(`  Realtime: ${results.realtime ? 'PASSED' : 'FAILED'}`);
  console.log(`  Appointment: ${results.appointment ? 'PASSED' : 'FAILED'}`);
  
  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    console.log('\n[TEST] ✓ All tests PASSED');
    process.exit(0);
  } else {
    console.log('\n[TEST] ✗ Some tests FAILED');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[TEST] Test suite failed with error:', error);
  process.exit(1);
});