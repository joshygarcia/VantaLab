import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

let stripeClient: Stripe | null = null;

function getStripeClient() {
    if (stripeClient) {
        return stripeClient;
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
        throw new Error('Missing STRIPE_SECRET_KEY');
    }

    stripeClient = new Stripe(stripeSecretKey, {
        apiVersion: '2026-01-28.clover',
    });

    return stripeClient;
}

// Map package IDs to their Stripe price IDs
const PACKAGE_PRICES: Record<string, { amountInCents: number; credits: number }> = {
    starter: { amountInCents: 500, credits: 500 },
    creator: { amountInCents: 1000, credits: 1000 },
    pro: { amountInCents: 5000, credits: 5500 },
    studio: { amountInCents: 10000, credits: 11500 },
};

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { packageId } = await request.json();

        const pkg = PACKAGE_PRICES[packageId];
        if (!pkg) {
            return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
        }

        const stripe = getStripeClient();

        const paymentIntent = await stripe.paymentIntents.create({
            amount: pkg.amountInCents,
            currency: 'usd',
            automatic_payment_methods: { enabled: true },
            metadata: {
                packageId,
                userId: user.id,
                credits: String(pkg.credits),
            },
        });

        return NextResponse.json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
        console.error('PaymentIntent creation error:', err);
        return NextResponse.json(
            { error: 'Failed to create payment intent' },
            { status: 500 }
        );
    }
}
