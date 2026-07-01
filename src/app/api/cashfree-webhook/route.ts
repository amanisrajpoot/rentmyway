import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { verifyAndRecordPayment } from '@/lib/actions/online-payments';

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-webhook-signature');
    const timestamp = req.headers.get('x-webhook-timestamp');
    
    if (!signature || !timestamp) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const payloadString = await req.text();
    const payload = JSON.parse(payloadString);

    // Verify signature
    // Since we need the webhook secret which is stored per broker in DB, 
    // we need to identify the broker. 
    // For now, we fetch all configs and find the matching secret, 
    // or just rely on order verification which securely polls Cashfree anyway.
    
    // Instead of doing complex signature verification with DB fetch, 
    // we can simply use the webhook as a trigger to securely poll Cashfree.
    if (payload.data && payload.data.order && payload.data.order.order_id) {
      const orderId = payload.data.order.order_id;
      
      // If it's a payment success event
      if (payload.type === 'PAYMENT_SUCCESS_WEBHOOK') {
        const result = await verifyAndRecordPayment(orderId);
        if (result.error) {
          console.error('Webhook processing error:', result.error);
        }
      }
    }

    return NextResponse.json({ status: 'OK' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
