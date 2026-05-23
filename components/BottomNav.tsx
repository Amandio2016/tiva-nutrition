"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard",   emoji: "🏠", label: "Hoje"        },
  { href: "/semana",      emoji: "📅", label: "Semana"      },
  { href: "/suplementos", emoji: "💊", label: "Suplementos" },
  { href: "/perfil",      emoji: "⚙️", label: "Perfil"      },
] as const;

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 flex"
      style={{
        height: "60px",
        background: "rgba(15,10,6,0.97)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="mx-auto flex w-full max-w-[430px]">
        {TABS.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors"
            style={{ color: path === tab.href ? "#F97316" : "rgba(255,255,255,0.28)" }}
          >
            <span className="text-[20px] leading-none" aria-hidden>{tab.emoji}</span>
            <span className="text-[10px] font-semibold">{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
