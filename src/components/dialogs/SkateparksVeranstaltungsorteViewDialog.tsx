import type { SkateparksVeranstaltungsorte } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { IconPencil, IconFileText } from '@tabler/icons-react';

interface SkateparksVeranstaltungsorteViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: SkateparksVeranstaltungsorte | null;
  onEdit: (record: SkateparksVeranstaltungsorte) => void;
}

export function SkateparksVeranstaltungsorteViewDialog({ open, onClose, record, onEdit }: SkateparksVeranstaltungsorteViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Skateparks & Veranstaltungsorte anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Name des Veranstaltungsorts</Label>
            <p className="text-sm">{record.fields.location_name ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Straße</Label>
            <p className="text-sm">{record.fields.street ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hausnummer</Label>
            <p className="text-sm">{record.fields.house_number ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Postleitzahl</Label>
            <p className="text-sm">{record.fields.postal_code ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Stadt</Label>
            <p className="text-sm">{record.fields.city ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.description ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Besondere Hinweise</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.special_notes ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Foto des Veranstaltungsorts</Label>
            {record.fields.location_photo ? (
              <MediaThumbnail src={record.fields.location_photo} fit="contain" className="w-full rounded-lg border" />
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.SKATEPARKS_VERANSTALTUNGSORTE} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}