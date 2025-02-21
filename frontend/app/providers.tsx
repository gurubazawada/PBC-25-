'use client';

import React, { useState, useEffect, ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { UniversalKitProvider } from "@zetachain/universalkit";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { base } from "wagmi/chains";
import { config } from "../wagmi";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

const ThemeWrapper = ({ children }: { children: ReactNode }) => {
  const { theme } = useTheme();
  const kitTheme = theme === "dark" ? darkTheme() : lightTheme();
  return <RainbowKitProvider theme={kitTheme}>{children}</RainbowKitProvider>;
};

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <NextThemesProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <OnchainKitProvider
            apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY!}
            chain={base}
            config={{ appearance: { mode: "auto" } }}
          >
            <UniversalKitProvider config={config} client={queryClient}>
              <ThemeWrapper>{children}</ThemeWrapper>
            </UniversalKitProvider>
          </OnchainKitProvider>
        </NextThemesProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
