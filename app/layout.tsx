import type { Metadata } from 'next';
import { Inter, Cinzel } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import AuthProvider from '@/components/AuthProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel' });

export const metadata: Metadata = {
  title: 'S.C.I.O.N',
  description: 'Secure Communication Interface for Operative Network',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${cinzel.variable}`}>
      <body className="antialiased">
        <AuthProvider>
          {children}
          <Toaster position="top-right" theme="dark" />
        </AuthProvider>
      </body>
    </html>
  );
}
