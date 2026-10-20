"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CircleCheck, Send } from "lucide-react";
import type { Question } from "@/lib/questionnaire";
import { cn } from "@/lib/utils";
import { submitQuestionnaire, type QuestionnaireState } from "@/server/actions/questionnaire";
import { siteButton } from "./button";
import { inputClass } from "./form";

/**
 * /questionnaire/<token>: one page, mobile first. Answers stay in the form when something is missing
 * (uncontrolled fields + the browser keeps them, the server re-checks everything).
 */
export function QuestionnaireForm({ token, questions }: { token: string; questions: Question[] }) {
  const [state, action, pending] = useActionState<QuestionnaireState, FormData>(
    (prev, fd) => submitQuestionnaire(token, prev, fd),
    {},
  );

  if (state.done) {
    return (
      <div className="rounded-[12px] border border-[var(--jg-light-gray)] bg-white p-7 md:p-9" role="status">
        <CircleCheck aria-hidden className="size-8 text-[var(--jg-teal)]" strokeWidth={1.5} />
        <p className="jg-h4 mt-4 font-heading font-semibold text-navy">Merci, vos réponses sont bien envoyées.</p>
        <p className="mt-3">Je les lis avant notre première séance. À très vite !</p>
      </div>
    );
  }

  const err = (id: string) => state.errors?.[id];
  const text = (name: string) => {
    const v = state.values?.[name];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const picked = (name: string, option: string) => {
    const v = state.values?.[name];
    return Array.isArray(v) ? v.includes(option) : v === option;
  };
  return (
    <form action={action} noValidate className="grid gap-8">
      {questions.map((q, i) => {
        const name = `q_${q.id}`;
        const error = err(q.id);
        const describedBy = error ? `${name}-error` : undefined;
        return (
          <fieldset key={q.id} className="grid gap-3">
            <legend className="mb-3 font-heading text-[1.0625rem] font-semibold text-navy">
              <span className="text-gold" aria-hidden>
                {String(i + 1).padStart(2, "0")} —{" "}
              </span>
              {q.label}
              {!q.required && <span className="ml-1 font-sans text-[15px] font-normal">(facultatif)</span>}
            </legend>

            {q.type === "short" && (
              <input name={name} defaultValue={text(name)} aria-label={q.label} maxLength={500} aria-invalid={!!error || undefined} aria-describedby={describedBy} className={inputClass} />
            )}
            {q.type === "long" && (
              <textarea name={name} defaultValue={text(name)} aria-label={q.label} rows={4} maxLength={5000} aria-invalid={!!error || undefined} aria-describedby={describedBy} className={cn(inputClass, "resize-y")} />
            )}
            {q.type === "date" && (
              <input type="date" name={name} defaultValue={text(name)} aria-label={q.label} aria-invalid={!!error || undefined} aria-describedby={describedBy} className={cn(inputClass, "max-w-xs")} />
            )}
            {q.type === "scale" && (
              <div className="grid gap-2">
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                  {Array.from({ length: 10 }, (_, n) => n + 1).map((n) => (
                    <label key={n} className="relative">
                      <input type="radio" name={name} value={n} defaultChecked={picked(name, String(n))} className="peer sr-only" aria-describedby={describedBy} />
                      <span className="flex min-h-12 cursor-pointer items-center justify-center rounded-[7px] border border-[var(--jg-light-gray)] bg-white font-heading text-[15px] font-semibold text-navy transition-colors peer-checked:border-navy peer-checked:bg-navy peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-navy">
                        {n}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="jg-small flex justify-between">
                  <span>1 = pas du tout</span>
                  <span>10 = tout à fait</span>
                </p>
              </div>
            )}
            {(q.type === "single" || q.type === "multiple") && (
              <div className="grid gap-2 sm:grid-cols-2">
                {q.options.map((o) => (
                  <label key={o} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[7px] border border-[var(--jg-light-gray)] bg-white px-4 py-2">
                    <input
                      type={q.type === "single" ? "radio" : "checkbox"}
                      name={name}
                      value={o}
                      defaultChecked={picked(name, o)}
                      aria-describedby={describedBy}
                      className="size-5 shrink-0 accent-[var(--jg-navy)]"
                    />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
            )}
            {error && (
              <p id={`${name}-error`} className="jg-small font-semibold text-[#b42318]">
                {error}
              </p>
            )}
          </fieldset>
        );
      })}

      <div className="grid gap-2">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="consent" defaultChecked={text("consent") === "on"} aria-invalid={!!err("consent") || undefined} className="mt-1 size-5 shrink-0 accent-[var(--jg-navy)]" />
          <span className="jg-small">
            J’accepte que mes réponses soient conservées pour préparer mon accompagnement, conformément à la{" "}
            <Link href="/confidentialite" className="font-semibold text-navy underline underline-offset-2">
              politique de confidentialité
            </Link>
            .
          </span>
        </label>
        {err("consent") && <p className="jg-small font-semibold text-[#b42318]">{err("consent")}</p>}
      </div>

      {state.error && (
        <p role="alert" className="rounded-[7px] border border-[#b42318]/30 bg-[#b42318]/5 p-4 font-semibold text-[#b42318]">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={cn(siteButton(), "justify-self-start disabled:opacity-50")}>
        <Send aria-hidden />
        {pending ? "Envoi…" : "Envoyer mes réponses"}
      </button>
    </form>
  );
}
