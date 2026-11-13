"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

/** Finishes sign-in from the emailed link, then opens the app. */
function Callback() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const auth = supabase().auth;
      const tokenHash = params.get("token_hash");
      const type = params.get("type") as EmailOtpType | null;
      let ok = false;
      if (tokenHash && type) {
        ok = !(await auth.verifyOtp({ token_hash: tokenHash, type })).error;
      } else {
        // A ?code= link is exchanged automatically when the client starts; wait for it.
        const { data } = await auth.getSession();
        ok = !!data.session;
      }
      if (!cancelled) router.replace(ok ? "/" : "/login/?error=link");
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return <p className="p-8 text-center text-[15px] text-muted">Signing you in…</p>;
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <Callback />
    </Suspense>
  );
}
