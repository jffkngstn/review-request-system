// src/scripts/register-webhook.ts
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import fetch from 'node-fetch';

// Explicitly load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Looking for .env.local at:', envPath);
console.log('File exists:', fs.existsSync(envPath));

if (!fs.existsSync(envPath)) {
  console.error('.env.local file not found!');
  process.exit(1);
}

const envConfig = dotenv.parse(fs.readFileSync(envPath));
// Manually set environment variables
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

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
  console.log('\nEnvironment variables:');
  console.log('NEXHEALTH_API_KEY exists:', !!NEXHEALTH_API_KEY);
  console.log('WEBHOOK_URL:', YOUR_WEBHOOK_URL);
  
  if (!NEXHEALTH_API_KEY || !YOUR_WEBHOOK_URL) {
    console.error('\nMissing required environment variables:');
    if (!NEXHEALTH_API_KEY) console.error('- NEXHEALTH_API_KEY is missing');
    if (!YOUR_WEBHOOK_URL) console.error('- WEBHOOK_URL is missing');
    process.exit(1);
  }

  try {
    console.log('\nAttempting to register webhook...');
    console.log('Target URL:', YOUR_WEBHOOK_URL);
    
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
    console.log('\nRegistering for appointment.completed event...');
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