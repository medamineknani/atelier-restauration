import type { orderNotes } from "@/server/db/schema";
import { createTranslator } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import { addOrderNote } from "@/server/actions/admin";
import { EmptyRow, Panel } from "@/components/admin/ui";
import { NoteForm } from "@/components/admin/note-form";

/**
 * Fil unifié des messages.
 *
 * Notes internes et messages clients cohabitent, distingués par le fond et
 * une mention explicite. Séparer les deux fils obligerait à deviner où l'on
 * a bien voulu écrire — et à perdre la chronologie.
 */
export function NotesTab({
  orderId,
  notes,
}: {
  orderId: string;
  notes: (typeof orderNotes.$inferSelect)[];
}) {
  const t = createTranslator("fr");

  return (
    <div className="grid gap-4">
      <Panel title={t("admin.notesAndMessages")}>
        {notes.length === 0 ? (
          <EmptyRow>{t("admin.noEntries")}</EmptyRow>
        ) : (
          <ul className="grid gap-3">
            {notes.map((note) => (
              <li
                key={note.id}
                className={`rounded-md border p-4 ${
                  note.isInternal
                    ? "border-line bg-sand/50"
                    : "border-champagne/40 bg-cream"
                }`}
              >
                <p className="flex flex-wrap items-center gap-2 text-[0.75rem] text-stone">
                  <span className="text-ink">{note.authorName || "Atelier"}</span>
                  <span>·</span>
                  <span>{formatDateTime(note.createdAt, "fr")}</span>
                  <span
                    className={`rounded-[3px] px-1.5 py-0.5 ${
                      note.isInternal ? "bg-sand text-stone" : "bg-champagne-soft text-champagne-deep"
                    }`}
                  >
                    {note.isInternal ? t("admin.internal") : t("admin.client")}
                  </span>
                </p>
                <p className="mt-2 whitespace-pre-line text-[0.875rem] leading-relaxed text-ink">
                  {note.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={t("admin.addNote")}>
        <NoteForm
          action={addOrderNote}
          orderId={orderId}
          labels={{
            internal: t("admin.internal"),
            client: t("admin.client"),
            placeholderInternal: t("admin.internalNotePlaceholder"),
            placeholderClient: t("admin.placeholderClient"),
            send: t("admin.send"),
            sending: "…",
          }}
        />
      </Panel>
    </div>
  );
}
