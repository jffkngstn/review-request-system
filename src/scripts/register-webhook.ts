// src/scripts/register-webhook.ts
import 'dotenv/config';
import fetch from 'node-fetch';

interface WebhookEndpoint {
  id: number;
  target_url: string;
  secret_key: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface NexHealthResponse {
  code: boolean;
  description?: string[];
  error?: string[];
  data: WebhookEndpoint[];
  count: number;
}

async function registerWebhook() {
  const NEXHEALTH_API_URL = 'https://api.nexhealth.com/api/v1';
  const NEXHEALTH_API_KEY = process.env.NEXHEALTH_API_KEY;
  const YOUR_WEBHOOK_URL = process.env.WEBHOOK_URL;

  // Add debugging
  console.log('Environment variables:');
  console.log('NEXHEALTH_API_KEY exists:', !!NEXHEALTH_API_KEY);
  console.log('WEBHOOK_URL:', YOUR_WEBHOOK_URL);
  
  if (!NEXHEALTH_API_KEY || !YOUR_WEBHOOK_URL) {
    console.error('Missing required environment variables:');
    if (!NEXHEALTH_API_KEY) console.error('- NEXHEALTH_API_KEY is missing');
    if (!YOUR_WEBHOOK_URL) console.error('- WEBHOOK_URL is missing');
    process.exit(1);
  }

  try {
    const response = await fetch(`${NEXHEALTH_API_URL}/webhook_endpoints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NEXHEALTH_API_KEY}`
      },
      body: JSON.stringify({
        target_url: YOUR_WEBHOOK_URL
      })
    });

    const data = await response.json() as NexHealthResponse;

    if (!response.ok) {
      console.error('Failed to register webhook:', data);
      process.exit(1);
    }

    // Save the secret key to your .env file
    const secretKey = data.data[0].secret_key;
    console.log('Successfully registered webhook!');
    console.log('Webhook ID:', data.data[0].id);
    console.log('Secret Key:', secretKey);
    console.log('\nPlease add this secret key to your .env file as NEXHEALTH_WEBHOOK_SECRET');

    // Now register for the appointment.completed event
    const subscriptionResponse = await fetch(`${NEXHEALTH_API_URL}/webhook_subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NEXHEALTH_API_KEY}`
      },
      body: JSON.stringify({
        webhook_endpoint_id: data.data[0].id,
        event_type: 'appointment.completed'
      })
    });

    const subscriptionData = await subscriptionResponse.json() as NexHealthResponse;

    if (!subscriptionResponse.ok) {
      console.error('Failed to create webhook subscription:', subscriptionData);
      process.exit(1);
    }

    console.log('\nSuccessfully subscribed to appointment.completed events!');
    console.log('Subscription ID:', subscriptionData.data[0].id);

  } catch (error) {
    console.error('Error registering webhook:', error);
    process.exit(1);
  }
}

registerWebhook().catch(console.error);