"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, InboxIcon, PeopleIcon, SettingsIcon } from "./icons";

const TABS = [
  { href: "/", label: "Home", Icon: HomeIcon, match: (p: string) => p === "/" || p.startsWith("/gifts") },
  { href: "/people", label: "People", Icon: PeopleIcon, match: (p: string) => p.startsWith("/people") },
  { href: "/inbox", label: "Inbox", Icon: InboxIcon, match: (p: string) => p.startsWith("/inbox") },
  { href: "/settings", label: "Settings", Icon: SettingsIcon, match: (p: string) => p.startsWith("/settings") },
];

export function BottomNav({ inboxCount }: { inboxCount: number }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card pb-[max(env(safe-area-inset-bottom),10px)]"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 px-2 pt-2">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-12 flex-col items-center justify-center gap-1 text-[11px] ${
                active ? "font-bold text-pine" : "font-semibold text-muted"
              }`}
            >
              <Icon />
              {label}
              {href === "/inbox" && inboxCount > 0 && (
                <span
                  aria-label={`${inboxCount} need a person`}
                  className="absolute top-0.5 left-[52%] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-berry px-1 text-[11px] font-bold text-white"
                >
                  {inboxCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
