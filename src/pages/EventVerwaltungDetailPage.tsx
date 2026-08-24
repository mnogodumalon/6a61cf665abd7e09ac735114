import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { EventVerwaltung, SkateparksVeranstaltungsorte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { EventVerwaltungDialog } from '@/components/dialogs/EventVerwaltungDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/EventVerwaltung';
import { evalComputed } from '@/config/form-enhancements/types';
import { t, appLabel, fieldLabel, localeTag, CURRENCY } from '@/i18n';

export default function EventVerwaltungDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<EventVerwaltung | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [skateparksVeranstaltungsorteList, setSkateparksVeranstaltungsorteList] = useState<SkateparksVeranstaltungsorte[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, skateparksVeranstaltungsorteData] = await Promise.all([
        LivingAppsService.getEventVerwaltung(),
        LivingAppsService.getSkateparksVeranstaltungsorte(),
      ]);
      setSkateparksVeranstaltungsorteList(skateparksVeranstaltungsorteData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: EventVerwaltung['fields']) {
    if (!record) return;
    await LivingAppsService.updateEventVerwaltungEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteEventVerwaltungEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/event-verwaltung');
  }

  function getSkateparksVeranstaltungsorteDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return skateparksVeranstaltungsorteList.find(r => r.record_id === refId)?.fields.location_name ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title={t('not_found')}
        action={
          <Button variant="ghost" onClick={() => navigate('/event-verwaltung')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            {t('back')}
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/event-verwaltung')}
      onEdit={() => setEditing(true)}
      backLabel={t('back')}
      editLabel={t('edit_button')}
    >
      <RecordHeader title={record.fields.event_title ?? appLabel('event_verwaltung')} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          location: skateparksVeranstaltungsorteList,
        };
        const fmtComputed = (k: string, n: number) =>
          /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k)
            ? n.toLocaleString(localeTag(), { style: 'currency', currency: CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : n.toLocaleString(localeTag(), { maximumFractionDigits: 2 });
        const computedFacts = Object.entries(formEnhancements.computed)
          .map(([key, formula]) => {
            const v = evalComputed(formula, record!.fields as Record<string, unknown>, { lookupLists });
            return v != null
              ? { label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), value: fmtComputed(key, v) }
              : null;
          })
          .filter((f): f is { label: string; value: string } => f !== null);
        return computedFacts.length > 0 ? <RecordKeyFacts items={computedFacts} /> : null;
      })()}

      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('event_verwaltung', 'event_title')} value={record.fields.event_title} format="text" />
        <RecordField label={fieldLabel('event_verwaltung', 'event_description')} value={record.fields.event_description} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('event_verwaltung', 'event_category')} value={record.fields.event_category} format="pill" />
        <RecordField label={fieldLabel('event_verwaltung', 'event_datetime')} value={record.fields.event_datetime} format="text" />
        <RecordField label={fieldLabel('event_verwaltung', 'skill_level')} value={record.fields.skill_level} format="pill" />
        <RecordField label={fieldLabel('event_verwaltung', 'max_participants')} value={record.fields.max_participants} format="text" />
        <RecordField label={fieldLabel('event_verwaltung', 'entry_fee')} value={record.fields.entry_fee} format="text" />
        <RecordField label={fieldLabel('event_verwaltung', 'location')} value={getSkateparksVeranstaltungsorteDisplayName(record.fields.location)} format="text" />
        <RecordField label={fieldLabel('event_verwaltung', 'organizer_firstname')} value={record.fields.organizer_firstname} format="text" />
        <RecordField label={fieldLabel('event_verwaltung', 'organizer_lastname')} value={record.fields.organizer_lastname} format="text" />
        <RecordField label={fieldLabel('event_verwaltung', 'organizer_email')} value={record.fields.organizer_email} format="email" />
        <RecordField label={fieldLabel('event_verwaltung', 'organizer_phone')} value={record.fields.organizer_phone} format="text" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.EVENT_VERWALTUNG} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          {t('delete')}
        </Button>
      </div>

      <EventVerwaltungDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        skateparksVeranstaltungsorteList={skateparksVeranstaltungsorteList}
        enablePhotoScan={AI_PHOTO_SCAN['EventVerwaltung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['EventVerwaltung']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t('delete_entity', { entity: appLabel('event_verwaltung') })}
        description={t('confirm_delete_desc')}
      />
    </RecordView>
  );
}
