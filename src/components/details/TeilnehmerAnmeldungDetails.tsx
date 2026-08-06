import type { TeilnehmerAnmeldung, EventVerwaltung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';

export interface TeilnehmerAnmeldungDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: TeilnehmerAnmeldung;
  /** N:1-Ziel „EventVerwaltung": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  eventVerwaltungList: EventVerwaltung[];
  /** Klick auf die EventVerwaltung-Relation → overlay.push auf dessen Detail. */
  onOpenEventVerwaltung?: (record: EventVerwaltung) => void;
}

export function TeilnehmerAnmeldungDetails({
  record,
  eventVerwaltungList,
  onOpenEventVerwaltung,
}: TeilnehmerAnmeldungDetailsProps) {
  const eventTarget = eventVerwaltungList.find(r => r.record_id === extractRecordId(record.fields.event));
  return (
    <>
      <RecordSection title="Details" cols={2}>
        <RecordField label="E-Mail-Adresse des Notfallkontakts" value={record.fields.emergency_contact_email} format="email" />
        <RecordField label="Vorname" value={record.fields.participant_firstname} format="text" />
        <RecordField label="Nachname" value={record.fields.participant_lastname} format="text" />
        <RecordField label="E-Mail-Adresse" value={record.fields.participant_email} format="email" />
        <RecordField label="Telefonnummer" value={record.fields.participant_phone} format="text" />
        <RecordField label="Geburtsdatum" value={record.fields.date_of_birth} format="date" />
        <RecordField label="Eigener Schwierigkeitsgrad" value={record.fields.participant_skill_level} format="pill" />
        <RecordField label="Name des Notfallkontakts" value={record.fields.emergency_contact_name} format="text" />
        <RecordField label="Telefonnummer des Notfallkontakts" value={record.fields.emergency_contact_phone} format="text" />
        <RecordField label="T-Shirt-Größe" value={record.fields.tshirt_size} format="pill" />
        <RecordField label="Ich akzeptiere die Teilnahmebedingungen" value={record.fields.waiver_accepted} format="bool" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title="Verknüpft" cols={1}>
        <RecordRelation
          label="Event"
          name={eventTarget?.fields.event_title ?? '—'}
          meta={[eventTarget?.fields.organizer_email, eventTarget?.fields.organizer_phone].filter(Boolean).join(' · ') || undefined}
          onClick={eventTarget && onOpenEventVerwaltung ? () => onOpenEventVerwaltung!(eventTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.TEILNEHMER_ANMELDUNG} recordId={record.record_id} />
    </>
  );
}
