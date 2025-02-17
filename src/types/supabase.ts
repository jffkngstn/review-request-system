// src/types/supabase.ts
export interface ReviewRequest {
  id: string;
  created_at: string;
  patient_email: string;
  appointment_id: string;
  practice_id: string;
  scheduled_send_time: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  error_message?: string;
  metadata?: {
    patient_name?: string;
    practice_name?: string;
    appointment_time?: string;
  };
}

export interface Database {
  public: {
    Tables: {
      review_requests: {
        Row: ReviewRequest;
        Insert: Omit<ReviewRequest, 'id' | 'created_at'>;
        Update: Partial<Omit<ReviewRequest, 'id' | 'created_at'>>;
      };
    };
  };
}