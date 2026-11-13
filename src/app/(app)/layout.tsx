"use client";

import type { ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { DataProvider, useData } from "@/lib/store";

function Nav() {
  const { inbound } = useData();
  return <BottomNav inboxCount={inbound.filter((e) => e.state === "needs_person").length} />;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pt-[max(env(safe-area-inset-top),24px)] pb-32">
        <DataProvider>
          {children}
          <Nav />
        </DataProvider>
      </main>
    </>
  );
}
