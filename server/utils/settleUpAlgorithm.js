/**
 * Settle-Up Algorithm — Minimum Transactions (Greedy Two-Pointer)
 *
 * @param {Array<{userId: string, netBalance: number}>} balances
 *   positive netBalance = owed money (creditor)
 *   negative netBalance = owes money (debtor)
 * @returns {Array<{from: string, to: string, amount: number}>}
 */
const settleUpAlgorithm = (balances) => {
  const EPSILON = 0.001; // floating-point tolerance

  // Separate into creditors and debtors
  const creditors = balances
    .filter((b) => b.netBalance > EPSILON)
    .map((b) => ({ userId: b.userId, amount: b.netBalance }));

  const debtors = balances
    .filter((b) => b.netBalance < -EPSILON)
    .map((b) => ({ userId: b.userId, amount: -b.netBalance })); // positive amount owed

  const transactions = [];

  // Sort descending by amount for greedy matching
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt = debtors[di];

    const settledAmount = Math.min(credit.amount, debt.amount);

    if (settledAmount > EPSILON) {
      transactions.push({
        from: debt.userId,
        to: credit.userId,
        amount: Math.round(settledAmount * 100) / 100,
      });
    }

    credit.amount -= settledAmount;
    debt.amount -= settledAmount;

    if (credit.amount < EPSILON) ci++;
    if (debt.amount < EPSILON) di++;
  }

  return transactions;
};

module.exports = settleUpAlgorithm;
