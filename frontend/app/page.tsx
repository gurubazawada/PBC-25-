'use client';

import React, { useState, useEffect } from 'react';
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from '@coinbase/onchainkit/identity';
import SwapList from './components/SwapList';
import UniversalSwap from './components/UniversalSwap';
import { Providers } from './providers';

import { Earn, EarnDeposit } from '@coinbase/onchainkit/earn';
import { Buy } from '@coinbase/onchainkit/buy';
import type { Token } from '@coinbase/onchainkit/token';
import ChartComponent from './components/ChartComponent'; // Import the separated chart component

function BuyComponents() {
  const degenToken: Token = {
    name: 'BASE',
    address: '0x4ed4e862860bed51a9570b96d89af5e1b0efefed',
    symbol: 'BASE',
    decimals: 18,
    chainId: 8453,
  };

  return <Buy toToken={degenToken} isSponsored />;
}

const SEPOLIA_BASE_CHAIN_ID = '0x14A34'; // Sepolia Base (8453 in hex)
const ZETA_ATHENS_CHAIN_ID = '0x1B59';    // Zeta Athens (replace with actual chain id if different)

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('swap'); // default to Swap tab

  // Effect to switch networks based on active tab.
  useEffect(() => {
    const switchNetwork = async (chainId) => {
      if (window.ethereum) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId }],
          });
          console.log(`Switched to chain ${chainId}`);
        } catch (error) {
          console.error(`Error switching to chain ${chainId}:`, error);
        }
      }
    };

    if (activeTab === 'swap') {
      switchNetwork(ZETA_ATHENS_CHAIN_ID);
    } else {
      switchNetwork(SEPOLIA_BASE_CHAIN_ID);
    }
  }, [activeTab]);

  // Use a consistent dark galaxy theme for background.
  const bgClass =
    'bg-gradient-to-br from-blue-900 via-purple-900 to-black text-white';

  // Tab navigation component centered at the top (border removed).
  const renderTabs = () => (
    <div className="flex justify-center py-2">
      {['share', 'swap', 'track'].map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`mx-4 py-2 px-4 font-bold uppercase ${
            activeTab === tab ? 'border-b-4 border-white' : 'text-gray-400'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'share':
        return (
          <div className="p-4">
            <h3 className="text-center font-bold mb-4">Swap Ledger</h3>
            <div className="bg-gray-800 bg-opacity-80 p-4 rounded-lg shadow-lg h-full overflow-y-auto">
              <SwapList key={refreshKey} />
            </div>
          </div>
        );
      case 'swap':
        return (
          <div className="p-4">
            <div className="max-w-4xl mx-auto flex gap-8">
              {/* Left Column: Universal Swap */}
              <div className="flex-1 bg-gray-800 bg-opacity-80 p-4 rounded-lg shadow-lg">
                <h3 className="text-center font-bold mb-4">Swap</h3>
                <UniversalSwap refreshLedger={() => setRefreshKey(prev => prev + 1)} />
              </div>
              {/* Right Column: Earn and Buy stacked */}
              <div className="flex-1 flex flex-col gap-8">
                <div className="bg-gray-800 bg-opacity-80 p-4 rounded-lg shadow-lg flex-1">
                  <h3 className="text-center font-bold mb-4">Earn</h3>
                  <Earn vaultAddress="0x7BfA7C4f149E7415b73bdeDfe609237e29CBF34A">
                    <EarnDeposit />
                  </Earn>
                </div>
                <div className="bg-gray-800 bg-opacity-80 p-4 rounded-lg shadow-lg flex-1">
                  <h3 className="text-center font-bold mb-4">Buy</h3>
                  <BuyComponents />
                </div>
              </div>
            </div>
          </div>
        );
      case 'track':
        return (
          <div className="p-4">
            <h3 className="text-center font-bold mb-4">Base Analytics</h3>
            <div className="max-w-4xl mx-auto bg-gray-800 bg-opacity-80 p-4 rounded-lg shadow-lg">
              <ChartComponent />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Providers>
      <div className={`relative flex flex-col min-h-screen font-sans ${bgClass}`}>
        {/* Stars overlay; ensure /stars.png is available in your public folder */}
        <div className="absolute inset-0 bg-[url('/stars.png')] bg-cover opacity-50 pointer-events-none" />
        <div className="relative z-10">
          <header className="pt-4 px-4 flex items-center justify-between">
            <div className="text-3xl font-bold">Swaphub</div>
            <Wallet>
              <ConnectWallet>
                <Avatar className="h-6 w-6" />
                <Name />
              </ConnectWallet>
              <WalletDropdown>
                <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                  <Avatar />
                  <Name />
                  <Address />
                  <EthBalance />
                </Identity>
                <WalletDropdownDisconnect />
              </WalletDropdown>
            </Wallet>
          </header>

          {/* Centered Tab Navigation */}
          {renderTabs()}

          {/* Main content */}
          <main className="flex-grow">{renderContent()}</main>
        </div>
      </div>
    </Providers>
  );
}
