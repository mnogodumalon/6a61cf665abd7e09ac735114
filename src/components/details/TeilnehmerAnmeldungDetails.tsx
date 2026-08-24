import type { TeilnehmerAnmeldung, EventVerwaltung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';

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
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('teilnehmer_anmeldung', 'emergency_contact_email')} value={record.fields.emergency_contact_email} format="email" />
        <RecordField label={fieldLabel('teilnehmer_anmeldung', 'participant_firstname')} value={record.fields.participant_firstname} format="text" />
        <RecordField label={fieldLabel('teilnehmer_anmeldung', 'participant_lastname')} value={record.fields.participant_lastname} format="text" />
        <RecordField label={fieldLabel('teilnehmer_anmeldung', 'participant_email')} value={record.fields.participant_email} format="email" />
        <RecordField label={fieldLabel('teilnehmer_anmeldung', 'participant_phone')} value={record.fields.participant_phone} format="text" />
        <RecordField label={fieldLabel('teilnehmer_anmeldung', 'date_of_birth')} value={record.fields.date_of_birth} format="date" />
        <RecordField label={fieldLabel('teilnehmer_anmeldung', 'participant_skill_level')} value={record.fields.participant_skill_level} format="pill" />
        <RecordField label={fieldLabel('teilnehmer_anmeldung', 'emergency_contact_name')} value={record.fields.emergency_contact_name} format="text" />
        <RecordField label={fieldLabel('teilnehmer_anmeldung', 'emergency_contact_phone')} value={record.fields.emergency_contact_phone} format="text" />
        <RecordField label={fieldLabel('teilnehmer_anmeldung', 'tshirt_size')} value={record.fields.tshirt_size} format="pill" />
        <RecordField label={fieldLabel('teilnehmer_anmeldung', 'waiver_accepted')} value={record.fields.waiver_accepted} format="bool" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('teilnehmer_anmeldung', 'event')}
          name={eventTarget?.fields.event_title ?? '—'}
          meta={[eventTarget?.fields.organizer_email, eventTarget?.fields.organizer_phone].filter(Boolean).join(' · ') || undefined}
          onClick={eventTarget && onOpenEventVerwaltung ? () => onOpenEventVerwaltung!(eventTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.TEILNEHMER_ANMELDUNG} recordId={record.record_id} />
    </>
  );
}
