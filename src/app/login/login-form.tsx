"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { basePath, supabase } from "@/lib/supabase/client";

type Step = { step: "email" | "code"; email?: string; error?: string };

export function LoginForm() {
  const router = useRouter();
  const [state, setState] = useState<Step>({ step: "email" });
  const [busy, setBusy] = useState<"send" | "verify" | null>(null);

  async function send(emailRaw: string) {
    const email = emailRaw.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState({ step: "email", email, error: "Enter a valid email address." });
      return;
    }
    setBusy("send");
    const { error } = await supabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}${basePath}/auth/callback/` },
    });
    setBusy(null);
    setState(error ? { step: state.step, email, error: error.message } : { step: "code", email });
  }

  async function onSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await send(String(new FormData(e.currentTarget).get("email") ?? ""));
  }

  async function onVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = String(new FormData(e.currentTarget).get("token") ?? "").replace(/\s+/g, "");
    const email = state.email ?? "";
    if (!/^\d{6,10}$/.test(token)) {
      setState({ step: "code", email, error: "Enter the code from the email." });
      return;
    }
    setBusy("verify");
    const { error } = await supabase().auth.verifyOtp({ email, token, type: "email" });
    setBusy(null);
    if (error) {
      setState({ step: "code", email, error: "That code didn't work. Check it, or send a new one." });
      return;
    }
    router.replace("/");
  }

  if (state.step === "email") {
    return (
      <form onSubmit={onSend} className="flex flex-col gap-3">
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.email} className="field" />
        {state.error && <p role="alert" className="text-[13px] font-semibold text-berry">{state.error}</p>}
        <button type="submit" disabled={busy !== null} className="btn-primary mt-1">
          {busy === "send" ? "Sending…" : "Email me a sign-in link"}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] leading-relaxed">
        We&apos;ve emailed <strong>{state.email}</strong>. Tap the link in it, or type the code here. Using the code is
        best if you added this app to your home screen.
      </p>
      <form onSubmit={onVerify} className="flex flex-col gap-3">
        <label htmlFor="token" className="label">Code from the email</label>
        <input
          id="token"
          name="token"
          inputMode="numeric"
          autoComplete="one-time-code"
          className="field font-mono tracking-[0.2em]"
        />
        {state.error && <p role="alert" className="text-[13px] font-semibold text-berry">{state.error}</p>}
        <button type="submit" disabled={busy !== null} className="btn-primary">
          {busy === "verify" ? "Checking…" : "Sign in"}
        </button>
      </form>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => send(state.email ?? "")}
        className="min-h-11 self-start text-[14px] font-semibold text-pine"
      >
        {busy === "send" ? "Sending…" : "Send a new email"}
      </button>
    </div>
  );
}
