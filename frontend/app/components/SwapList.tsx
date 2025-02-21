'use client';

import React, { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatEther } from 'ethers';
import swapLedgerJson from '../abis/SwapLedger.json';
import { IdentityCard } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';

declare global {
  interface Window {
    ethereum?: any;
  }
}

type Swap = {
  trader: string;
  tokenIn: string;
  amountIn: string;
  tokenOut: string;
  amountOut: string;
  timestamp: string;
};

const SWAP_LEDGER_ADDRESS = '0xE3477A7b8246c68aeBa46d1f5A44D865639f671F';

const SwapList: React.FC = () => {
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndices, setExpandedIndices] = useState<number[]>([]);

  useEffect(() => {
    const fetchSwaps = async () => {
      try {
        if (!window.ethereum) {
          setError('MetaMask is not installed. Please install it to continue.');
          setLoading(false);
          return;
        }

        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new BrowserProvider(window.ethereum);
        const swapLedgerContract = new Contract(
          SWAP_LEDGER_ADDRESS,
          swapLedgerJson.abi,
          provider
        );

        const swapsData: any[] = await swapLedgerContract.getAllSwaps();
        const formattedSwaps: Swap[] = swapsData.map((swap) => ({
          trader: swap.trader,
          tokenIn: swap.tokenIn,
          amountIn: formatEther(swap.amountIn),
          tokenOut: swap.tokenOut,
          amountOut: formatEther(swap.amountOut),
          timestamp: new Date(Number(swap.timestamp) * 1000).toLocaleString(),
        }));

        setSwaps(formattedSwaps);
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching swaps:', err);
        setError(err.message || 'Error fetching swaps from the contract.');
        setLoading(false);
      }
    };

    fetchSwaps();
  }, []);

  const toggleExpand = (index: number) => {
    setExpandedIndices((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  if (loading) {
    return <div className="text-center py-4">Loading swaps...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 py-4">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-center mb-4"></h2>
      {swaps.length === 0 ? (
        <p className="text-center">No swaps have been recorded yet.</p>
      ) : (
        <ul className="space-y-4">
          {swaps.map((swap, index) => (
            <li key={index} className="bg-gray-700 rounded shadow">
              <button
                onClick={() => toggleExpand(index)}
                className="w-full text-left p-4 text-white hover:bg-gray-600 focus:outline-none"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">Trader:</span>
                  <span className="truncate ml-2">{swap.trader}</span>
                </div>
              </button>
              {expandedIndices.includes(index) && (
                <div className="p-4 bg-gray-800 text-white rounded-b">
                  <div className="mb-4">
                    <IdentityCard
                      address={swap.trader}
                      chain={base}
                      schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
                    />
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Token In:</strong> {swap.tokenIn}
                    </p>
                    <p>
                      <strong>Amount In:</strong> {swap.amountIn}
                    </p>
                    <p>
                      <strong>Token Out:</strong> {swap.tokenOut}
                    </p>
                    <p>
                      <strong>Amount Out:</strong> {swap.amountOut}
                    </p>
                    <p>
                      <strong>Timestamp:</strong> {swap.timestamp}
                    </p>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SwapList;
