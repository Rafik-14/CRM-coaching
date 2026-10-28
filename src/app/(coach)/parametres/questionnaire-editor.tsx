"use client";

import { useActionState, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/form-field";
import { DEFAULT_QUESTIONNAIRE, QUESTION_TYPES, type Question, type QuestionType, type Questionnaire } from "@/lib/questionnaire";
import { saveQuestionnaire } from "@/server/actions/questionnaire";
import type { ActionState } from "@/server/actions/coaching";

const hasOptions = (t: QuestionType) => t === "single" || t === "multiple";
const newId = () => `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Paramètres › Questionnaire: questions in order, each with its type, choices and « obligatoire ». */
export function QuestionnaireEditor({ questionnaire }: { questionnaire: Questionnaire }) {
  const [intro, setIntro] = useState(questionnaire.intro);
  const [questions, setQuestions] = useState<Question[]>(questionnaire.questions);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await saveQuestionnaire(prev, fd);
    if (r.ok) toast.success("Questionnaire enregistré");
    else if (r.error) toast.error(r.error);
    return r;
  }, {});

  const update = (i: number, patch: Partial<Question>) => setQuestions(questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const move = (i: number, by: -1 | 1) => {
    const next = [...questions];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    setQuestions(next);
  };

  return (
    <form action={formAction} className="grid gap-6">
      <input
        type="hidden"
        name="data"
        value={JSON.stringify({
          intro,
          questions: questions.map((q) => ({ ...q, options: hasOptions(q.type) ? q.options.map((o) => o.trim()).filter(Boolean) : [] })),
        })}
      />
      <FormField label="Texte d’accueil" htmlFor="q-intro" hint="Affiché en haut du questionnaire.">
        <Textarea id="q-intro" rows={2} value={intro} onChange={(e) => setIntro(e.target.value)} maxLength={1000} />
      </FormField>

      <ol className="grid gap-3">
        {questions.map((q, i) => (
          <li key={q.id} className="grid gap-3 rounded-xl border border-border p-4">
            <div className="flex items-start gap-3">
              <span className="mt-2 w-6 shrink-0 text-sm font-semibold text-muted-foreground tabular-nums">{i + 1}.</span>
              <Input value={q.label} onChange={(e) => update(i, { label: e.target.value })} aria-label={`Question ${i + 1}`} placeholder="Intitulé de la question" maxLength={300} />
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Monter">
                  <ArrowUp />
                </Button>
                <Button type="button" variant="ghost" size="icon" disabled={i === questions.length - 1} onClick={() => move(i, 1)} aria-label="Descendre">
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={questions.length === 1}
                  onClick={() => setQuestions(questions.filter((_, j) => j !== i))}
                  aria-label="Supprimer la question"
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
            <div className="grid gap-3 pl-9 sm:grid-cols-[220px_1fr] sm:items-start">
              <Select value={q.type} onValueChange={(v) => update(i, { type: v as QuestionType, options: hasOptions(v as QuestionType) && q.options.length < 2 ? ["Oui", "Non"] : q.options })}>
                <SelectTrigger className="w-full" aria-label="Type de réponse">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(QUESTION_TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid gap-3">
                {hasOptions(q.type) && (
                  <Textarea
                    rows={3}
                    value={q.options.join("\n")}
                    onChange={(e) => update(i, { options: e.target.value.split("\n").map((o) => o.trimStart()).filter((o, k, all) => o || k === all.length - 1) })}
                    aria-label="Choix, un par ligne"
                    placeholder="Un choix par ligne"
                  />
                )}
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={q.required} onChange={(e) => update(i, { required: e.target.checked })} className="size-4 accent-primary" />
                  Réponse obligatoire
                </label>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={questions.length >= 30}
          onClick={() => setQuestions([...questions, { id: newId(), label: "", type: "short", options: [], required: false }])}
        >
          <Plus /> Ajouter une question
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setIntro(DEFAULT_QUESTIONNAIRE.intro);
            setQuestions(DEFAULT_QUESTIONNAIRE.questions);
          }}
        >
          <RotateCcw /> Questionnaire d’origine
        </Button>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Enregistrer
        </Button>
        <p className="text-xs text-muted-foreground">
          Une case d’accord (données personnelles) est toujours ajoutée à la fin. Les réponses déjà reçues gardent leurs questions.
        </p>
      </div>
    </form>
  );
}
