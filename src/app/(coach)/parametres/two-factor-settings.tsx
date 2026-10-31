"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  confirmTwoFactor,
  disableTwoFactor,
  renewBackupCodes,
  startTwoFactor,
  type TwoFactorManageState,
  type TwoFactorSetupState,
} from "@/server/actions/two-factor";

/**
 * « Mon compte » › two-step login: status, turn on (3 steps), new backup codes, turn off.
 * Confirming a code renews the session cookie, which makes Next.js re-render the page while a dialog is still open:
 * every dialog therefore stays mounted at the same place whatever the status (only its trigger button is hidden),
 * so the backup codes or the confirmation are not lost.
 */
export function TwoFactorSettings({ enabled }: { enabled: boolean }) {
  return (
    <div className="grid gap-3">
      {enabled ? (
        <p className="flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
            <ShieldCheck className="size-3.5" /> Activée
          </span>
          Un code de votre téléphone est demandé à chaque connexion.
        </p>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldOff className="size-4 shrink-0" />
          Désactivée. Recommandé : en plus du mot de passe, un code de votre téléphone protège vos notes de séance.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <EnableDialog showTrigger={!enabled} />
        <PasswordDialog
          showTrigger={enabled}
          trigger="Nouveaux codes de secours"
          title="Nouveaux codes de secours"
          description="Les anciens codes ne fonctionneront plus. Confirmez avec votre mot de passe."
          action={renewBackupCodes}
          submit="Générer"
        />
        <PasswordDialog
          showTrigger={enabled}
          trigger="Désactiver"
          title="Désactiver la double authentification"
          description="La connexion ne demandera plus que le mot de passe. Confirmez avec votre mot de passe."
          action={disableTwoFactor}
          submit="Désactiver"
          destructive
        />
      </div>
    </div>
  );
}

function EnableDialog({ showTrigger }: { showTrigger: boolean }) {
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);
  const router = useRouter();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setRound((r) => r + 1); // fresh steps next time
          router.refresh();
        }
      }}
    >
      {showTrigger && (
        <DialogTrigger asChild>
          <Button>
            <ShieldCheck /> Activer la double authentification
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <EnableSteps key={round} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function EnableSteps({ onDone }: { onDone: () => void }) {
  const [setup, start, starting] = useActionState<TwoFactorSetupState, FormData>(startTwoFactor, {});
  const [confirm, confirmAction, confirming] = useActionState<TwoFactorSetupState, FormData>(confirmTwoFactor, {});

  if (confirm.enabled && setup.backupCodes) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>3. Gardez vos codes de secours</DialogTitle>
          <DialogDescription>
            La double authentification est activée. Si vous perdez votre téléphone, chacun de ces codes permet une
            connexion, une seule fois. Rangez-les en lieu sûr (imprimés ou dans un gestionnaire de mots de passe).
          </DialogDescription>
        </DialogHeader>
        <BackupCodes codes={setup.backupCodes} />
        <Button onClick={onDone}>J’ai enregistré mes codes</Button>
      </>
    );
  }

  if (setup.qr) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>2. Scannez le QR code</DialogTitle>
          <DialogDescription>
            Avec une application d’authentification (Google Authenticator, Microsoft Authenticator, Mots de passe
            d’Apple…), scannez ce code puis saisissez les 6 chiffres affichés.
          </DialogDescription>
        </DialogHeader>
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL generated on the server */}
        <img src={setup.qr} alt="QR code à scanner avec l’application d’authentification" width={220} height={220} className="mx-auto rounded-md border border-border" />
        <p className="text-center text-xs text-muted-foreground">
          Pas de scan possible ? Clé à saisir dans l’application :
          <br />
          <code className="mt-1 inline-block rounded bg-muted px-2 py-1 font-mono text-[13px] tracking-wider text-foreground">
            {setup.secret?.match(/.{1,4}/g)?.join(" ")}
          </code>
        </p>
        <form action={confirmAction} className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="tf-code">Code à 6 chiffres</Label>
            <Input
              id="tf-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              className="h-11 text-center text-lg tracking-[0.3em]"
              autoFocus
              required
            />
          </div>
          {confirm.error && <p role="alert" className="text-sm text-destructive">{confirm.error}</p>}
          <Button type="submit" disabled={confirming}>
            {confirming && <Loader2 className="animate-spin" />} Vérifier et activer
          </Button>
        </form>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>1. Confirmez votre mot de passe</DialogTitle>
        <DialogDescription>
          Ensuite, vous associerez une application d’authentification de votre téléphone à votre compte.
        </DialogDescription>
      </DialogHeader>
      <form action={start} className="grid gap-3">
        <div className="grid gap-2">
          <Label htmlFor="tf-password">Mot de passe</Label>
          <Input id="tf-password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {setup.error && <p role="alert" className="text-sm text-destructive">{setup.error}</p>}
        <Button type="submit" disabled={starting}>
          {starting && <Loader2 className="animate-spin" />} Continuer
        </Button>
      </form>
    </>
  );
}

function PasswordDialog({
  showTrigger,
  trigger,
  title,
  description,
  action,
  submit,
  destructive,
}: {
  showTrigger: boolean;
  trigger: string;
  title: string;
  description: string;
  action: (prev: TwoFactorManageState, formData: FormData) => Promise<TwoFactorManageState>;
  submit: string;
  destructive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);
  const router = useRouter();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setRound((r) => r + 1);
          router.refresh();
        }
      }}
    >
      {showTrigger && (
        <DialogTrigger asChild>
          <Button size="sm" variant={destructive ? "outline" : "secondary"}>
            {trigger}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <PasswordForm key={round} action={action} submit={submit} destructive={destructive} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PasswordForm({
  action,
  submit,
  destructive,
  onDone,
}: {
  action: (prev: TwoFactorManageState, formData: FormData) => Promise<TwoFactorManageState>;
  submit: string;
  destructive?: boolean;
  onDone: () => void;
}) {
  const [state, run, pending] = useActionState<TwoFactorManageState, FormData>(action, {});
  if (state.backupCodes) {
    return (
      <>
        <BackupCodes codes={state.backupCodes} />
        <Button onClick={onDone}>J’ai enregistré mes codes</Button>
      </>
    );
  }
  if (state.done) {
    return (
      <>
        <p className="text-sm">La double authentification est désactivée.</p>
        <Button onClick={onDone}>Fermer</Button>
      </>
    );
  }
  return (
    <form action={run} className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="tf-confirm-password">Mot de passe</Label>
        <Input id="tf-confirm-password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} variant={destructive ? "destructive" : "default"}>
        {pending && <Loader2 className="animate-spin" />} {submit}
      </Button>
    </form>
  );
}

/** The backup codes, with copy and download (.txt). */
function BackupCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  const text = `Codes de secours — Jérémy Galéa CRM\nChaque code ne sert qu’une fois.\n\n${codes.join("\n")}\n`;
  return (
    <div className="grid gap-3">
      <ul className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/50 p-4 font-mono text-sm">
        {codes.map((c) => (
          <li key={c} className="text-center tracking-wider">
            {c}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
          }}
        >
          {copied ? <Check /> : <Copy />} {copied ? "Copiés" : "Copier"}
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`} download="codes-de-secours-crm.txt">
            <Download /> Télécharger (.txt)
          </a>
        </Button>
      </div>
    </div>
  );
}
