export type CreditPackage = {
  packageId: string;
  credits: number;
  amountInCents: number;
};

export const CREDIT_PACKAGES: Record<string, CreditPackage> = {
  starter: {
    packageId: 'starter',
    credits: 500,
    amountInCents: 500
  },
  creator: {
    packageId: 'creator',
    credits: 1000,
    amountInCents: 1000
  },
  pro: {
    packageId: 'pro',
    credits: 5500,
    amountInCents: 5000
  },
  studio: {
    packageId: 'studio',
    credits: 11500,
    amountInCents: 10000
  }
};
