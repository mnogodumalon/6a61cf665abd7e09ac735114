import type { EventVerwaltung, SkateparksVeranstaltungsorte, TeilnehmerAnmeldung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface EventVerwaltungDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: EventVerwaltung;
  /** N:1-Ziel „SkateparksVeranstaltungsorte": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  skateparksVeranstaltungsorteList: SkateparksVeranstaltungsorte[];
  /** Klick auf die SkateparksVeranstaltungsorte-Relation → overlay.push auf dessen Detail. */
  onOpenSkateparksVeranstaltungsorte?: (record: SkateparksVeranstaltungsorte) => void;
  /** 1:N „Teilnehmer-Anmeldung": VOLLE Liste — der Block filtert auf diesen Record. */
  teilnehmerAnmeldungList: TeilnehmerAnmeldung[];
  /** Zeilen-Klick → overlay.push auf das TeilnehmerAnmeldung-Detail (nie der Edit-Dialog). */
  onOpenTeilnehmerAnmeldung: (record: TeilnehmerAnmeldung) => void;
  /** Kontextuelles „+": öffnet den TeilnehmerAnmeldung-Dialog mit diesem Record vorgesetzt. */
  onAddTeilnehmerAnmeldung: () => void;
}

export function EventVerwaltungDetails({
  record,
  skateparksVeranstaltungsorteList,
  onOpenSkateparksVeranstaltungsorte,
  teilnehmerAnmeldungList,
  onOpenTeilnehmerAnmeldung,
  onAddTeilnehmerAnmeldung,
}: EventVerwaltungDetailsProps) {
  const locationTarget = skateparksVeranstaltungsorteList.find(r => r.record_id === extractRecordId(record.fields.location));
  return (
    <>
      <RecordSection title="Details" cols={2}>
        <RecordField label="Titel des Events" value={record.fields.event_title} format="text" />
        <RecordField label="Beschreibung" value={record.fields.event_description} format="longtext" className="md:col-span-2" />
        <RecordField label="Kategorie" value={record.fields.event_category} format="pill" />
        <RecordField label="Datum und Uhrzeit" value={record.fields.event_datetime} format="datetime" />
        <RecordField label="Schwierigkeitsgrad" value={record.fields.skill_level} format="pill" />
        <RecordField label="Maximale Teilnehmerzahl" value={record.fields.max_participants} format="text" />
        <RecordField label="Startgebühr (in €)" value={record.fields.entry_fee} format="text" />
        <RecordField label="Vorname des Organisators" value={record.fields.organizer_firstname} format="text" />
        <RecordField label="Nachname des Organisators" value={record.fields.organizer_lastname} format="text" />
        <RecordField label="E-Mail des Organisators" value={record.fields.organizer_email} format="email" />
        <RecordField label="Telefonnummer des Organisators" value={record.fields.organizer_phone} format="text" />
        <RecordField label="Event-Flyer" className="md:col-span-2">
          {record.fields.event_flyer ? (
            <MediaThumbnail src={record.fields.event_flyer as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
        <RecordField label="Notizen" value={record.fields.organizer_notes} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title="Verknüpft" cols={1}>
        <RecordRelation
          label="Veranstaltungsort"
          name={locationTarget?.fields.location_name ?? '—'}
          meta={[locationTarget?.fields.street, locationTarget?.fields.house_number].filter(Boolean).join(' · ') || undefined}
          onClick={locationTarget && onOpenSkateparksVeranstaltungsorte ? () => onOpenSkateparksVeranstaltungsorte!(locationTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title="Teilnehmer-Anmeldung"
        items={teilnehmerAnmeldungList.filter(r => extractRecordId(r.fields.event) === record.record_id)}
        map={r => ({ name: r.fields.emergency_contact_email ?? 'Teilnehmer-Anmeldung', meta: r.fields.date_of_birth })}
        onOpen={onOpenTeilnehmerAnmeldung}
        onAdd={onAddTeilnehmerAnmeldung}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.EVENT_VERWALTUNG} recordId={record.record_id} />
    </>
  );
}
