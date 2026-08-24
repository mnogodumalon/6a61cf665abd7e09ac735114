import type { SkateparksVeranstaltungsorte, EventVerwaltung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface SkateparksVeranstaltungsorteDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: SkateparksVeranstaltungsorte;
  /** 1:N „Event-Verwaltung" (location): VOLLE Liste — der Block filtert auf diesen Record. */
  eventVerwaltungList: EventVerwaltung[];
  /** Zeilen-Klick → overlay.push auf das EventVerwaltung-Detail (nie der Edit-Dialog). */
  onOpenEventVerwaltung: (record: EventVerwaltung) => void;
  /** Kontextuelles „+": öffnet den EventVerwaltung-Dialog mit diesem Record vorgesetzt. */
  onAddEventVerwaltung: () => void;
}

export function SkateparksVeranstaltungsorteDetails({
  record,
  eventVerwaltungList,
  onOpenEventVerwaltung,
  onAddEventVerwaltung,
}: SkateparksVeranstaltungsorteDetailsProps) {
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('skateparks_veranstaltungsorte', 'location_name')} value={record.fields.location_name} format="text" />
        <RecordField label={fieldLabel('skateparks_veranstaltungsorte', 'street')} value={record.fields.street} format="text" />
        <RecordField label={fieldLabel('skateparks_veranstaltungsorte', 'house_number')} value={record.fields.house_number} format="text" />
        <RecordField label={fieldLabel('skateparks_veranstaltungsorte', 'postal_code')} value={record.fields.postal_code} format="text" />
        <RecordField label={fieldLabel('skateparks_veranstaltungsorte', 'city')} value={record.fields.city} format="text" />
        <RecordField label={fieldLabel('skateparks_veranstaltungsorte', 'description')} value={record.fields.description} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('skateparks_veranstaltungsorte', 'special_notes')} value={record.fields.special_notes} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('skateparks_veranstaltungsorte', 'location_photo')} className="md:col-span-2">
          {record.fields.location_photo ? (
            <MediaThumbnail src={record.fields.location_photo as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
      </RecordSection>

      <SatelliteSection
        title={appLabel('event_verwaltung')}
        items={eventVerwaltungList.filter(r => extractRecordId(r.fields.location) === record.record_id)}
        map={r => ({ name: r.fields.event_title ?? appLabel('event_verwaltung'), meta: undefined })}
        onOpen={onOpenEventVerwaltung}
        onAdd={onAddEventVerwaltung}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.SKATEPARKS_VERANSTALTUNGSORTE} recordId={record.record_id} />
    </>
  );
}
