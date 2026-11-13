"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LoginForm } from "./login-form";

function LinkError() {
  const error = useSearchParams().get("error");
  if (!error) return null;
  return (
    <p role="alert" className="rounded-xl bg-berry-soft px-4 py-3 text-[14px] font-semibold text-berry-dark">
      That sign-in link has expired or was opened in a different browser. Send a new one below.
    </p>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-12">
      <title>Sign in · Gift Tracker</title>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[34px] leading-tight font-bold">Christmas, sorted.</h1>
        <p className="text-[15px] text-muted">
          Keep gift ideas, budgets and deliveries for everyone on your list in one place.
        </p>
      </div>
      <Suspense>
        <LinkError />
      </Suspense>
      <div className="card p-5">
        <LoginForm />
      </div>
    </main>
  );
}
