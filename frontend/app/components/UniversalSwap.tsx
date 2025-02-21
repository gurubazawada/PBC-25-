'use client';

import React, { useState } from 'react';
import { ethers, BrowserProvider } from 'ethers';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import swapJson from '../abis/Swap.json';
import ledgerJson from '../abis/SwapLedger.json'; // <--- Include your ledger ABI

// --------- Addresses & ABIs ---------
const SWAP_CONTRACT_ADDRESS = "0xb459F14260D1dc6484CE56EB0826be317171e91F"; // Universal swap contract
const LEDGER_CONTRACT_ADDRESS = "0xE3477A7b8246c68aeBa46d1f5A44D865639f671F"; // Ledger deployed on Base Sepolia

const swapAbi = swapJson.abi;
const ledgerAbi = ledgerJson.abi;

const INPUT_TOKEN = "0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD";
const TARGET_TOKEN_USDC = "0xcC683A782f4B30c138787CB5576a86AF66fdc31d";
const TARGET_TOKEN_AVALANCHE = "0x96152E6180E085FA57c7708e18AF8F05e37B479D";
const TARGET_TOKEN_ZETA = "0x777915D031d1e8144c90D025C594b3b8Bf07a08d";
const TARGET_TOKEN_POLYGON = "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf";

// --------- Recipient ---------
const RECIPIENT = "0x4955a3F38ff86ae92A914445099caa8eA2B9bA32";

// --------- Base Sepolia Chain Info ---------
const BASE_SEPOLIA_PARAMS = {
  chainId: '0x14A33', // 84531 in hex
  chainName: 'Base Sepolia',
  nativeCurrency: {
    name: 'Base Sepolia ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['sepolia.base.org']
};

type RatioKey = 'usdc' | 'avalanche' | 'zeta' | 'polygon';

export default function UniversalSwap() {
  const [amount, setAmount] = useState("");
  const [ratios, setRatios] = useState<{ [key in RatioKey]: number }>({
    usdc: 25,
    avalanche: 25,
    zeta: 25,
    polygon: 25,
  });
  const [loading, setLoading] = useState(false);

  // We store the most recent "swap details" so that the user can share them afterward
  const [recentSwaps, setRecentSwaps] = useState<
    Array<{
      tokenIn: string;
      amountIn: bigint;
      tokenOut: string;
    }>
  >([]);

  // ------------------ Slider Management ---------------------
  function handleSliderChange(changedKey: RatioKey, newValue: number) {
    // Clamp newValue between 0 and 100
    newValue = Math.max(0, Math.min(newValue, 100));
    const oldValue = ratios[changedKey];
    const diff = newValue - oldValue;

    // Sum of the other three sliders
    const otherKeys = (Object.keys(ratios) as RatioKey[]).filter(k => k !== changedKey);
    const sumOthers = otherKeys.reduce((sum, key) => sum + ratios[key], 0);

    let newRatios = { ...ratios, [changedKey]: newValue };

    if (sumOthers === 0) {
      // If others are all zero, distribute the remainder equally
      const equalShare = (100 - newValue) / otherKeys.length;
      otherKeys.forEach(key => {
        newRatios[key] = equalShare;
      });
    } else {
      // Scale each of the other sliders proportionally
      otherKeys.forEach(key => {
        newRatios[key] = ratios[key] * ((100 - newValue) / sumOthers);
      });
    }
    setRatios(newRatios);
  }

  // ------------------ Swap Execution (on Sepolia) -----------------------
  async function handleSwap() {
    if (!amount || isNaN(Number(amount))) {
      alert("Please enter a valid number for the base amount");
      return;
    }
    // Ensure that the total percentage is 100
    const totalPercentage = Object.values(ratios).reduce((sum, value) => sum + value, 0);
    if (Math.round(totalPercentage) !== 100) {
      alert("The ratios must sum up to 100%");
      return;
    }

    try {
      setLoading(true);
      if (!window.ethereum) {
        alert("Please install MetaMask");
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(SWAP_CONTRACT_ADDRESS, swapAbi, signer);
      
      const baseAmount = ethers.parseEther(amount);

      // We'll collect the final swaps in an array so that we can "Share" them
      const swapsToLedger: Array<{
        tokenIn: string;
        amountIn: bigint;
        tokenOut: string;
      }> = [];

      // We iterate over each network and perform a swap if the ratio > 0
      const networkSwaps: [string, number, string][] = [
        ["USDC (BSC subnet)", ratios.usdc, TARGET_TOKEN_USDC],
        ["Avalanche testnet", ratios.avalanche, TARGET_TOKEN_AVALANCHE],
        ["Zeta testnet", ratios.zeta, TARGET_TOKEN_ZETA],
        ["Polygon", ratios.polygon, TARGET_TOKEN_POLYGON],
      ];

      let txHash: string | null = null;
      for (const [networkName, ratio, targetToken] of networkSwaps) {
        if (ratio > 0) {
          const amountForNetwork = (baseAmount * BigInt(Math.round(ratio))) / 100n;
          if (amountForNetwork > 0n) {
            const tx = await contract.swap(
              INPUT_TOKEN,
              amountForNetwork,
              targetToken,
              RECIPIENT,
              true
            );
            await tx.wait();

            txHash = tx.hash;
            // 0x7f6509664bb97dcf4eb09310d7c456f96cc4cd8bddea4375f38b3caef289d813
            swapsToLedger.push({
              tokenIn: INPUT_TOKEN,
              amountIn: amountForNetwork,
              tokenOut: targetToken,
            });
          }
        }
      }

      // Store these swap details in state to be used by the "Share" button
      setRecentSwaps(swapsToLedger);

      if (txHash) {
        alert("Transaction successful. Last TX hash: " + txHash);
      } else {
        alert("No transaction was executed");
      }
    } catch (error: any) {
      console.error(error);
      alert("Transaction failed: " + error?.message || error);
    } finally {
      setLoading(false);
    }
  }

  // ------------------ Share to SwapLedger (on Base Sepolia) -------------------
  async function handleShare() {
    if (recentSwaps.length === 0) {
      alert("No recent swaps to share. Please do a swap first.");
      return;
    }

    try {
      setLoading(true);
      // 1. Switch to Base Sepolia
      await switchToBaseSepolia();

      // 2. Connect to the ledger contract on Base Sepolia
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const ledgerContract = new ethers.Contract(LEDGER_CONTRACT_ADDRESS, ledgerAbi, signer);

      // We'll make one ledger entry per swap
      for (const swap of recentSwaps) {
        // For demonstration, set amountOut = 0
        const tx = await ledgerContract.addSwap(
          swap.tokenIn,
          swap.amountIn,
          swap.tokenOut,
          0 // placeholder
        );
        await tx.wait();
      }

      alert("Swaps have been shared on the ledger (Base Sepolia)!");
    } catch (error: any) {
      console.error(error);
      alert("Failed to share swaps: " + error?.message || error);
    } finally {
      setLoading(false);
    }
  }

  // ------------------ Utility: Switch to Base Sepolia -------------------
  async function switchToBaseSepolia() {
    if (!window.ethereum) {
      throw new Error("No wallet found. Please install MetaMask.");
    }

    try {
      // Attempt to switch to Base Sepolia
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_SEPOLIA_PARAMS.chainId }],
      });
    } catch (switchError: any) {
      // This error code indicates the chain is not added to MetaMask
      if (switchError.code === 4902) {
        try {
          // Add the chain and then try switching again
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BASE_SEPOLIA_PARAMS],
          });
          // After adding, switch
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: BASE_SEPOLIA_PARAMS.chainId }],
          });
        } catch (addError) {
          throw new Error("User rejected adding Base Sepolia network to MetaMask");
        }
      } else {
        throw new Error("Failed to switch to Base Sepolia: " + switchError.message);
      }
    }
  }

  // ------------------ UI -------------------
  return (
    <div className="bg-gray-800 bg-opacity-80 p-6 rounded-lg shadow-lg text-white space-y-6">
      {/* Top Section: Connect Button */}
      <div className="flex justify-between items-center mb-4">
        <ConnectButton label="Connect EVM" showBalance={false} />
      </div>

      {/* Amount Input */}
      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-gray-200 mb-1"
        >
          Amount (Base Sepolia)
        </label>
        <input
          id="amount"
          type="text"
          placeholder="Enter base amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 gap-4">
        {/* USDC Slider */}
        <div>
          <label
            htmlFor="ratioUSDC"
            className="block text-sm font-medium text-gray-200 mb-1"
          >
            USDC (%)
          </label>
          <input
            id="ratioUSDC"
            type="range"
            min="0"
            max="100"
            value={ratios.usdc}
            onChange={(e) =>
              handleSliderChange('usdc', Number(e.target.value))
            }
            className="w-full accent-blue-500"
          />
          <div className="text-center text-gray-300">{ratios.usdc.toFixed(0)}%</div>
        </div>

        {/* Avalanche Slider */}
        <div>
          <label
            htmlFor="ratioAvalanche"
            className="block text-sm font-medium text-gray-200 mb-1"
          >
            Avalanche (%)
          </label>
          <input
            id="ratioAvalanche"
            type="range"
            min="0"
            max="100"
            value={ratios.avalanche}
            onChange={(e) =>
              handleSliderChange('avalanche', Number(e.target.value))
            }
            className="w-full accent-blue-500"
          />
          <div className="text-center text-gray-300">{ratios.avalanche.toFixed(0)}%</div>
        </div>

        {/* Zeta Slider */}
        <div>
          <label
            htmlFor="ratioZeta"
            className="block text-sm font-medium text-gray-200 mb-1"
          >
            Zeta Token (%)
          </label>
          <input
            id="ratioZeta"
            type="range"
            min="0"
            max="100"
            value={ratios.zeta}
            onChange={(e) =>
              handleSliderChange('zeta', Number(e.target.value))
            }
            className="w-full accent-blue-500"
          />
          <div className="text-center text-gray-300">{ratios.zeta.toFixed(0)}%</div>
        </div>

        {/* Polygon Slider */}
        <div>
          <label
            htmlFor="ratioPolygon"
            className="block text-sm font-medium text-gray-200 mb-1"
          >
            Polygon (%)
          </label>
          <input
            id="ratioPolygon"
            type="range"
            min="0"
            max="100"
            value={ratios.polygon}
            onChange={(e) =>
              handleSliderChange('polygon', Number(e.target.value))
            }
            className="w-full accent-blue-500"
          />
          <div className="text-center text-gray-300">{ratios.polygon.toFixed(0)}%</div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-2">
        {/* Swap Button */}
        <button
          onClick={handleSwap}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {loading ? "Swapping..." : "Swap"}
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          disabled={loading || recentSwaps.length === 0}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {loading ? "Sharing..." : "Share to Ledger"}
        </button>
      </div>
    </div>
  );
}
