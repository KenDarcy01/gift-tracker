import Link from "next/link";
import type { ReactNode } from "react";
import { STATUS_CHIP, STATUS_LABEL, budgetLevel, budgetPct, type BudgetLevel } from "@/lib/gifts";
import type { GiftStatus } from "@/lib/types";
import { money } from "@/lib/money";
import { BackIcon } from "./icons";

export function StatusChip({ status, className = "" }: { status: GiftStatus; className?: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-[3px] text-[12px] font-semibold ${STATUS_CHIP[status]} ${className}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

const BAR_COLOUR: Record<BudgetLevel, string> = { ok: "bg-ok", near: "bg-amber", over: "bg-berry" };
const NOTE_COLOUR: Record<BudgetLevel, string> = { ok: "text-st-delivered", near: "text-amber-ink", over: "text-berry" };

export function BudgetBar({ spent, budget, warnPct, thick = false }: { spent: number; budget: number; warnPct: number; thick?: boolean }) {
  const level = budgetLevel(spent, budget, warnPct);
  return (
    <span aria-hidden="true" className={`block overflow-hidden rounded-full bg-line-soft ${thick ? "h-2.5" : "h-2"}`}>
      <span className={`block h-full rounded-full ${BAR_COLOUR[level]}`} style={{ width: `${budgetPct(spent, budget)}%` }} />
    </span>
  );
}

export function BudgetNote({ spent, budget, warnPct, className = "" }: { spent: number; budget: number; warnPct: number; className?: string }) {
  const level = budgetLevel(spent, budget, warnPct);
  const left = budget - spent;
  const text = level === "over" ? `${money(-left)} over` : `${money(left)} left`;
  return <span className={`text-[12px] ${level === "over" ? "font-bold" : "font-semibold"} ${NOTE_COLOUR[level]} ${className}`}>{text}</span>;
}

export function Initial({ name, index, size = "md" }: { name: string; index: number; size?: "md" | "lg" }) {
  const palettes = [
    "bg-st-purchased-bg text-st-purchased",
    "bg-st-given-bg text-st-given",
    "bg-st-delivered-bg text-st-delivered",
    "bg-st-shipped-bg text-st-shipped",
    "bg-st-wrapped-bg text-st-wrapped",
    "bg-st-idea-bg text-st-idea",
  ];
  const dims = size === "lg" ? "h-14 w-14 text-[22px]" : "h-10 w-10 text-[16px]";
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full font-bold ${dims} ${palettes[index % palettes.length]}`}>
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold text-pine">
      <BackIcon size={20} />
      {children}
    </Link>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-display text-[30px] leading-[1.1] font-bold">{children}</h1>
      {sub && <p className="text-[13px] text-muted">{sub}</p>}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-berry-soft px-4 py-3 text-[14px] font-semibold text-berry-dark">
      {message}
    </p>
  );
}
