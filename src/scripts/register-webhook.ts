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

interface AuthResponse {
  code: boolean;
  data: {
    token: string;
  };
  description: string;
  error: string[];
}

interface WebhookEndpoint {
  id: number;
  target_url: string;
  secret_key: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface WebhookSubscription {
  id: number;
  webhook_endpoint_id: number;
  institution_id: number;
  resource_type: string;
  event: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface NexHealthResponse {
  code: boolean;
  description?: string[];
  error?: string[];
  data: WebhookEndpoint[] | WebhookSubscription[];
  count: number;
}

async function getAuthToken(): Promise<string> {
  console.log('\nAuthenticating with NexHealth...');
  
  const response = await fetch('https://nexhealth.info/authenticates', {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.Nexhealth+json; version=2',
      'Authorization': process.env.NEXHEALTH_API_KEY || ''
    }
  });

  const responseText = await response.text();
  console.log('Auth response status:', response.status);
  console.log('Auth response:', responseText);

  if (!response.ok) {
    throw new Error(`Authentication failed: ${responseText}`);
  }

  const authData = JSON.parse(responseText) as AuthResponse;
  
  if (!authData.code || !authData.data.token) {
    throw new Error('Failed to get authentication token');
  }

  console.log('Successfully authenticated!');
  return authData.data.token;
}

async function registerWebhook() {
  const NEXHEALTH_API_URL = 'https://nexhealth.info/api/v1';
  const YOUR_WEBHOOK_URL = process.env.WEBHOOK_URL;

  if (!YOUR_WEBHOOK_URL) {
    console.error('Missing WEBHOOK_URL environment variable');
    process.exit(1);
  }

  try {
    const authToken = await getAuthToken();

    console.log('\nAttempting to register webhook...');
    console.log('API URL:', NEXHEALTH_API_URL);
    console.log('Target URL:', YOUR_WEBHOOK_URL);
    
    const response = await fetch(`${NEXHEALTH_API_URL}/webhook_endpoints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.Nexhealth+json; version=2',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        target_url: YOUR_WEBHOOK_URL
      })
    });

    console.log('\nResponse status:', response.status);
    const responseText = await response.text();
    console.log('Raw response:', responseText);

    const data = JSON.parse(responseText) as NexHealthResponse;
    if (!response.ok || !Array.isArray(data.data) || data.data.length === 0) {
      console.error('Failed to register webhook:', data);
      process.exit(1);
    }

    const endpoint = data.data[0] as WebhookEndpoint;
    console.log('Successfully registered webhook!');
    console.log('Webhook ID:', endpoint.id);
    console.log('Secret Key:', endpoint.secret_key);
    console.log('\nPlease add this secret key to your .env file as NEXHEALTH_WEBHOOK_SECRET');

    // Register for appointment updates
    console.log('\nRegistering for appointment_updated event...');
    const subscriptionResponse = await fetch(`${NEXHEALTH_API_URL}/webhook_subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.Nexhealth+json; version=2',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        webhook_endpoint_id: endpoint.id,
        resource_type: 'Appointment',
        event: 'appointment_updated'
      })
    });

    const subscriptionText = await subscriptionResponse.text();
    console.log('Subscription response:', subscriptionText);

    const subscriptionData = JSON.parse(subscriptionText) as NexHealthResponse;
    if (!subscriptionResponse.ok) {
      console.error('Failed to create webhook subscription:', subscriptionData);
      process.exit(1);
    }

    console.log('\nSuccessfully subscribed to appointment_updated events!');
    const subscription = subscriptionData.data[0] as WebhookSubscription;
    console.log('Subscription ID:', subscription.id);

  } catch (error) {
    console.error('Error in webhook registration process:', error);
    process.exit(1);
  }
}

registerWebhook().catch(console.error);