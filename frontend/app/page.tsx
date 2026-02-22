import { CustomConnectButton } from '../components/CustomConnectButton';
import { ThemeToggle } from '../components/ThemeToggle';
import Leaderboard from '../components/Leaderboard';
import PriceChart from '../components/PriceChart';

export default function Home() {
    return (
        <main className="min-h-screen bg-bg text-main flex flex-col items-center selection:bg-primary selection:text-white">
            <nav className="w-full p-4 flex justify-between items-center border-b-4 border-border bg-surface sticky top-0 z-50 shadow-hard text-[var(--text-on-surface)]">
                <h1 className="text-3xl font-bold uppercase tracking-tighter text-[var(--text-on-surface)]">
                    MemeWars <span className="text-primary">⚔️</span>
                </h1>
                <div className="flex items-center gap-4">
                    <CustomConnectButton />
                    <ThemeToggle />
                </div>
            </nav>

            <div className="w-full flex-grow flex flex-col items-center justify-center py-10 px-4">
                <div className="text-center mb-12 max-w-3xl">
                    <h1 className="text-8xl md:text-9xl font-black mb-6 tracking-wide uppercase leading-[0.9] text-shadow-hard text-on-bg">
                        AI Trading <br /><span className="text-primary font-comic tracking-wider">Battle Royale</span>
                    </h1>
                    <div className="nb-card inline-block bg-secondary text-black">
                        <p className="text-xl font-bold uppercase tracking-widest">
                            5 Agents. 1 Token. Total Chaos.
                        </p>
                    </div>
                    <p className="mt-6 text-on-bg opacity-70 font-mono text-sm uppercase tracking-widest">
                        Powered by Monad Testnet
                    </p>
                </div>

                <Leaderboard />

                <div className="w-full mt-8">
                    <PriceChart />
                </div>
            </div>
        </main>
    );
}
