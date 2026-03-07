'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ChevronDown,
  Clock,
  CreditCard,
  Filter,
  Loader2,
  Plus,
  TrendingUp,
  Wallet,
  Zap
} from 'lucide-react';
import { CheckoutModal } from '@/components/billing/CheckoutModal';
import { StripeProvider } from '@/components/billing/StripeProvider';
import { BillingTransaction, getBillingBalance, listBillingTransactions } from '@/lib/api';
import { StudioPageShell } from '@/components/studio/StudioPageShell';
import { STUDIO_PANEL_CLASS, STUDIO_PANEL_MUTED_CLASS } from '@/components/studio/StudioSection';
import { studioGhostButtonClass, studioKickerClass } from '@/components/studio/StudioControls';

const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Dip your toes into AI generation',
    credits: 500,
    price: 5,
    perCredit: '$0.010',
    badge: null,
    popular: false,
    color: 'from-zinc-400/12 to-zinc-600/0',
    paymentLink: ''
  },
  {
    id: 'creator',
    name: 'Creator',
    tagline: 'For regular content production',
    credits: 1000,
    price: 10,
    perCredit: '$0.010',
    badge: null,
    popular: false,
    color: 'from-zinc-300/10 to-zinc-500/0',
    paymentLink: ''
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For power users and small teams',
    credits: 5500,
    price: 50,
    perCredit: 'Save 9%',
    badge: 'Best Value',
    popular: true,
    color: 'from-zinc-200/12 to-zinc-500/0',
    paymentLink: ''
  },
  {
    id: 'studio',
    name: 'Studio',
    tagline: 'For high-volume productions',
    credits: 11500,
    price: 100,
    perCredit: 'Save 13%',
    badge: 'Studio Scale',
    popular: false,
    color: 'from-zinc-300/10 to-zinc-500/0',
    paymentLink: ''
  }
] as const;

const PACKAGE_NAME_BY_ID: Record<string, string> = CREDIT_PACKAGES.reduce<Record<string, string>>((acc, pkg) => {
  acc[pkg.id] = pkg.name;
  return acc;
}, {});

type TypeFilter = 'all' | 'credit';

type TransactionRow = {
  id: string;
  date: string;
  description: string;
  type: 'credit';
  credits: number;
  balance: number;
};

const panelClass = STUDIO_PANEL_CLASS;
const panelMutedClass = STUDIO_PANEL_MUTED_CLASS;

export default function BillingPage() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<typeof CREDIT_PACKAGES[number] | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const [currentCredits, setCurrentCredits] = useState(0);
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [isBillingLoading, setIsBillingLoading] = useState(true);
  const [billingError, setBillingError] = useState<string | null>(null);

  const loadBilling = useCallback(async () => {
    setIsBillingLoading(true);
    setBillingError(null);

    try {
      const [balanceResponse, transactionsResponse] = await Promise.all([
        getBillingBalance(),
        listBillingTransactions(100)
      ]);

      setCurrentCredits(balanceResponse.credits);
      setTransactions(transactionsResponse.transactions);
    } catch (error) {
      console.error('Failed to load billing data:', error);
      setBillingError('Failed to load billing data. Please refresh and try again.');
    } finally {
      setIsBillingLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  const transactionRows = useMemo<TransactionRow[]>(() => {
    const sorted = [...transactions].sort((a, b) => b.processedAt.localeCompare(a.processedAt));
    let runningBalance = currentCredits;

    return sorted.map((transaction) => {
      const packageName = PACKAGE_NAME_BY_ID[transaction.packageId] ?? transaction.packageId;
      const paidLabel = `$${(transaction.amountInCents / 100).toFixed(2)}`;
      const row: TransactionRow = {
        id: transaction.id,
        date: transaction.processedAt.slice(0, 10),
        description: `Credit Purchase — ${packageName} (${paidLabel})`,
        type: 'credit',
        credits: transaction.credits,
        balance: runningBalance
      };

      runningBalance -= transaction.credits;
      return row;
    });
  }, [currentCredits, transactions]);

  const filteredTransactions = useMemo(() => {
    return transactionRows.filter((transaction) => {
      if (typeFilter !== 'all' && transaction.type !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [transactionRows, typeFilter]);

  const thisMonthTotals = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const monthlyTransactions = transactions.filter((transaction) => transaction.processedAt >= monthStart);
    const purchasesInCents = monthlyTransactions.reduce((sum, transaction) => sum + transaction.amountInCents, 0);
    const avgCreditsPerPurchase = monthlyTransactions.length
      ? Math.round(monthlyTransactions.reduce((sum, transaction) => sum + transaction.credits, 0) / monthlyTransactions.length)
      : 0;

    return {
      purchasesInCents,
      purchaseCount: monthlyTransactions.length,
      avgCreditsPerPurchase
    };
  }, [transactions]);

  const lowBalanceThreshold = 500;
  const isLowBalance = currentCredits < lowBalanceThreshold;

  const handlePurchase = useCallback(async (pkg: typeof CREDIT_PACKAGES[number]) => {
    setSelectedPackage(pkg);
    setCheckoutOpen(true);

    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id })
      });

      const data = (await response.json()) as { clientSecret?: string; error?: string };
      if (!response.ok || !data.clientSecret) {
        throw new Error(data.error ?? 'Failed to create payment intent');
      }

      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      setBillingError('Could not start checkout. Please try again.');
      setCheckoutOpen(false);
      setSelectedPackage(null);
      setClientSecret(null);
    }
  }, []);

  const handleCloseCheckout = useCallback(() => {
    setCheckoutOpen(false);
    setSelectedPackage(null);
    setClientSecret(null);
    void loadBilling();
    window.setTimeout(() => {
      void loadBilling();
    }, 2000);
  }, [loadBilling]);

  return (
    <StudioPageShell className="relative flex min-h-full flex-col">
      <div className="mx-auto flex w-full max-w-5xl flex-grow flex-col pt-8 lg:pt-12">
        <div className="mb-10">
          <span className={studioKickerClass}>
            <span className="h-1.5 w-1.5 rounded-full bg-studio-gold" />
            Billing Control
          </span>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-studio-700 bg-studio-900/85">
              <Wallet className="h-5 w-5 text-studio-cream" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Billing</h1>
              <p className="text-sm text-zinc-500">Manage your credits and view transaction history</p>
            </div>
          </div>
        </div>

        {billingError ? (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {billingError}
          </div>
        ) : null}

        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          <div className={`relative overflow-hidden p-6 sm:col-span-1 ${panelMutedClass}`}>
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-white/5 blur-3xl" />
            <div className="relative">
              <div className="mb-4 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-zinc-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Current Credits</span>
              </div>
              {isBillingLoading ? (
                <div className="flex items-center gap-2 text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight text-zinc-50">{currentCredits.toLocaleString()}</span>
                  <span className="text-sm text-zinc-400">credits</span>
                </div>
              )}
              {isLowBalance ? (
                <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-studio-600/60 bg-studio-900/90 px-2.5 py-1.5">
                  <Zap className="h-3 w-3 text-zinc-300" />
                  <span className="text-[11px] font-medium text-zinc-300">Low balance - add credits soon</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className={`${panelMutedClass} p-6`}>
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-zinc-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">This Month</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight text-zinc-50">${(thisMonthTotals.purchasesInCents / 100).toFixed(2)}</span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">Across {thisMonthTotals.purchaseCount} credit purchases</p>
          </div>

          <div className={`${panelMutedClass} p-6`}>
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Avg / Purchase</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight text-zinc-50">{thisMonthTotals.avgCreditsPerPurchase.toLocaleString()}</span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">Credits per purchase this month</p>
          </div>
        </div>

        <div className="mb-10">
          <div className="mb-5 flex items-center gap-2">
            <Plus className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Add Credits</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CREDIT_PACKAGES.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => {
                  void handlePurchase(pkg);
                }}
                className={`group relative flex flex-col overflow-hidden rounded-xl border p-5 text-left transition-colors duration-200 ${pkg.popular
                  ? 'border-studio-600 bg-studio-800/85 hover:border-zinc-400 hover:bg-studio-800'
                  : 'border-studio-700 bg-studio-900/85 hover:border-studio-600 hover:bg-studio-800/90'}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${pkg.color} opacity-0 transition-opacity group-hover:opacity-100`} />

                {pkg.badge ? (
                  <div className={`absolute right-3 top-3 rounded-full px-2 py-0.5 ${pkg.popular
                    ? 'border border-studio-600 bg-studio-800/80'
                    : 'border border-studio-600 bg-studio-800/80'}`}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-200">
                      {pkg.badge}
                    </span>
                  </div>
                ) : null}

                <div className="relative">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{pkg.name}</span>
                  <p className="mt-1 text-[11px] leading-snug text-zinc-500">{pkg.tagline}</p>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight text-zinc-50">${pkg.price}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-600">One-time payment</p>
                  <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-zinc-400">{pkg.credits.toLocaleString()} credits</span>
                    <span className={`text-[10px] font-semibold ${pkg.perCredit.startsWith('Save') ? 'text-zinc-300' : 'text-zinc-500'}`}>
                      {pkg.perCredit}
                    </span>
                  </div>

                  <div className={`mt-4 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition ${pkg.popular
                    ? 'border border-studio-600 bg-studio-800 text-studio-cream group-hover:border-zinc-400 group-hover:bg-studio-800/90'
                    : 'border border-studio-700 bg-studio-900 text-zinc-300 group-hover:border-studio-600 group-hover:bg-studio-800'}`}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Purchase</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Transaction History</h2>
            </div>
            <span className="text-xs text-zinc-600">{filteredTransactions.length} transactions</span>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-zinc-500">
              <Filter className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Filter</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-white/[0.02] p-1">
              {[
                { value: 'all' as TypeFilter, label: 'All' },
                { value: 'credit' as TypeFilter, label: 'Purchases' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setTypeFilter(option.value);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${typeFilter === option.value
                    ? 'bg-white/10 text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setTypeFilter('all');
                }}
                className={`${studioGhostButtonClass} h-8 px-3 pr-8 text-xs`}
              >
                Clear filters
              </button>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-600" />
            </div>
          </div>

          <div className={`overflow-hidden ${panelClass}`}>
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-white/5 px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 md:grid-cols-[140px_1fr_auto_auto]">
              <span className="hidden md:block">Date</span>
              <span>Description</span>
              <span className="text-right">Credits</span>
              <span className="hidden text-right sm:block">Balance</span>
            </div>

            {isBillingLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-zinc-600" />
                <p className="text-sm text-zinc-500">Loading billing history...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Filter className="mb-3 h-8 w-8 text-zinc-700" />
                <p className="text-sm text-zinc-500">No transactions found</p>
              </div>
            ) : filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="group grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-white/[0.03] px-5 py-3.5 transition last:border-b-0 hover:bg-white/[0.02] md:grid-cols-[140px_1fr_auto_auto]"
              >
                <span className="hidden font-mono text-xs text-zinc-500 md:block">{transaction.date}</span>

                <div className="min-w-0">
                  <span className="block truncate text-sm text-zinc-200">{transaction.description}</span>
                  <span className="block font-mono text-[10px] text-zinc-600 md:hidden">{transaction.date}</span>
                </div>

                <div className="flex items-center justify-end gap-1.5">
                  <ArrowDownLeft className="h-3 w-3 text-zinc-300" />
                  <span className="text-sm font-medium tabular-nums text-zinc-300">
                    +{transaction.credits.toLocaleString()}
                  </span>
                </div>

                <span className="hidden text-right font-mono text-xs tabular-nums text-zinc-500 sm:block">
                  {transaction.balance.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {clientSecret && selectedPackage ? (
        <StripeProvider clientSecret={clientSecret}>
          <CheckoutModal
            isOpen={checkoutOpen}
            onClose={handleCloseCheckout}
            packageInfo={selectedPackage}
            clientSecret={clientSecret}
          />
        </StripeProvider>
      ) : (
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={handleCloseCheckout}
          packageInfo={selectedPackage}
          clientSecret={null}
        />
      )}
    </StudioPageShell>
  );
}
