'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

type PaymentStatus = 'idle' | 'processing' | 'success' | 'error';

interface PackageInfo {
    id: string;
    name: string;
    credits: number;
    price: number;
    paymentLink: string;
}

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    packageInfo: PackageInfo | null;
    clientSecret?: string | null;
}

function CheckoutForm({ packageInfo, clientSecret, onSuccess }: { packageInfo: PackageInfo; clientSecret: string; onSuccess: () => void }) {
    const stripe = useStripe();
    const elements = useElements();
    const [status, setStatus] = useState<PaymentStatus>('idle');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setStatus('processing');
        setError(null);

        const { error: submitError } = await elements.submit();
        if (submitError) {
            setError(submitError.message ?? 'Validation failed');
            setStatus('error');
            return;
        }

        const { error: confirmError } = await stripe.confirmPayment({
            elements,
            clientSecret,
            confirmParams: {
                return_url: `${window.location.origin}/billing?payment=success`,
            },
            redirect: 'if_required',
        });

        if (confirmError) {
            setError(confirmError.message ?? 'Payment failed');
            setStatus('error');
        } else {
            setStatus('success');
            setTimeout(onSuccess, 2000);
        }
    }, [stripe, elements, clientSecret, onSuccess]);

    if (status === 'success') {
        return (
            <div className="flex flex-col items-center justify-center py-10">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 mb-5 animate-[scale-in_300ms_ease-out]">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="text-lg font-semibold text-zinc-100">Payment successful!</p>
                <p className="mt-1.5 text-sm text-zinc-500">
                    {packageInfo.credits.toLocaleString()} credits added to your account
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Stripe Payment Element */}
            <div className="rounded-xl">
                <PaymentElement
                    options={{
                        layout: {
                            type: 'tabs',
                            defaultCollapsed: false,
                        },
                        business: {
                            name: 'Persona Engine',
                        },
                    }}
                />
            </div>

            {/* Error display */}
            {error && (
                <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500/20">
                        <span className="text-[10px] text-red-400">!</span>
                    </div>
                    <span className="text-xs text-red-400 leading-relaxed">{error}</span>
                </div>
            )}

            {/* Pay button */}
            <button
                type="submit"
                disabled={!stripe || !elements || status === 'processing'}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-indigo-500 px-4 py-3.5 text-sm font-semibold text-white transition-all hover:bg-indigo-400 hover:shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
                {status === 'processing' ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing…
                    </>
                ) : (
                    <>
                        <Lock className="h-3.5 w-3.5" />
                        Pay ${packageInfo.price}
                    </>
                )}
            </button>

            {/* Trust badge */}
            <div className="flex items-center justify-center gap-1.5 pt-1">
                <ShieldCheck className="h-3 w-3 text-zinc-600" />
                <p className="text-[10px] text-zinc-600">
                    Encrypted end-to-end · Powered by Stripe
                </p>
            </div>
        </form>
    );
}

export function CheckoutModal({ isOpen, onClose, packageInfo, clientSecret }: CheckoutModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    }, [onClose]);

    if (!isOpen || !packageInfo) return null;

    return (
        <div
            ref={overlayRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            style={{ animation: 'fade-in 200ms ease-out' }}
        >
            <div
                className="relative w-full max-w-md mx-4"
                style={{ animation: 'modal-enter 300ms ease-out' }}
            >
                <div className="rounded-2xl border border-white/10 bg-[#0c0c0e]/95 backdrop-blur-xl shadow-2xl overflow-hidden">

                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                        <div>
                            <h2 className="text-base font-semibold text-zinc-100">Complete Purchase</h2>
                            <p className="text-xs text-zinc-500 mt-0.5">Choose a payment method below</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Package Summary */}
                    <div className="mx-6 mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{packageInfo.name} Pack</span>
                                <p className="text-sm text-zinc-300 mt-0.5">{packageInfo.credits.toLocaleString()} credits</p>
                            </div>
                            <div className="text-right">
                                <span className="text-xl font-bold text-zinc-100">${packageInfo.price}</span>
                                <p className="text-[10px] text-zinc-600">one-time</p>
                            </div>
                        </div>
                    </div>

                    {/* Payment Form */}
                    <div className="px-6 py-5">
                        {clientSecret ? (
                            <CheckoutForm
                                packageInfo={packageInfo}
                                clientSecret={clientSecret}
                                onSuccess={onClose}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10">
                                <Loader2 className="h-6 w-6 animate-spin text-zinc-500 mb-3" />
                                <p className="text-xs text-zinc-500">Setting up secure checkout…</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
