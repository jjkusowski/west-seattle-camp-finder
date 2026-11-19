import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia' as any,
});

// Admin Supabase client to bypass RLS and update user profiles
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      // In local dev without Stripe CLI webhook signature verification
      event = JSON.parse(body);
    }
  } catch (err: any) {
    console.error(`Webhook signature verification failed:`, err.message);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }

  // Handle successful checkout payment
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id || session.metadata?.userId;
    const customerId = session.customer as string;

    if (userId) {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          has_season_pass: true,
          stripe_customer_id: customerId || null,
        })
        .eq('id', userId);

      if (error) {
        console.error('Failed to update profile season pass:', error.message);
      } else {
        console.log(`Successfully granted Season Pass to user ${userId}`);
      }
    }
  }

  return NextResponse.json({ received: true });
}