import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Providers } from '@/components/Providers';

export const metadata = {
  title: 'Adbar - Digital Marketplace',
  description: 'Buy, sell, and freelance on the Adbar platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
