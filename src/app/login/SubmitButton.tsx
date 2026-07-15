"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  formAction,
  intent,
  idleLabel,
  pendingLabel,
  className,
}: {
  formAction: (formData: FormData) => void;
  intent: string;
  idleLabel: string;
  pendingLabel: string;
  className: string;
}) {
  const { pending, data } = useFormStatus();
  // Which button triggered the in-flight submit (both share the form's status).
  const isThisPending = pending && data?.get("intent") === intent;

  return (
    <button
      formAction={formAction}
      name="intent"
      value={intent}
      disabled={pending}
      aria-busy={isThisPending}
      className={className}
    >
      {isThisPending ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {pendingLabel}
        </span>
      ) : (
        idleLabel
      )}
    </button>
  );
}
