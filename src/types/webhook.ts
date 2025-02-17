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

// src/lib/webhook-validator.ts
import crypto from 'crypto';

export class WebhookValidator {
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  validateSignature(payload: string, signature: string): boolean {
    const hmac = crypto.createHmac('sha256', this.secret);
    const calculatedSignature = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculatedSignature)
    );
  }

  validateTimestamp(timestamp: string): boolean {
    const eventTime = new Date(timestamp).getTime();
    const currentTime = Date.now();
    const fiveMinutesMs = 5 * 60 * 1000;
    return Math.abs(currentTime - eventTime) < fiveMinutesMs;
  }
}

// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// src/pages/api/nexhealth/webhook.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { WebhookValidator } from '@/lib/webhook-validator';
import { supabase } from '@/lib/supabase';
import { NexHealthWebhook } from '@/types/webhook';
import { addHours } from 'date-fns';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 1. Validate HTTP method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 2. Parse and validate webhook signature
    const signature = req.headers['x-nexhealth-signature'];
    if (!signature || Array.isArray(signature)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const validator = new WebhookValidator(process.env.NEXHEALTH_WEBHOOK_SECRET!);
    const rawBody = JSON.stringify(req.body);
    
    if (!validator.validateSignature(rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 3. Parse webhook data
    const webhook = req.body as NexHealthWebhook;

    // 4. Validate webhook type
    if (webhook.type !== 'appointment.completed') {
      return res.status(200).json({ message: 'Event type not relevant' });
    }

    // 5. Validate timestamp
    if (!validator.validateTimestamp(webhook.timestamp)) {
      return res.status(400).json({ error: 'Invalid timestamp' });
    }

    // 6. Create review request
    const scheduledSendTime = addHours(new Date(webhook.data.scheduled_time), 24);
    
    const { error } = await supabase
      .from('review_requests')
      .insert({
        patient_email: webhook.data.patient.email,
        appointment_id: webhook.data.id,
        practice_id: webhook.data.practice.id,
        scheduled_send_time: scheduledSendTime.toISOString(),
        status: 'pending',
        metadata: {
          patient_name: `${webhook.data.patient.first_name} ${webhook.data.patient.last_name}`,
          practice_name: webhook.data.practice.name,
          appointment_time: webhook.data.scheduled_time
        }
      });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to store review request' });
    }

    // 7. Return success
    return res.status(200).json({ message: 'Review request scheduled' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}