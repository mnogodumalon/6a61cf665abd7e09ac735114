import type { TeilnehmerAnmeldung, EventVerwaltung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface TeilnehmerAnmeldungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: TeilnehmerAnmeldung | null;
  onEdit: (record: TeilnehmerAnmeldung) => void;
  eventVerwaltungList: EventVerwaltung[];
}

export function TeilnehmerAnmeldungViewDialog({ open, onClose, record, onEdit, eventVerwaltungList }: TeilnehmerAnmeldungViewDialogProps) {
  function getEventVerwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return eventVerwaltungList.find(r => r.record_id === id)?.fields.event_title ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Teilnehmer-Anmeldung anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Event</Label>
            <p className="text-sm">{getEventVerwaltungDisplayName(record.fields.event)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname</Label>
            <p className="text-sm">{record.fields.participant_firstname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname</Label>
            <p className="text-sm">{record.fields.participant_lastname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">E-Mail-Adresse</Label>
            <p className="text-sm">{record.fields.participant_email ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Telefonnummer</Label>
            <p className="text-sm">{record.fields.participant_phone ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Geburtsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.date_of_birth)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Eigener Schwierigkeitsgrad</Label>
            <Badge variant="secondary">{record.fields.participant_skill_level?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Name des Notfallkontakts</Label>
            <p className="text-sm">{record.fields.emergency_contact_name ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Telefonnummer des Notfallkontakts</Label>
            <p className="text-sm">{record.fields.emergency_contact_phone ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">T-Shirt-Größe</Label>
            <Badge variant="secondary">{record.fields.tshirt_size?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ich akzeptiere die Teilnahmebedingungen</Label>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              record.fields.waiver_accepted ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {record.fields.waiver_accepted ? 'Ja' : 'Nein'}
            </span>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.TEILNEHMER_ANMELDUNG} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}