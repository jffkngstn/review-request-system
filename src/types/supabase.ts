// src/types/supabase.ts

export type ReviewRequestStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export type ReviewRequest = {
  id: string;
  created_at: string;
  updated_at: string;
  patient_email: string;
  patient_name: string | null;
  appointment_id: string;
  practice_id: string;
  practice_name: string | null;
  scheduled_send_time: string;
  sent_at: string | null;
  status: ReviewRequestStatus;
  error_message: string | null;
  retry_count: number;
  raw_webhook_data: Record<string, any> | null;
};