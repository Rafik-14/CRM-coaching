import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Entrez votre adresse e-mail.")
    .pipe(z.email("Adresse e-mail invalide (exemple : nom@domaine.fr).").toLowerCase()),
  password: z.string().min(1, "Entrez votre mot de passe.").max(128),
});
