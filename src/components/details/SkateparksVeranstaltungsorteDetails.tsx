import type { SkateparksVeranstaltungsorte, EventVerwaltung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface SkateparksVeranstaltungsorteDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: SkateparksVeranstaltungsorte;
  /** 1:N „Event-Verwaltung": VOLLE Liste — der Block filtert auf diesen Record. */
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
      <RecordSection title="Details" cols={2}>
        <RecordField label="Name des Veranstaltungsorts" value={record.fields.location_name} format="text" />
        <RecordField label="Straße" value={record.fields.street} format="text" />
        <RecordField label="Hausnummer" value={record.fields.house_number} format="text" />
        <RecordField label="Postleitzahl" value={record.fields.postal_code} format="text" />
        <RecordField label="Stadt" value={record.fields.city} format="text" />
        <RecordField label="Beschreibung" value={record.fields.description} format="longtext" className="md:col-span-2" />
        <RecordField label="Besondere Hinweise" value={record.fields.special_notes} format="longtext" className="md:col-span-2" />
        <RecordField label="Foto des Veranstaltungsorts" className="md:col-span-2">
          {record.fields.location_photo ? (
            <MediaThumbnail src={record.fields.location_photo as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
      </RecordSection>

      <SatelliteSection
        title="Event-Verwaltung"
        items={eventVerwaltungList.filter(r => extractRecordId(r.fields.location) === record.record_id)}
        map={r => ({ name: r.fields.event_title ?? 'Event-Verwaltung', meta: r.fields.event_datetime })}
        onOpen={onOpenEventVerwaltung}
        onAdd={onAddEventVerwaltung}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.SKATEPARKS_VERANSTALTUNGSORTE} recordId={record.record_id} />
    </>
  );
}
