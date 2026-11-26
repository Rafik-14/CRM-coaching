"use client";

import { useState } from "react";
import { ArrowRight, Check, Mail } from "lucide-react";
import { requestReport } from "@/server/actions/revelateur";
import type { DeliveryState } from "@/server/revelateur/delivery";
import { cinemaAudio } from "./audio";

export type EndTexts = { title: string; lead: string; question: string; body: string; closing: string; signature: string };

const gold = "border border-[#D4A866] bg-[#D4A866] font-display text-[12px] font-semibold tracking-[0.16em] text-[#172536] uppercase transition-all hover:bg-[#E2C08A] disabled:opacity-60";
const field = "w-full border-b border-[#F8F6F2]/30 bg-transparent py-3 text-[16px] font-light text-[#F8F6F2] placeholder:text-[#F8F6F2]/40 focus:border-[#D4A866] focus:outline-none";

/**
 * After confirmation (dossier v2.0 §2 steps 9–11): the address for the report, then « check your inbox »,
 * then the validated end screen once the report has left.
 */
export function ReportStep({ initial, end, callbackText }: { initial: DeliveryState; end: EndTexts; callbackText: string }) {
  const [state, setState] = useState<DeliveryState>(initial);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [callback, setCallback] = useState(false); // never pre-ticked (annexe 07 §8)
  const [phone, setPhone] = useState("");
  const [editing, setEditing] = useState(initial.status === "none");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [resent, setResent] = useState(false);

  const submit = async (address = email, name = firstName) => {
    setPending(true);
    setError(undefined);
    const r = await requestReport(address, name, callback ? { phone } : null).catch(() => ({ state, error: "Une erreur est survenue. Réessayez." }));
    setPending(false);
    setState(r.state);
    if (r.error) return setError(r.error);
    cinemaAudio.playTick();
    setEditing(false);
    return true;
  };

  if (state.status === "sent") return <EndScreen end={end} />;

  if (state.status !== "none" && state.status !== "awaiting_verification") {
    return (
      <Block kicker="Adresse confirmée" title="Votre rapport se prépare.">
        <p>
          Votre adresse <strong className="font-normal text-[#F8F6F2]">{state.email}</strong> est confirmée. Votre rapport personnalisé vous sera envoyé par
          e-mail, en pièce jointe, dès qu&apos;il sera prêt.
        </p>
        {state.status === "failed" && state.givenUp && <p className="text-[#E2C08A]">L&apos;envoi n&apos;a pas abouti. Nous revenons vers vous rapidement.</p>}
      </Block>
    );
  }

  if (state.status === "awaiting_verification" && !editing) {
    return (
      <Block kicker="Dernière étape" title="Vérifiez votre boîte de réception.">
        <p>
          Un lien de confirmation vient d&apos;être envoyé à <strong className="font-normal text-[#F8F6F2]">{state.email}</strong>. Cliquez dessus pour recevoir
          votre rapport. Pensez à regarder dans les courriers indésirables.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            type="button"
            disabled={pending || !email}
            onClick={async () => (await submit()) && setResent(true)}
            className="font-film inline-flex items-center gap-2 text-[10.5px] tracking-[0.18em] text-[#F8F6F2]/70 uppercase hover:text-[#E2C08A] disabled:opacity-40"
            title={!email ? "Saisissez à nouveau votre adresse pour renvoyer le lien" : undefined}
          >
            <Mail size={13} /> {resent ? "Lien renvoyé" : "Renvoyer le lien"}
          </button>
          <button type="button" onClick={() => setEditing(true)} className="font-film text-[10.5px] tracking-[0.18em] text-[#F8F6F2]/70 uppercase hover:text-[#E2C08A]">
            Modifier l&apos;adresse
          </button>
        </div>
        {error && <p role="alert" className="mt-4 text-[#E2C08A]">{error}</p>}
      </Block>
    );
  }

  return (
    <Block kicker="Votre rapport personnalisé" title="Où souhaitez-vous recevoir votre rapport ?">
      <p>Votre rapport vous sera envoyé par e-mail, en pièce jointe. Votre adresse sert uniquement à cet envoi et à un éventuel renvoi.</p>
      <form
        className="mx-auto mt-8 grid max-w-md gap-5 text-left"
        onSubmit={(e) => {
          e.preventDefault();
          if (!pending) void submit();
        }}
      >
        <label className="grid gap-1">
          <span className="font-film text-[10px] tracking-[0.2em] text-[#D4A866] uppercase">Prénom · facultatif</span>
          <input className={field} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" maxLength={60} />
        </label>
        <label className="grid gap-1">
          <span className="font-film text-[10px] tracking-[0.2em] text-[#D4A866] uppercase">Adresse e-mail</span>
          <input
            className={field}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            placeholder="vous@exemple.fr"
          />
        </label>
        <div className="mt-2 grid gap-3 border-t border-[#F8F6F2]/12 pt-5">
          <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-[1.6] font-light text-[#F8F6F2]/85">
            <input type="checkbox" checked={callback} onChange={(e) => setCallback(e.target.checked)} className="mt-1 size-4 accent-[#D4A866]" />
            <span>
              {callbackText} <span className="text-[#F8F6F2]/55">(facultatif)</span>
            </span>
          </label>
          {callback && (
            <label className="grid gap-1">
              <span className="font-film text-[10px] tracking-[0.2em] text-[#D4A866] uppercase">Téléphone (France ou Suisse)</span>
              <input className={field} type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" maxLength={20} placeholder="06 12 34 56 78" />
            </label>
          )}
        </div>
        {error && <p role="alert" className="text-[14px] text-[#E2C08A]">{error}</p>}
        <button type="submit" disabled={pending} className={`mt-3 inline-flex items-center justify-center gap-3 px-8 py-4 ${gold}`}>
          Recevoir mon rapport <ArrowRight size={15} />
        </button>
      </form>
    </Block>
  );
}

function Block({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center text-center">
      <p className="font-film text-[10.5px] tracking-[0.26em] text-[#D4A866] uppercase">{kicker}</p>
      <h2 className="mt-4 font-display text-[28px] leading-[1.15] font-extralight tracking-[-0.02em] text-[#F8F6F2] sm:text-[36px]">{title}</h2>
      <div className="mt-5 grid gap-3 text-[15.5px] leading-[1.75] font-light text-[#F8F6F2]/80">{children}</div>
    </div>
  );
}

/** The validated end screen (v2.0 §2), once the report has left. */
export function EndScreen({ end }: { end: EndTexts }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D4A866]/55 bg-[#D4A866]/12 text-[#E2C08A]">
        <Check size={20} strokeWidth={1.4} />
      </div>
      <h1 className="mt-7 font-display text-[34px] leading-[1.12] font-extralight tracking-[-0.02em] text-[#F8F6F2] sm:text-[46px]">{end.title}</h1>
      <p className="mt-3 text-[16px] font-light text-[#F8F6F2]/80">{end.lead}</p>
      <p className="mt-10 font-display text-[20px] font-light text-[#E2C08A] sm:text-[24px]">{end.question}</p>
      <p className="mt-4 max-w-lg text-[15.5px] leading-[1.8] font-light text-[#F8F6F2]/78">{end.body}</p>
      <p className="mt-6 font-display text-[16px] text-[#F8F6F2]">{end.closing}</p>
      <p className="font-film mt-10 text-[10px] tracking-[0.26em] text-[#D4A866]/85 uppercase">{end.signature}</p>
    </div>
  );
}
