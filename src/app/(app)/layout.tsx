import { BottomNav } from "@/components/bottom-nav";
import { countNeedsPerson } from "@/lib/data";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const inboxCount = await countNeedsPerson();
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pt-[max(env(safe-area-inset-top),24px)] pb-32">
        {children}
      </main>
      <BottomNav inboxCount={inboxCount} />
    </>
  );
}
