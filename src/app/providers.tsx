"use client";
import { PrivyProvider } from "@privy-io/react-auth";
import { base } from "viem/chains";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function Providers({ children }: { children: React.ReactNode }) {
  if (!PRIVY_APP_ID) {
    console.warn("NEXT_PUBLIC_PRIVY_APP_ID is not configured.");
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["wallet", "farcaster", "google"],
        appearance: {
          theme: "light",
          accentColor: "#1D6FEB",
        },
        defaultChain: base,
        supportedChains: [base],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
