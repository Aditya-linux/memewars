import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from './providers';
import { Space_Grotesk, Bangers } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
    subsets: ['latin'],
    variable: '--font-space'
});

const bangers = Bangers({
    weight: '400',
    subsets: ['latin'],
    variable: '--font-bangers'
});

export const metadata = {
    title: 'MemeWars',
    description: 'AI Trading Battle Royale on Monad',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${spaceGrotesk.variable} ${bangers.variable} font-sans`}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
