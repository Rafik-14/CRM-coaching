"use client";

import { useActionState, useRef } from "react";
import { Download, Eye, FileText, ImageIcon, Loader2, Lock, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatDate } from "@/lib/format";
import { ACCEPT_ATTRIBUTE, MAX_DOCUMENT_BYTES } from "@/lib/validations/documents";
import { deleteDocument, uploadDocument } from "@/server/actions/documents";
import type { ActionState } from "@/server/actions/coaching";

type Doc = { id: string; fileName: string; mimeType: string; size: number; createdAt: Date };

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / 1024 / 1024).toFixed(1)} Mo`;

export function DocumentsPanel({ contactId, documents }: { contactId: string; documents: Doc[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await uploadDocument(contactId, prev, fd);
    if (r.ok) toast.success("Document ajouté");
    else if (r.error) toast.error(r.error);
    if (inputRef.current) inputRef.current.value = "";
    return r;
  }, {});

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="flex items-center gap-2 font-medium">
              <Lock className="size-4 text-muted-foreground" /> Documents privés
            </p>
            <p className="text-sm text-muted-foreground">
              PDF, images, Word ou texte · {MAX_DOCUMENT_BYTES / 1024 / 1024} Mo maximum. Visibles par vous seul.
            </p>
          </div>
          <form ref={formRef} action={formAction}>
            <input
              ref={inputRef}
              type="file"
              name="file"
              accept={ACCEPT_ATTRIBUTE}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > MAX_DOCUMENT_BYTES) {
                  toast.error("Fichier trop lourd (10 Mo maximum).");
                  e.target.value = "";
                  return;
                }
                formRef.current?.requestSubmit();
              }}
            />
            <Button type="button" disabled={pending} onClick={() => inputRef.current?.click()}>
              {pending ? <Loader2 className="animate-spin" /> : <Upload />}
              {pending ? "Envoi…" : "Ajouter un document"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {documents.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aucun document. Ajoutez un bilan, un exercice ou un contrat.
        </p>
      ) : (
        <Card className="py-2">
          <CardContent className="px-4">
            <ul className="divide-y divide-border">
              {documents.map((d) => {
                const isImage = d.mimeType.startsWith("image/");
                const canPreview = isImage || d.mimeType === "application/pdf";
                const Icon = isImage ? ImageIcon : FileText;
                return (
                  <li key={d.id} className="flex items-center gap-3 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(d.size)} · ajouté le {formatDate(d.createdAt)}
                      </p>
                    </div>
                    {canPreview && (
                      <Button variant="ghost" size="icon" className="size-8" asChild>
                        <a href={`/api/fichiers/${d.id}?apercu=1`} target="_blank" rel="noopener" aria-label={`Ouvrir ${d.fileName}`}>
                          <Eye />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="size-8" asChild>
                      <a href={`/api/fichiers/${d.id}`} aria-label={`Télécharger ${d.fileName}`}>
                        <Download />
                      </a>
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={`Supprimer ${d.fileName}`}>
                          <Trash2 />
                        </Button>
                      }
                      title="Supprimer ce document ?"
                      description={`« ${d.fileName} » sera définitivement supprimé du serveur.`}
                      successMessage="Document supprimé"
                      onConfirm={() => deleteDocument(d.id)}
                    />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
