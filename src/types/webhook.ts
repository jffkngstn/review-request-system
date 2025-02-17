// src/types/webhook.ts
export interface NexHealthAppointment {
  id: string;
  patient: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  practice: {
    id: string;
    name: string;
  };
  scheduled_time: string;
  status: string;
}

export interface NexHealthWebhook {
  type: string;
  data: NexHealthAppointment;
  timestamp: string;
}