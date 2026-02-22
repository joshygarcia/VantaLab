'use client';

import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { ReactNode } from 'react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface StripeProviderProps {
    clientSecret: string;
    children: ReactNode;
}

export function StripeProvider({ clientSecret, children }: StripeProviderProps) {
    return (
        <Elements
            stripe={stripePromise}
            options={{
                clientSecret,
                appearance: {
                    theme: 'night',
                    variables: {
                        colorPrimary: '#6366f1',
                        colorBackground: '#0c0c0e',
                        colorText: '#e4e4e7',
                        colorTextSecondary: '#71717a',
                        colorTextPlaceholder: '#52525b',
                        colorDanger: '#ef4444',
                        colorSuccess: '#22c55e',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontSizeBase: '14px',
                        fontSizeSm: '12px',
                        borderRadius: '10px',
                        spacingUnit: '4px',
                        spacingGridRow: '14px',
                        spacingGridColumn: '12px',
                    },
                    rules: {
                        '.Input': {
                            border: '1px solid rgba(255,255,255,0.08)',
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            boxShadow: 'none',
                            padding: '12px 14px',
                            transition: 'border-color 150ms ease, box-shadow 150ms ease',
                        },
                        '.Input:hover': {
                            border: '1px solid rgba(255,255,255,0.15)',
                        },
                        '.Input:focus': {
                            border: '1px solid rgba(99,102,241,0.5)',
                            boxShadow: '0 0 0 1px rgba(99,102,241,0.2)',
                        },
                        '.Label': {
                            fontWeight: '500',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            color: '#71717a',
                            marginBottom: '6px',
                        },
                        '.Tab': {
                            border: '1px solid rgba(255,255,255,0.08)',
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            boxShadow: 'none',
                            borderRadius: '10px',
                            padding: '10px 12px',
                        },
                        '.Tab:hover': {
                            border: '1px solid rgba(255,255,255,0.15)',
                            backgroundColor: 'rgba(255,255,255,0.04)',
                        },
                        '.Tab--selected': {
                            border: '1px solid rgba(99,102,241,0.4)',
                            backgroundColor: 'rgba(99,102,241,0.08)',
                            boxShadow: '0 0 0 1px rgba(99,102,241,0.15)',
                        },
                        '.Tab--selected:hover': {
                            border: '1px solid rgba(99,102,241,0.5)',
                            backgroundColor: 'rgba(99,102,241,0.1)',
                        },
                        '.TabIcon--selected': {
                            color: '#818cf8',
                        },
                        '.TabLabel--selected': {
                            color: '#c7d2fe',
                        },
                        '.Block': {
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '10px',
                        },
                        '.CheckboxInput': {
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.1)',
                        },
                        '.CheckboxInput--checked': {
                            backgroundColor: '#6366f1',
                            borderColor: '#6366f1',
                        },
                    },
                },
            }}
        >
            {children}
        </Elements>
    );
}
