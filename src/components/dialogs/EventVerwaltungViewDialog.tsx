import type { EventVerwaltung, SkateparksVeranstaltungsorte } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';
import { t, appLabel, fieldLabel, lookupLabel, dateFnsLocale, dateFormat } from '@/i18n';
import { format, parseISO } from 'date-fns';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), dateFormat(), { locale: dateFnsLocale() }); } catch { return d; }
}

interface EventVerwaltungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: EventVerwaltung | null;
  onEdit: (record: EventVerwaltung) => void;
  skateparksVeranstaltungsorteList: SkateparksVeranstaltungsorte[];
}

export function EventVerwaltungViewDialog({ open, onClose, record, onEdit, skateparksVeranstaltungsorteList }: EventVerwaltungViewDialogProps) {
  function getSkateparksVeranstaltungsorteDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return skateparksVeranstaltungsorteList.find(r => r.record_id === id)?.fields.location_name ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('view_entity', { entity: appLabel('event_verwaltung') })}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            {t('edit_button')}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('event_verwaltung', 'organizer_notes')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.organizer_notes ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('event_verwaltung', 'event_title')}</Label>
            <p className="text-sm">{record.fields.event_title ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('event_verwaltung', 'event_description')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.event_description ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('event_verwaltung', 'event_category')}</Label>
            <Badge variant="secondary">{lookupLabel('event_verwaltung', 'event_category', record.fields.event_category?.key) ?? record.fields.event_category?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('event_verwaltung', 'event_datetime')}</Label>
            <p className="text-sm">{formatDate(record.fields.event_datetime)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('event_verwaltung', 'skill_level')}</Label>
            <Badge variant="secondary">{lookupLabel('event_verwaltung', 'skill_level', record.fields.skill_level?.key) ?? record.fields.skill_level?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('event_verwaltung', 'max_participants')}</Label>
            <p className="text-sm">{record.fields.max_participants ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('event_verwaltung', 'entry_fee')}</Label>
            <p className="text-sm">{record.fields.entry_fee ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('event_verwaltung', 'location')}</Label>
            <p className="text-sm">{getSkateparksVeranstaltungsorteDisplayName(record.fields.location)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('event_verwaltung', 'organizer_firstname')}</Label>
            <p className="text-sm">{record.fields.organizer_firstname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('event_verwaltung', 'organizer_lastname')}</Label>
            <p className="text-sm">{record.fields.organizer_lastname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('event_verwaltung', 'organizer_email')}</Label>
            <p className="text-sm">{record.fields.organizer_email ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('event_verwaltung', 'organizer_phone')}</Label>
            <p className="text-sm">{record.fields.organizer_phone ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('event_verwaltung', 'event_flyer')}</Label>
            {record.fields.event_flyer ? (
              <MediaThumbnail src={record.fields.event_flyer} fit="contain" className="w-full rounded-lg border" />
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.EVENT_VERWALTUNG} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}