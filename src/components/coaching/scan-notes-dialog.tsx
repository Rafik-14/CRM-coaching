"use client";

import { useActionState, useRef, useState, startTransition } from "react";
import { ArrowLeft, ArrowRight, Camera, ImagePlus, Loader2, ScanLine, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/form-field";
import { MAX_SCAN_PAGES, SCAN_UPLOAD_MAX_SIDE } from "@/lib/validations/documents";
import { scanNotes } from "@/server/actions/documents";
import type { ActionState } from "@/server/actions/coaching";

type Page = { id: string; blob: Blob; url: string };
/** Sessions of the client, most recent first. */
export type SessionOption = { id: string; label: string; startsAt: string };

/** Phone photos are 3–6 MB: reduce them in the browser (≈ 2 000 px, JPEG) before sending. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const k = Math.min(1, SCAN_UPLOAD_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Photo illisible"))), "image/jpeg", 0.85),
  );
}

const today = () =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

export function ScanNotesDialog({ contactId, sessions }: { contactId: string; sessions: SessionOption[] }) {
  const [open, setOpen] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [sessionId, setSessionId] = useState("none");

  function changeOpen(next: boolean) {
    if (next) {
      // Notes usually belong to the session that just happened (or today's).
      const soon = Date.now() + 12 * 3_600_000;
      setSessionId(sessions.find((s) => new Date(s.startsAt).getTime() <= soon)?.id ?? "none");
    } else {
      // Free the thumbnails.
      setPages((current) => {
        current.forEach((p) => URL.revokeObjectURL(p.url));
        return [];
      });
    }
    setOpen(next);
  }
  const [preparing, setPreparing] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await scanNotes(contactId, prev, fd);
    if (r.ok) {
      toast.success(r.message ?? "PDF créé");
      changeOpen(false);
    } else if (r.error) toast.error(r.error);
    return r;
  }, {});


  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const room = MAX_SCAN_PAGES - pages.length;
    const files = [...list].filter((f) => f.type.startsWith("image/")).slice(0, room);
    if (list.length > room) toast.error(`${MAX_SCAN_PAGES} pages maximum par document.`);
    setPreparing(true);
    try {
      const added: Page[] = [];
      for (const file of files) {
        const blob = await shrink(file);
        added.push({ id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) });
      }
      setPages((current) => [...current, ...added]);
    } catch {
      toast.error("Une photo n'a pas pu être lue.");
    } finally {
      setPreparing(false);
    }
  }

  const move = (index: number, delta: number) =>
    setPages((current) => {
      const next = [...current];
      const [page] = next.splice(index, 1);
      next.splice(index + delta, 0, page);
      return next;
    });

  const remove = (id: string) =>
    setPages((current) => {
      const page = current.find((p) => p.id === id);
      if (page) URL.revokeObjectURL(page.url);
      return current.filter((p) => p.id !== id);
    });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pages.length) {
      toast.error("Ajoutez au moins une page.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    pages.forEach((p, i) => fd.append("pages", p.blob, `page-${i + 1}.jpg`));
    startTransition(() => action(fd));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && changeOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ScanLine /> Scanner des notes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Scanner des notes manuscrites</DialogTitle>
          <DialogDescription>
            Photographiez vos pages : elles sont redressées, nettoyées et réunies dans un PDF au nom du client. Tout est
            traité sur votre serveur.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={submit} className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Titre" htmlFor="scan-title" error={state.fieldErrors?.title?.[0]} className="sm:col-span-2">
              <Input id="scan-title" name="title" defaultValue={`Notes de séance – ${today()}`} maxLength={120} required />
            </FormField>
            <FormField label="Séance liée" htmlFor="scan-session">
              <Select name="sessionId" value={sessionId} onValueChange={setSessionId}>
                <SelectTrigger id="scan-session" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField
              label="Mots-clés"
              htmlFor="scan-keywords"
              hint="Séparés par des virgules, ex. posture, pitch"
              error={state.fieldErrors?.keywords?.[0]}
            >
              <Input id="scan-keywords" name="keywords" placeholder="posture, pitch" />
            </FormField>
          </div>

          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <input
                ref={filesRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button type="button" onClick={() => cameraRef.current?.click()} disabled={preparing || pending}>
                <Camera /> Prendre une photo
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => filesRef.current?.click()}
                disabled={preparing || pending}
              >
                <ImagePlus /> Importer des photos
              </Button>
              <span className="text-xs text-muted-foreground">
                {pages.length}/{MAX_SCAN_PAGES} pages
                {preparing && " · préparation…"}
              </span>
            </div>

            {pages.length === 0 ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Une photo par page, prise d’au-dessus, la feuille entière dans le cadre.
              </p>
            ) : (
              <ol className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {pages.map((p, i) => (
                  <li key={p.id} className="relative overflow-hidden rounded-lg border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local preview (blob URL) */}
                    <img src={p.url} alt={`Page ${i + 1}`} className="aspect-[3/4] w-full object-cover" />
                    <span className="absolute top-1 left-1 rounded bg-background/90 px-1.5 text-xs font-semibold tabular-nums">
                      {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground"
                      aria-label={`Retirer la page ${i + 1}`}
                    >
                      <X className="size-4" />
                    </button>
                    <div className="absolute inset-x-1 bottom-1 flex justify-between">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        className="flex size-7 items-center justify-center rounded-full bg-background/90 disabled:opacity-30"
                        aria-label={`Avancer la page ${i + 1}`}
                      >
                        <ArrowLeft className="size-4" />
                      </button>
                      <button
                        type="button"
                        disabled={i === pages.length - 1}
                        onClick={() => move(i, 1)}
                        className="flex size-7 items-center justify-center rounded-full bg-background/90 disabled:opacity-30"
                        aria-label={`Reculer la page ${i + 1}`}
                      >
                        <ArrowRight className="size-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => changeOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending || preparing || pages.length === 0}>
              {pending ? <Loader2 className="animate-spin" /> : <ScanLine />}
              {pending ? "Traitement des pages…" : "Créer le PDF"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
