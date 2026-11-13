import Link from "next/link";

export function NotFound({ what, back }: { what: string; back: string }) {
  return (
    <div className="card flex flex-col gap-2 p-4">
      <p className="text-[15px] font-semibold">That {what} isn&apos;t here any more.</p>
      <Link href={back} className="text-[14px] font-semibold text-pine">Go back</Link>
    </div>
  );
}
