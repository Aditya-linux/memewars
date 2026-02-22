'use client';

import React, { useEffect, useState } from 'react';
import { useContractWrite, usePrepareContractWrite, useAccount, useWaitForTransaction, useContractRead } from 'wagmi';
import { parseEther } from 'viem';
import deployment from '../deployment.json';
import arenaAbi from '../arena_abi.json';
import agentPublic from '../agent_public.json';

const AGENT_NAMES = Object.keys(agentPublic);
const AGENT_ADDRESSES = Object.values(agentPublic);

const Strategies: Record<string, { color: string; desc: string }> = {
    "Agent_Sniper": { color: "bg-red-500", desc: "Buys the Dip" },
    "Agent_Hodler": { color: "bg-blue-500", desc: "Diamond Hands" },
    "Agent_Degen": { color: "bg-green-500", desc: "Random Ape" },
    "Agent_CopyTrader": { color: "bg-yellow-500", desc: "Copy Cat" },
    "Agent_Whale": { color: "bg-purple-500", desc: "Market Mover" }
};

const AGENT_IMAGES: Record<string, string> = {
    "Agent_Sniper": "/agents/ape1.jpg",
    "Agent_Hodler": "/agents/ape2.jpg",
    "Agent_Degen": "/agents/ape3.jpg",
    "Agent_CopyTrader": "/agents/ape4.jpg",
    "Agent_Whale": "/agents/ape5.jpg",
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export default function Leaderboard() {
    const [balances, setBalances] = useState<Record<string, number>>({});
    const { address } = useAccount();

    // Read balances from backend API
    useEffect(() => {
        const fetchBalances = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/api/history?t=${Date.now()}`, { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.history && data.history.length > 0) {
                        const latest = data.history[data.history.length - 1];
                        if (latest.balances) {
                            setBalances(latest.balances);
                        }
                    }
                }
            } catch (e) {
                console.error("Balance fetch error", e);
            }
        };

        fetchBalances();
        const interval = setInterval(fetchBalances, 2000); // Poll every 2s
        return () => clearInterval(interval);
    }, []);

    // Check Round Status
    const { data: currentRoundId } = useContractRead({
        address: deployment.arena as `0x${string}`,
        abi: arenaAbi.abi,
        functionName: 'currentRoundId',
    });

    // Determine Winner (Live)
    const sortedAgents = [...AGENT_NAMES].sort((a, b) => (balances[b] || 0) - (balances[a] || 0));
    const winner = sortedAgents[0];

    // Fetch Round Timer & Phase
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [phase, setPhase] = useState<string>('ROUND'); // BETTING or ROUND

    useEffect(() => {
        const fetchTimer = async () => {
            try {
                // Add timestamp to prevent caching
                const res = await fetch(`${BACKEND_URL}/api/history?t=${Date.now()}`, {
                    cache: 'no-store'
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.roundEndTime) {
                        const remaining = Math.max(0, data.roundEndTime - (Date.now() / 1000));
                        setTimeLeft(remaining);
                    }
                    if (data.phase) {
                        setPhase(data.phase);
                    }
                }
            } catch (e) {
                console.error("Timer fetch error", e);
            }
        };

        fetchTimer();
        const interval = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1));
            // Re-sync every 5s
            if (Date.now() % 5000 < 1000) fetchTimer();
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Format Timer
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-4">
            <h2 className="text-4xl font-black text-center mb-6 text-on-bg uppercase tracking-widest text-shadow-hard">
                🏆 Live Standings
            </h2>

            {/* Round Status Banner */}
            <div className="mb-8 text-center bg-bg border-4 border-black p-4 max-w-xl mx-auto shadow-hard relative overflow-hidden">
                {/* Timer BG Pattern */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>

                <div className="relative z-10">
                    <h3 className="text-xl font-bold uppercase mb-2 text-on-bg">
                        {phase === 'BETTING' ? '🎲 Betting Phase Ends In' : `⚔️ Round #${currentRoundId?.toString()} Ends In`}
                    </h3>
                    <div className={`text-6xl font-mono font-black tracking-tighter text-shadow-hard ${phase === 'BETTING' ? 'text-green-500' : 'text-primary'}`}>
                        {formatTime(timeLeft)}
                    </div>
                </div>

                {/* Auto-payout info */}
                <div className="mt-3 relative z-10">
                    <p className="text-xs font-mono text-on-bg opacity-60 uppercase tracking-wider">
                        💸 Winners are auto-paid at round end
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {AGENT_NAMES.map((name, index) => {
                    const isWinner = name === winner && (balances[name] || 0) > 0;
                    const strategy = Strategies[name] || { color: "bg-gray-500", desc: "Unknown" };
                    const realRank = sortedAgents.indexOf(name) + 1;
                    const agentAddress = agentPublic[name as keyof typeof agentPublic];

                    return (
                        <AgentCard
                            key={name}
                            name={name}
                            address={agentAddress}
                            strategy={strategy}
                            balance={balances[name] || 0}
                            rank={realRank}
                            isWinner={isWinner}
                            bettingActive={phase === 'BETTING'}
                        />
                    );
                })}
            </div>

            <div className="mt-16 text-center">
                <div className="inline-block nb-card py-3 px-6 bg-surface">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-black"></div>
                        <span className="font-bold uppercase tracking-widest text-sm">Live Feed: Monad Testnet</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Sub-component to handle Wagmi Hooks correctly
function AgentCard({ name, address, strategy, balance, rank, isWinner, bettingActive }: any) {
    // Write Hook for Betting - enable when API says betting phase
    const { config } = usePrepareContractWrite({
        address: deployment.arena as `0x${string}`,
        abi: arenaAbi.abi,
        functionName: 'placeBet',
        args: [address],
        value: parseEther('1'), // Bet 1 MON Fixed
        enabled: bettingActive
    });

    const { write, data, isLoading } = useContractWrite(config);
    const { isLoading: isTxLoading, isSuccess } = useWaitForTransaction({ hash: data?.hash });

    const handleBet = () => {
        if (write) {
            write();
        }
    };

    // Rank Colors
    const getRankColor = (r: number) => {
        if (r === 1) return 'bg-yellow-400 text-black'; // Gold
        if (r === 2) return 'bg-gray-300 text-black';   // Silver
        if (r === 3) return 'bg-orange-400 text-black'; // Bronze
        return 'bg-main text-white'; // Default
    };

    // Determine button state
    const getBtnState = () => {
        if (isSuccess) return { label: '✅ Bet Placed!', cls: 'bg-green-500 text-white', disabled: true };
        if (isLoading || isTxLoading) return { label: '⏳ Betting...', cls: 'bg-yellow-400 text-black', disabled: true };
        if (bettingActive && write) return { label: '🎲 Bet 1 MON', cls: 'bg-primary text-white hover:bg-white hover:text-primary active:translate-y-1 active:shadow-none', disabled: false };
        if (bettingActive && !write) return { label: '🎲 Bet 1 MON', cls: 'bg-primary text-white hover:bg-white hover:text-primary active:translate-y-1 active:shadow-none animate-pulse', disabled: true };
        return { label: '🔒 Betting Closed', cls: 'bg-gray-400 text-gray-700 cursor-not-allowed opacity-50', disabled: true };
    };

    const btn = getBtnState();

    return (
        <div className={`
            nb-card relative transition-all duration-300 flex flex-col
            ${isWinner ? 'bg-secondary border-black transform scale-105 z-10' : 'bg-surface hover:-translate-y-2 hover:shadow-[6px_6px_0px_0px_var(--shadow-color)]'}
        `}>
            <div className={`absolute -top-4 -right-4 w-12 h-12 border-[3px] border-black flex items-center justify-center font-black text-xl rounded-full shadow-hard z-20 ${getRankColor(rank)}`}>
                #{rank}
            </div>

            <div className="flex justify-between items-start mb-6 border-b-[3px] border-border pb-4 border-dashed">
                <div className="w-16 h-16 rounded-lg border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <img
                        src={AGENT_IMAGES[name] || '/agents/default.jpg'}
                        alt={name}
                        className="w-full h-full object-cover"
                    />
                </div>
                {isWinner && <span className="text-4xl animate-bounce">👑</span>}
            </div>

            <h3 className="text-2xl font-black text-[var(--text-on-surface)] mb-1 uppercase tracking-tighter">
                {name.replace('Agent_', '')}
            </h3>
            <div className="inline-block px-3 py-1 bg-black text-white text-xs font-bold uppercase tracking-widest mb-6 rounded-md">
                {strategy.desc}
            </div>

            <div className="bg-bg border-[3px] border-border rounded-lg p-4 relative group overflow-hidden mb-4">
                <p className="text-[var(--text-on-bg)] text-xs uppercase tracking-wider font-bold mb-1">Total MockMeme</p>
                <div className="text-4xl font-mono text-primary font-black">
                    {balance !== undefined ? balance : '...'}
                </div>
            </div>

            <div className="mt-auto">
                <button
                    onClick={handleBet}
                    disabled={btn.disabled}
                    className={`
                        w-full py-3 border-[3px] border-black font-black uppercase tracking-widest text-sm shadow-hard transition-all
                        ${btn.cls}
                    `}
                >
                    {btn.label}
                </button>
            </div>

            <div className="mt-4 pt-4 border-t-[3px] border-border border-dashed flex justify-between items-center text-xs font-mono opacity-60">
                <span>ADDRESS</span>
                <span className="truncate w-24">{address}</span>
            </div>
        </div>
    );
}
