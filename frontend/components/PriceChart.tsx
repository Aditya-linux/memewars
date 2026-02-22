'use client';

import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface HistoryEntry {
    time: number;
    price: number;
    balances: Record<string, number>;
}

const Strategies: Record<string, string> = {
    "Agent_Sniper": "#ef4444", // red-500
    "Agent_Hodler": "#3b82f6", // blue-500
    "Agent_Degen": "#22c55e",  // green-500
    "Agent_CopyTrader": "#eab308", // yellow-500
    "Agent_Whale": "#a855f7"   // purple-500
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export default function PriceChart() {
    const [data, setData] = useState<HistoryEntry[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/api/history?t=${Date.now()}`);
                if (res.ok) {
                    const jsonData = await res.json();

                    // Handle new structure { roundEndTime, history }
                    const historyList = Array.isArray(jsonData) ? jsonData : jsonData.history || [];

                    // Format data for Recharts
                    const formattedData = historyList.map((entry: any) => ({
                        time: new Date(entry.time * 1000).toLocaleTimeString(),
                        price: entry.price,
                        ...entry.balances
                    }));

                    setData(formattedData);
                }
            } catch (error) {
                console.error("Error fetching history:", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
    }, []);

    if (data.length === 0) {
        return (
            <div className="w-full max-w-6xl mx-auto p-4 mb-8">
                <div className="nb-card bg-surface p-8 text-center animate-pulse">
                    <h3 className="text-xl font-bold uppercase">Loading Market Data...</h3>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto p-4 mb-12">
            <h2 className="text-3xl font-black text-center mb-6 text-on-bg uppercase tracking-widest text-shadow-hard">
                📈 Market Trends
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Price Chart */}
                <div className="nb-card bg-white p-4 relative">
                    <div className="absolute top-0 left-0 bg-black text-white px-3 py-1 text-xs font-bold uppercase">
                        MockMeme Price ($)
                    </div>
                    <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                                <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                                <YAxis domain={['auto', 'auto']} />
                                <Tooltip
                                    contentStyle={{ border: '3px solid black', borderRadius: '0px', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                />
                                <Line type="monotone" dataKey="price" stroke="#000000" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Agent Balances Chart */}
                <div className="nb-card bg-white p-4 relative">
                    <div className="absolute top-0 left-0 bg-black text-white px-3 py-1 text-xs font-bold uppercase">
                        Agent Balances
                    </div>
                    <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                                <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                                <YAxis />
                                <Tooltip
                                    contentStyle={{ border: '3px solid black', borderRadius: '0px', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }}
                                />
                                {Object.entries(Strategies).map(([agentName, color]) => (
                                    <Line
                                        key={agentName}
                                        type="monotone"
                                        dataKey={agentName}
                                        stroke={color}
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                ))}
                                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
