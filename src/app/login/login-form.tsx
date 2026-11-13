"use client";

import { useActionState } from "react";
import { sendCode, verifyCode, type LoginState } from "./actions";

export function LoginForm() {
  const [sent, sendAction, sending] = useActionState<LoginState, FormData>(sendCode, { step: "email" });
  const [verified, verifyAction, verifying] = useActionState<LoginState, FormData>(verifyCode, { step: "code" });

  if (sent.step === "email") {
    return (
      <form action={sendAction} className="flex flex-col gap-3">
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={sent.email} className="field" />
        {sent.error && <p role="alert" className="text-[13px] font-semibold text-berry">{sent.error}</p>}
        <button type="submit" disabled={sending} className="btn-primary mt-1">
          {sending ? "Sending…" : "Email me a sign-in link"}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] leading-relaxed">
        We&apos;ve emailed <strong>{sent.email}</strong>. Tap the link in it, or type the code here. Using the code is
        best if you added this app to your home screen.
      </p>
      <form action={verifyAction} className="flex flex-col gap-3">
        <input type="hidden" name="email" value={sent.email} />
        <label htmlFor="token" className="label">Code from the email</label>
        <input
          id="token"
          name="token"
          inputMode="numeric"
          autoComplete="one-time-code"
          className="field font-mono tracking-[0.2em]"
        />
        {verified.error && <p role="alert" className="text-[13px] font-semibold text-berry">{verified.error}</p>}
        <button type="submit" disabled={verifying} className="btn-primary">
          {verifying ? "Checking…" : "Sign in"}
        </button>
      </form>
      <form action={sendAction}>
        <input type="hidden" name="email" value={sent.email} />
        <button type="submit" disabled={sending} className="min-h-11 text-[14px] font-semibold text-pine">
          {sending ? "Sending…" : "Send a new email"}
        </button>
      </form>
    </div>
  );
}
