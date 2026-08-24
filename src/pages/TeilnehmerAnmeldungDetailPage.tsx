import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { TeilnehmerAnmeldung, EventVerwaltung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { TeilnehmerAnmeldungDialog } from '@/components/dialogs/TeilnehmerAnmeldungDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/TeilnehmerAnmeldung';
import { evalComputed } from '@/config/form-enhancements/types';
import { t, appLabel, fieldLabel, localeTag, CURRENCY } from '@/i18n';

export default function TeilnehmerAnmeldungDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<TeilnehmerAnmeldung | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [eventVerwaltungList, setEventVerwaltungList] = useState<EventVerwaltung[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, eventVerwaltungData] = await Promise.all([
        LivingAppsService.getTeilnehmerAnmeldung(),
        LivingAppsService.getEventVerwaltung(),
      ]);
      setEventVerwaltungList(eventVerwaltungData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: TeilnehmerAnmeldung['fields']) {
    if (!record) return;
    await LivingAppsService.updateTeilnehmerAnmeldungEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteTeilnehmerAnmeldungEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/teilnehmer-anmeldung');
  }

  function getEventVerwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return eventVerwaltungList.find(r => r.record_id === refId)?.fields.event_title ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title={t('not_found')}
        action={
          <Button variant="ghost" onClick={() => navigate('/teilnehmer-anmeldung')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            {t('back')}
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/teilnehmer-anmeldung')}
      onEdit={() => setEditing(true)}
      backLabel={t('back')}
      editLabel={t('edit_button')}
    >
      <RecordHeader title={record.fields.emergency_contact_email ?? appLabel('teilnehmer_anmeldung')} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          event: eventVerwaltungList,
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
        <RecordField label={fieldLabel('teilnehmer_anmeldung', 'emergency_contact_email')} value={record.fields.emergency_contact_email} format="email" />
        <RecordField label={fieldLabel('teilnehmer_anmeldung', 'event')} value={getEventVerwaltungDisplayName(record.fields.event)} format="text" />
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

      <RecordAttachments appId={APP_IDS.TEILNEHMER_ANMELDUNG} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          {t('delete')}
        </Button>
      </div>

      <TeilnehmerAnmeldungDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        eventVerwaltungList={eventVerwaltungList}
        enablePhotoScan={AI_PHOTO_SCAN['TeilnehmerAnmeldung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['TeilnehmerAnmeldung']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t('delete_entity', { entity: appLabel('teilnehmer_anmeldung') })}
        description={t('confirm_delete_desc')}
      />
    </RecordView>
  );
}
