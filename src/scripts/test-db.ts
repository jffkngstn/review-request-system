// src/scripts/test-db.ts
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import type { ReviewRequest, ReviewRequestStatus } from '../types/supabase';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDatabase() {
  console.log('Testing database connection and operations...\n');

  try {
    // Test 1: Insert a test review request
    console.log('Test 1: Inserting test review request...');
    
    const { data: insertedData, error: insertError } = await supabase
      .from('review_requests')
      .insert({
        patient_email: 'test@example.com',
        appointment_id: 'test_apt_123',
        practice_id: 'test_practice_456',
        scheduled_send_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending' as ReviewRequestStatus
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    if (!insertedData) {
      throw new Error('No data returned from insert');
    }
    
    console.log('✓ Insert successful');
    console.log('Inserted data:', insertedData);

    // Test 2: Update the record
    console.log('\nTest 2: Updating record...');
    const { error: updateError } = await supabase
      .from('review_requests')
      .update({
        status: 'sent' as ReviewRequestStatus,
        sent_at: new Date().toISOString()
      })
      .eq('id', insertedData.id);

    if (updateError) {
      throw updateError;
    }
    console.log('✓ Update successful');

    // Cleanup: Delete test data
    console.log('\nCleaning up test data...');
    const { error: deleteError } = await supabase
      .from('review_requests')
      .delete()
      .eq('id', insertedData.id);

    if (deleteError) {
      throw deleteError;
    }
    console.log('✓ Cleanup successful');

    console.log('\n✓ All tests completed successfully!');
  } catch (error) {
    console.error('\n⨯ Test failed:', error);
    process.exit(1);
  }
}

// Run the tests
testDatabase();