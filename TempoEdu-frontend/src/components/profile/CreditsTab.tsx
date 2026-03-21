import { Coins } from 'lucide-react';
import { format } from 'date-fns';
import type { Transaction } from '../../types';

interface CreditsTabProps {
  balance: number;
  transactions: Transaction[];
}

export default function CreditsTab({ balance, transactions }: CreditsTabProps) {
  return (
    <div className="space-y-6">
      {/* Balance */}
      <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <Coins className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{balance}</p>
            <p className="text-sm text-gray-500">Available credits</p>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900">Transaction History</h2>
        </div>
        {transactions.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-500">No transactions yet</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((tx) => (
              <div key={tx._id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {tx.amount > 0 ? '+' : '-'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(tx.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </p>
                  <p className="text-xs text-gray-400">Balance: {tx.balanceAfter}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
