"use client";
import { usePathname, useRouter } from "next/navigation";

const tabs = [
  { label: "Home", path: "/", icon: "🏠" },
  { label: "Vesting", path: "/vesting", icon: "🔒" },
  { label: "Profile", path: "/profile", icon: "👤" }
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <nav style={{position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "white", borderTop: "1px solid #dbeafe", display: "flex", zIndex: 100}}>
      {tabs.map((tab) => {
        const active = pathname === tab.path;
        return (
          <button key={tab.path} onClick={() => router.push(tab.path)}
            style={{flex: 1, padding: "12px 0", border: "none", background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px"}}>
            <span style={{fontSize: "20px"}}>{tab.icon}</span>
            <span style={{fontSize: "11px", fontWeight: active ? "700" : "400", color: active ? "#1D6FEB" : "#93c5fd"}}>{tab.label}</span>
            {active && <div style={{width: "20px", height: "2px", backgroundColor: "#1D6FEB", borderRadius: "1px"}}></div>}
          </button>
        );
      })}
    </nav>
  );
}
