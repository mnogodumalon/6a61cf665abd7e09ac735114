/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'skateparksVeranstaltungsorte'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.skateparksVeranstaltungsorte.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.skateparksVeranstaltungsorte.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.skateparksVeranstaltungsorte.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.skateparksVeranstaltungsorte              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   skateparks_veranstaltungsorte: location_name, street, house_number, postal_code, city, description, special_notes, location_photo  ·  ← event_verwaltung (list + contextual +)
 *   teilnehmer_anmeldung: emergency_contact_email, event, participant_firstname, participant_lastname, participant_email, participant_phone, date_of_birth, participant_skill_level, …  ·  → event_verwaltung
 *   event_verwaltung: organizer_notes, event_title, event_description, event_category, event_datetime, skill_level, max_participants, entry_fee, …  ·  → skateparks_veranstaltungsorte · ← teilnehmer_anmeldung (list + contextual +)
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { SkateparksVeranstaltungsorte, TeilnehmerAnmeldung, EventVerwaltung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichTeilnehmerAnmeldung, enrichEventVerwaltung } from '@/lib/enrich';
import type { EnrichedTeilnehmerAnmeldung, EnrichedEventVerwaltung } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { SkateparksVeranstaltungsorteDialog, type SkateparksVeranstaltungsorteDialogDefaults } from '@/components/dialogs/SkateparksVeranstaltungsorteDialog';
import { SkateparksVeranstaltungsorteDetails } from '@/components/details/SkateparksVeranstaltungsorteDetails';
import { TeilnehmerAnmeldungDialog, type TeilnehmerAnmeldungDialogDefaults } from '@/components/dialogs/TeilnehmerAnmeldungDialog';
import { TeilnehmerAnmeldungDetails } from '@/components/details/TeilnehmerAnmeldungDetails';
import { EventVerwaltungDialog, type EventVerwaltungDialogDefaults } from '@/components/dialogs/EventVerwaltungDialog';
import { EventVerwaltungDetails } from '@/components/details/EventVerwaltungDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'skateparksVeranstaltungsorte'; record: SkateparksVeranstaltungsorte }
  | { type: 'teilnehmerAnmeldung'; record: EnrichedTeilnehmerAnmeldung }
  | { type: 'eventVerwaltung'; record: EnrichedEventVerwaltung };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  skateparksVeranstaltungsorte: EntityCrudApi<SkateparksVeranstaltungsorte, SkateparksVeranstaltungsorteDialogDefaults>;
  teilnehmerAnmeldung: EntityCrudApi<TeilnehmerAnmeldung, TeilnehmerAnmeldungDialogDefaults>;
  eventVerwaltung: EntityCrudApi<EventVerwaltung, EventVerwaltungDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { skateparksVeranstaltungsorte: SkateparksVeranstaltungsorte[]; teilnehmerAnmeldung: EnrichedTeilnehmerAnmeldung[]; eventVerwaltung: EnrichedEventVerwaltung[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  const [skateparksVeranstaltungsorteDialog, setSkateparksVeranstaltungsorteDialog] = useState<{ defaults?: SkateparksVeranstaltungsorteDialogDefaults; editing?: SkateparksVeranstaltungsorte } | null>(null);
  const [teilnehmerAnmeldungDialog, setTeilnehmerAnmeldungDialog] = useState<{ defaults?: TeilnehmerAnmeldungDialogDefaults; editing?: TeilnehmerAnmeldung } | null>(null);
  const [eventVerwaltungDialog, setEventVerwaltungDialog] = useState<{ defaults?: EventVerwaltungDialogDefaults; editing?: EventVerwaltung } | null>(null);
  const enrichedTeilnehmerAnmeldung = useMemo(() => enrichTeilnehmerAnmeldung(data.teilnehmerAnmeldung, { eventVerwaltungMap: data.eventVerwaltungMap }), [data.teilnehmerAnmeldung, data.eventVerwaltungMap]);
  const enrichedEventVerwaltung = useMemo(() => enrichEventVerwaltung(data.eventVerwaltung, { skateparksVeranstaltungsorteMap: data.skateparksVeranstaltungsorteMap }), [data.eventVerwaltung, data.skateparksVeranstaltungsorteMap]);

  function detailSkateparksVeranstaltungsorte(record: SkateparksVeranstaltungsorte, push = false) {
    const item: OverlayItem = { type: 'skateparksVeranstaltungsorte', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitSkateparksVeranstaltungsorte(fields: SkateparksVeranstaltungsorte['fields']) {
    const editing = skateparksVeranstaltungsorteDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setSkateparksVeranstaltungsorte(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateSkateparksVeranstaltungsorteEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('skateparks_veranstaltungsorte')} — ${t('crud_updated')}`, async () => {
        data.setSkateparksVeranstaltungsorte(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateSkateparksVeranstaltungsorteEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createSkateparksVeranstaltungsorteEntry(fields);
      undoToast(`${appLabel('skateparks_veranstaltungsorte')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailTeilnehmerAnmeldung(record: TeilnehmerAnmeldung, push = false) {
    const rec = enrichedTeilnehmerAnmeldung.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'teilnehmerAnmeldung', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitTeilnehmerAnmeldung(fields: TeilnehmerAnmeldung['fields']) {
    const editing = teilnehmerAnmeldungDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setTeilnehmerAnmeldung(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateTeilnehmerAnmeldungEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('teilnehmer_anmeldung')} — ${t('crud_updated')}`, async () => {
        data.setTeilnehmerAnmeldung(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateTeilnehmerAnmeldungEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createTeilnehmerAnmeldungEntry(fields);
      undoToast(`${appLabel('teilnehmer_anmeldung')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailEventVerwaltung(record: EventVerwaltung, push = false) {
    const rec = enrichedEventVerwaltung.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'eventVerwaltung', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitEventVerwaltung(fields: EventVerwaltung['fields']) {
    const editing = eventVerwaltungDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setEventVerwaltung(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateEventVerwaltungEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('event_verwaltung')} — ${t('crud_updated')}`, async () => {
        data.setEventVerwaltung(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateEventVerwaltungEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createEventVerwaltungEntry(fields);
      undoToast(`${appLabel('event_verwaltung')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <SkateparksVeranstaltungsorteDialog
        open={skateparksVeranstaltungsorteDialog !== null}
        onClose={() => setSkateparksVeranstaltungsorteDialog(null)}
        onSubmit={submitSkateparksVeranstaltungsorte}
        defaultValues={skateparksVeranstaltungsorteDialog?.defaults}
        recordId={skateparksVeranstaltungsorteDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['SkateparksVeranstaltungsorte']}
        enablePhotoLocation={AI_PHOTO_LOCATION['SkateparksVeranstaltungsorte']}
      />
      <TeilnehmerAnmeldungDialog
        open={teilnehmerAnmeldungDialog !== null}
        onClose={() => setTeilnehmerAnmeldungDialog(null)}
        onSubmit={submitTeilnehmerAnmeldung}
        defaultValues={teilnehmerAnmeldungDialog?.defaults}
        recordId={teilnehmerAnmeldungDialog?.editing?.record_id}
        eventVerwaltungList={data.eventVerwaltung}
        enablePhotoScan={AI_PHOTO_SCAN['TeilnehmerAnmeldung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['TeilnehmerAnmeldung']}
      />
      <EventVerwaltungDialog
        open={eventVerwaltungDialog !== null}
        onClose={() => setEventVerwaltungDialog(null)}
        onSubmit={submitEventVerwaltung}
        defaultValues={eventVerwaltungDialog?.defaults}
        recordId={eventVerwaltungDialog?.editing?.record_id}
        skateparksVeranstaltungsorteList={data.skateparksVeranstaltungsorte}
        enablePhotoScan={AI_PHOTO_SCAN['EventVerwaltung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['EventVerwaltung']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'skateparksVeranstaltungsorte') {
            return (
              <>
                <RecordHeader title={top.record.fields.location_name ?? appLabel('skateparks_veranstaltungsorte')} subtitle={undefined} />
                <SkateparksVeranstaltungsorteDetails
                  record={top.record}
                  eventVerwaltungList={data.eventVerwaltung}
                  onOpenEventVerwaltung={(r) => detailEventVerwaltung(r, true)}
                  onAddEventVerwaltung={() => setEventVerwaltungDialog({ defaults: { location: createRecordUrl(APP_IDS.SKATEPARKS_VERANSTALTUNGSORTE, top.record.record_id) } })}
                />
              </>
            );
          }
          if (top.type === 'teilnehmerAnmeldung') {
            return (
              <>
                <RecordHeader title={top.record.fields.emergency_contact_email ?? appLabel('teilnehmer_anmeldung')} subtitle={top.record.fields.date_of_birth ? formatDate(top.record.fields.date_of_birth) : undefined} />
                <TeilnehmerAnmeldungDetails
                  record={top.record}
                  eventVerwaltungList={data.eventVerwaltung}
                  onOpenEventVerwaltung={(r) => detailEventVerwaltung(r, true)}
                />
              </>
            );
          }
          if (top.type === 'eventVerwaltung') {
            return (
              <>
                <RecordHeader title={top.record.fields.event_title ?? appLabel('event_verwaltung')} subtitle={top.record.fields.event_datetime ? formatDate(top.record.fields.event_datetime) : undefined} />
                <EventVerwaltungDetails
                  record={top.record}
                  skateparksVeranstaltungsorteList={data.skateparksVeranstaltungsorte}
                  onOpenSkateparksVeranstaltungsorte={(r) => detailSkateparksVeranstaltungsorte(r, true)}
                  teilnehmerAnmeldungList={data.teilnehmerAnmeldung}
                  onOpenTeilnehmerAnmeldung={(r) => detailTeilnehmerAnmeldung(r, true)}
                  onAddTeilnehmerAnmeldung={() => setTeilnehmerAnmeldungDialog({ defaults: { event: createRecordUrl(APP_IDS.EVENT_VERWALTUNG, top.record.record_id) } })}
                />
              </>
            );
          }
          return null;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'skateparksVeranstaltungsorte') setSkateparksVeranstaltungsorteDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'teilnehmerAnmeldung') setTeilnehmerAnmeldungDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'eventVerwaltung') setEventVerwaltungDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    skateparksVeranstaltungsorte: {
      openCreate: (defaults?: SkateparksVeranstaltungsorteDialogDefaults) => setSkateparksVeranstaltungsorteDialog({ defaults }),
      openEdit: (record: SkateparksVeranstaltungsorte) => setSkateparksVeranstaltungsorteDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: SkateparksVeranstaltungsorte) => detailSkateparksVeranstaltungsorte(record, false),
    },
    teilnehmerAnmeldung: {
      openCreate: (defaults?: TeilnehmerAnmeldungDialogDefaults) => setTeilnehmerAnmeldungDialog({ defaults }),
      openEdit: (record: TeilnehmerAnmeldung) => setTeilnehmerAnmeldungDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: TeilnehmerAnmeldung) => detailTeilnehmerAnmeldung(record, false),
    },
    eventVerwaltung: {
      openCreate: (defaults?: EventVerwaltungDialogDefaults) => setEventVerwaltungDialog({ defaults }),
      openEdit: (record: EventVerwaltung) => setEventVerwaltungDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: EventVerwaltung) => detailEventVerwaltung(record, false),
    },
    enriched: { skateparksVeranstaltungsorte: data.skateparksVeranstaltungsorte, teilnehmerAnmeldung: enrichedTeilnehmerAnmeldung, eventVerwaltung: enrichedEventVerwaltung },
  };
}
