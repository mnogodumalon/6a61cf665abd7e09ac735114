import type { EventVerwaltung, SkateparksVeranstaltungsorte, TeilnehmerAnmeldung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface EventVerwaltungDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: EventVerwaltung;
  /** N:1-Ziel „SkateparksVeranstaltungsorte": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  skateparksVeranstaltungsorteList: SkateparksVeranstaltungsorte[];
  /** Klick auf die SkateparksVeranstaltungsorte-Relation → overlay.push auf dessen Detail. */
  onOpenSkateparksVeranstaltungsorte?: (record: SkateparksVeranstaltungsorte) => void;
  /** 1:N „Teilnehmer-Anmeldung" (event): VOLLE Liste — der Block filtert auf diesen Record. */
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
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('event_verwaltung', 'organizer_notes')} value={record.fields.organizer_notes} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('event_verwaltung', 'event_title')} value={record.fields.event_title} format="text" />
        <RecordField label={fieldLabel('event_verwaltung', 'event_description')} value={record.fields.event_description} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('event_verwaltung', 'event_category')} value={record.fields.event_category} format="pill" />
        <RecordField label={fieldLabel('event_verwaltung', 'event_datetime')} value={record.fields.event_datetime} format="datetime" />
        <RecordField label={fieldLabel('event_verwaltung', 'skill_level')} value={record.fields.skill_level} format="pill" />
        <RecordField label={fieldLabel('event_verwaltung', 'max_participants')} value={record.fields.max_participants} format="text" />
        <RecordField label={fieldLabel('event_verwaltung', 'entry_fee')} value={record.fields.entry_fee} format="text" />
        <RecordField label={fieldLabel('event_verwaltung', 'organizer_firstname')} value={record.fields.organizer_firstname} format="text" />
        <RecordField label={fieldLabel('event_verwaltung', 'organizer_lastname')} value={record.fields.organizer_lastname} format="text" />
        <RecordField label={fieldLabel('event_verwaltung', 'organizer_email')} value={record.fields.organizer_email} format="email" />
        <RecordField label={fieldLabel('event_verwaltung', 'organizer_phone')} value={record.fields.organizer_phone} format="text" />
        <RecordField label={fieldLabel('event_verwaltung', 'event_flyer')} className="md:col-span-2">
          {record.fields.event_flyer ? (
            <MediaThumbnail src={record.fields.event_flyer as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('event_verwaltung', 'location')}
          name={locationTarget?.fields.location_name ?? '—'}
          meta={[locationTarget?.fields.street, locationTarget?.fields.house_number].filter(Boolean).join(' · ') || undefined}
          onClick={locationTarget && onOpenSkateparksVeranstaltungsorte ? () => onOpenSkateparksVeranstaltungsorte!(locationTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('teilnehmer_anmeldung')}
        items={teilnehmerAnmeldungList.filter(r => extractRecordId(r.fields.event) === record.record_id)}
        map={r => ({ name: r.fields.emergency_contact_email ?? appLabel('teilnehmer_anmeldung'), meta: r.fields.date_of_birth })}
        onOpen={onOpenTeilnehmerAnmeldung}
        onAdd={onAddTeilnehmerAnmeldung}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.EVENT_VERWALTUNG} recordId={record.record_id} />
    </>
  );
}
