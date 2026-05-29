"use client";
import { PrivyProvider } from "@privy-io/react-auth";
import { base } from "viem/chains";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["wallet", "farcaster", "google"],
        appearance: {
          theme: "light",
          accentColor: "#1D6FEB",
        },
        defaultChain: base,
        supportedChains: [base],
        embeddedWallets: {
          createOnLogin: "all-users"
        }
      }}
    >
      {children}
    </PrivyProvider>
  );
}
