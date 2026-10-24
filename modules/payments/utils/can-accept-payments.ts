export type PaymentsReadiness = {
  stripeAccountId: string | null | undefined;
  stripeChargesEnabled: boolean | null | undefined;
};

export function canAcceptPayments({ stripeAccountId, stripeChargesEnabled }: PaymentsReadiness): boolean {
  return Boolean(stripeAccountId) && stripeChargesEnabled === true;
}
