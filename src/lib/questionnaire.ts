import { z } from "zod";

/**
 * Intake questionnaire (PHASE-2-PLAN §11): the coach knows the client before the first session.
 * Questions are edited in Paramètres › Questionnaire (settings row « questionnaire »); answers are stored
 * with a copy of each question, so editing the questionnaire later never changes what a client answered.
 */
export const QUESTION_TYPES = {
  short: "Réponse courte",
  long: "Réponse longue",
  single: "Un seul choix",
  multiple: "Plusieurs choix",
  scale: "Échelle de 1 à 10",
  date: "Date",
} as const;
export type QuestionType = keyof typeof QUESTION_TYPES;

export type Question = { id: string; label: string; type: QuestionType; options: string[]; required: boolean };
export type Questionnaire = { intro: string; questions: Question[] };
export type Answer = { id: string; label: string; type: QuestionType; value: string | string[] };

export const QUESTIONNAIRE_KEY = "questionnaire";

export const DEFAULT_QUESTIONNAIRE: Questionnaire = {
  intro:
    "Ces quelques questions m’aident à préparer notre première séance. Répondez simplement, avec vos mots : il n’y a pas de bonne ou de mauvaise réponse.",
  questions: [
    { id: "motivation", label: "Qu’est-ce qui vous amène aujourd’hui ?", type: "long", options: [], required: true },
    { id: "situation", label: "Votre situation actuelle, en quelques lignes", type: "long", options: [], required: false },
    { id: "objectif", label: "Votre objectif principal, en une phrase", type: "short", options: [], required: true },
    { id: "attentes", label: "Qu’attendez-vous de l’accompagnement ?", type: "long", options: [], required: false },
    { id: "clarte", label: "Aujourd’hui, à quel point votre projet est-il clair pour vous ?", type: "scale", options: [], required: false },
    { id: "echeance", label: "Une date importante à préparer (entretien, pitch, prise de poste…) ?", type: "date", options: [], required: false },
    {
      id: "disponibilites",
      label: "Vos moments préférés pour les séances",
      type: "multiple",
      options: ["Matin", "Midi", "Après-midi", "Soir"],
      required: false,
    },
    {
      id: "connu",
      label: "Comment m’avez-vous connu ?",
      type: "single",
      options: ["Recommandation", "LinkedIn", "Site internet", "Conférence / atelier", "Autre"],
      required: false,
    },
  ],
};

/** The stored settings, read safely (falls back to the default questionnaire). */
export function normalizeQuestionnaire(value: unknown): Questionnaire {
  const parsed = questionnaireSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_QUESTIONNAIRE;
}

const questionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_-]{1,40}$/i),
    label: z.string().trim().min(1, "Chaque question a besoin d’un intitulé.").max(300, "300 caractères maximum."),
    type: z.enum(Object.keys(QUESTION_TYPES) as [QuestionType, ...QuestionType[]]),
    options: z.array(z.string().trim().min(1).max(100)).max(12, "12 choix maximum."),
    required: z.boolean(),
  })
  .refine((q) => !(q.type === "single" || q.type === "multiple") || q.options.length >= 2, {
    message: "Une question à choix a besoin d’au moins deux choix.",
    path: ["options"],
  });

/** Paramètres › Questionnaire (sent as JSON by the editor). */
export const questionnaireSchema = z.object({
  intro: z.string().trim().max(1000, "1000 caractères maximum."),
  questions: z
    .array(questionSchema)
    .min(1, "Gardez au moins une question.")
    .max(30, "30 questions maximum.")
    .refine((qs) => new Set(qs.map((q) => q.id)).size === qs.length, "Questions en double."),
});

/**
 * Checks a submitted form (fields named q_<id>, consent) against the questions and returns the answers,
 * with a copy of each question. Errors are keyed by question id (« consent » for the consent box).
 */
export function readAnswers(
  questions: Question[],
  form: Record<string, string | string[] | undefined>,
): { ok: true; answers: Answer[] } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const answers: Answer[] = [];
  const text = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] ?? "" : v ?? "").trim();

  for (const q of questions) {
    const raw = form[`q_${q.id}`];
    let value: string | string[] = "";
    if (q.type === "multiple") {
      const picked = (Array.isArray(raw) ? raw : raw ? [raw] : []).map((v) => v.trim()).filter(Boolean);
      if (picked.some((p) => !q.options.includes(p))) errors[q.id] = "Choix invalide.";
      value = q.options.filter((o) => picked.includes(o));
    } else {
      value = text(raw);
      const max = q.type === "long" ? 5000 : 500;
      if (value.length > max) errors[q.id] = `${max} caractères maximum.`;
      else if (value && q.type === "single" && !q.options.includes(value)) errors[q.id] = "Choix invalide.";
      else if (value && q.type === "scale" && !/^(10|[1-9])$/.test(value)) errors[q.id] = "Choisissez une valeur de 1 à 10.";
      else if (value && q.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) errors[q.id] = "Date invalide.";
    }
    const empty = Array.isArray(value) ? value.length === 0 : value === "";
    if (q.required && empty && !errors[q.id]) errors[q.id] = "Cette réponse est nécessaire.";
    answers.push({ id: q.id, label: q.label, type: q.type, value });
  }
  if (text(form.consent) !== "on") errors.consent = "Merci d’accepter pour envoyer vos réponses.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, answers };
}

/** An answer as text (client file, e-mail). */
export function formatAnswer(a: Answer) {
  if (Array.isArray(a.value)) return a.value.join(", ") || "—";
  if (!a.value) return "—";
  if (a.type === "scale") return `${a.value} / 10`;
  if (a.type === "date") {
    const [y, m, d] = a.value.split("-");
    return `${d}/${m}/${y}`;
  }
  return a.value;
}
