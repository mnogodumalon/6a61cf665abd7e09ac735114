import { useMemo, useState } from 'react';
import { de } from 'date-fns/locale';
import { format, parseISO, isAfter, isBefore, startOfDay, addDays } from 'date-fns';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichEventVerwaltung, enrichTeilnehmerAnmeldung } from '@/lib/enrich';
import type { EnrichedEventVerwaltung } from '@/types/enriched';
import type { EventVerwaltung, TeilnehmerAnmeldung, SkateparksVeranstaltungsorte } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDateTime, formatDate } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconCalendarEvent, IconUsers, IconMapPin, IconPlus,
  IconTrophy,
} from '@tabler/icons-react';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import {
  CalendarWidget, CalendarSkeleton, CalendarError,
  type CalendarEvent, type CalendarTone,
} from '@/components/widgets/CalendarWidget';
import {
  RecordOverlay, RecordHeader, useRecordOverlayStack,
} from '@/components/widgets/RecordView';
import { EventVerwaltungDetails } from '@/components/details/EventVerwaltungDetails';
import { TeilnehmerAnmeldungDetails } from '@/components/details/TeilnehmerAnmeldungDetails';
import { SkateparksVeranstaltungsorteDetails } from '@/components/details/SkateparksVeranstaltungsorteDetails';
import { EventVerwaltungDialog } from '@/components/dialogs/EventVerwaltungDialog';
import { TeilnehmerAnmeldungDialog } from '@/components/dialogs/TeilnehmerAnmeldungDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';

const APPGROUP_ID = '6a61cf665abd7e09ac735114';
const REPAIR_ENDPOINT = '/claude/build/repair';

type OverlayItem =
  | { type: 'event'; record: EventVerwaltung }
  | { type: 'teilnehmer'; record: TeilnehmerAnmeldung }
  | { type: 'ort'; record: SkateparksVeranstaltungsorte };

function toneForEvent(ev: EnrichedEventVerwaltung, now: Date): CalendarTone {
  if (!ev.fields.event_datetime) return 'warning';
  const dt = parseISO(ev.fields.event_datetime);
  if (isBefore(dt, now)) return 'default';
  const in7 = addDays(now, 7);
  if (isBefore(dt, in7)) return 'primary';
  return 'success';
}

export default function DashboardOverview() {
  const {
    skateparksVeranstaltungsorte, setSkateparksVeranstaltungsorte,
    eventVerwaltung, setEventVerwaltung,
    teilnehmerAnmeldung, setTeilnehmerAnmeldung,
    skateparksVeranstaltungsorteMap, eventVerwaltungMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const clock = useClock();

  const enrichedEvents = useMemo(
    () => enrichEventVerwaltung(eventVerwaltung, { skateparksVeranstaltungsorteMap }),
    [eventVerwaltung, skateparksVeranstaltungsorteMap],
  );
  const enrichedTeilnehmer = useMemo(
    () => enrichTeilnehmerAnmeldung(teilnehmerAnmeldung, { eventVerwaltungMap }),
    [teilnehmerAnmeldung, eventVerwaltungMap],
  );

  const overlay = useRecordOverlayStack<OverlayItem>();

  // Dialog state
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<EventVerwaltung | null>(null);
  const [eventDefaults, setEventDefaults] = useState<Partial<EventVerwaltung['fields']>>({});

  const [teilnehmerDialogOpen, setTeilnehmerDialogOpen] = useState(false);
  const [editTeilnehmer, setEditTeilnehmer] = useState<TeilnehmerAnmeldung | null>(null);
  const [teilnehmerDefaults, setTeilnehmerDefaults] = useState<Partial<TeilnehmerAnmeldung['fields']>>({});

  // --- KPIs ---
  const today = startOfDay(clock);
  const upcomingEvents = useMemo(
    () => enrichedEvents.filter(e => e.fields.event_datetime && isAfter(parseISO(e.fields.event_datetime), today)),
    [enrichedEvents, today],
  );
  const nextEvent = upcomingEvents.sort((a, b) =>
    (a.fields.event_datetime ?? '').localeCompare(b.fields.event_datetime ?? ''),
  )[0];

  const totalAnmeldungen = teilnehmerAnmeldung.length;
  const orteCount = skateparksVeranstaltungsorte.length;

  // Context line
  const nextEventNames = upcomingEvents.slice(0, 2).map(e => e.fields.event_title ?? 'Event').filter(Boolean);
  const contextLine = upcomingEvents.length > 0
    ? `${gruss(clock)} Nächste Events: ${namen(nextEventNames)} — ${upcomingEvents.length} bevorstehend.`
    : `${gruss(clock)} Noch keine bevorstehenden Events geplant. Leg gleich los!`;

  // --- Calendar events ---
  const calendarEvents = useMemo<CalendarEvent[]>(
    () =>
      enrichedEvents
        .filter(e => !!e.fields.event_datetime)
        .map(e => ({
          id: `event:${e.record_id}`,
          start: e.fields.event_datetime!,
          title: e.fields.event_title ?? 'Ohne Titel',
          subtitle: e.locationName || e.fields.event_category?.label,
          tone: toneForEvent(e, clock),
        })),
    [enrichedEvents, clock],
  );

  // --- Reschedule (drag) ---
  const rescheduleEvent = async (eventId: string, newStart: string) => {
    const rid = eventId.split(':')[1];
    if (!rid) return;
    const prev = eventVerwaltung.find(e => e.record_id === rid);
    if (!prev) return;
    setEventVerwaltung(list =>
      list.map(e => e.record_id === rid ? { ...e, fields: { ...e.fields, event_datetime: newStart } } : e),
    );
    try {
      await LivingAppsService.updateEventVerwaltungEntry(rid, { event_datetime: newStart });
      undoToast('Event verschoben', () => {
        setEventVerwaltung(list =>
          list.map(e => e.record_id === rid ? { ...e, fields: { ...e.fields, event_datetime: prev.fields.event_datetime } } : e),
        );
        void LivingAppsService.updateEventVerwaltungEntry(rid, { event_datetime: prev.fields.event_datetime });
      });
    } catch {
      await fetchAll();
    }
  };

  // --- WorkList: nächste Anmeldungen ---
  const recentTeilnehmer = useMemo(
    () =>
      enrichedTeilnehmer
        .filter(t => !!t.fields.event)
        .sort((a, b) => (b.createdat ?? '').localeCompare(a.createdat ?? ''))
        .slice(0, 8),
    [enrichedTeilnehmer],
  );

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const top = overlay.top;

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">Skateboard Event Verwaltung</h1>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{contextLine}</p>
        </div>
        <Button
          size="sm"
          className="shrink-0"
          onClick={() => { setEditEvent(null); setEventDefaults({}); setEventDialogOpen(true); }}
        >
          <IconPlus size={16} className="mr-1 shrink-0" />
          Neues Event
        </Button>
      </div>

      <DashboardGrid
        variant="wide"
        kpis={
          <StatStrip>
            <StatStripItem
              title="Bevorstehende Events"
              value={upcomingEvents.length}
              icon={<IconCalendarEvent size={16} className="shrink-0" />}
              tone={upcomingEvents.length === 0 ? 'default' : 'primary'}
            />
            <StatStripItem
              title="Anmeldungen gesamt"
              value={totalAnmeldungen}
              icon={<IconUsers size={16} className="shrink-0" />}
              tone="default"
            />
            <StatStripItem
              title="Veranstaltungsorte"
              value={orteCount}
              icon={<IconMapPin size={16} className="shrink-0" />}
              tone="default"
            />
            {nextEvent && (
              <StatStripItem
                title="Nächstes Event"
                value={nextEvent.fields.event_title ?? '—'}
                icon={<IconTrophy size={16} className="shrink-0" />}
                tone="success"
              />
            )}
          </StatStrip>
        }
        primary={
          <CalendarWidget
            events={calendarEvents}
            locale={de}
            defaultView="month"
            onEventClick={ev => {
              const rid = ev.id.split(':')[1];
              const rec = eventVerwaltung.find(e => e.record_id === rid);
              if (rec) overlay.replace({ type: 'event', record: rec });
            }}
            onEventDrop={rescheduleEvent}
            onEmptyClick={date => {
              setEditEvent(null);
              setEventDefaults({ event_datetime: format(date, "yyyy-MM-dd'T'HH:mm") });
              setEventDialogOpen(true);
            }}
          />
        }
        aside={
          <>
            <WorkList
              title="Neue Anmeldungen"
              icon={<IconUsers size={16} className="shrink-0" />}
              items={recentTeilnehmer.map(t => ({
                id: t.record_id,
                title: `${t.fields.participant_firstname ?? ''} ${t.fields.participant_lastname ?? ''}`.trim() || 'Teilnehmer',
                secondLine: (
                  <>
                    <span className="text-muted-foreground">{t.eventName || 'Kein Event'}</span>
                    {t.fields.participant_skill_level?.label && (
                      <span className="text-muted-foreground"> · {t.fields.participant_skill_level.label}</span>
                    )}
                  </>
                ),
              }))}
              onItemClick={id => {
                const rec = teilnehmerAnmeldung.find(t => t.record_id === id);
                if (rec) overlay.replace({ type: 'teilnehmer', record: rec });
              }}
              empty={{
                text: 'Noch keine Anmeldungen vorhanden.',
                action: {
                  label: 'Anmeldung hinzufügen',
                  onClick: () => { setEditTeilnehmer(null); setTeilnehmerDefaults({}); setTeilnehmerDialogOpen(true); },
                },
              }}
            />
            <WorkList
              title="Veranstaltungsorte"
              icon={<IconMapPin size={16} className="shrink-0" />}
              items={skateparksVeranstaltungsorte.slice(0, 6).map(o => ({
                id: o.record_id,
                title: o.fields.location_name ?? 'Ort',
                secondLine: (
                  <span className="text-muted-foreground">
                    {[o.fields.street, o.fields.house_number].filter(Boolean).join(' ')}{o.fields.city ? `, ${o.fields.city}` : ''}
                  </span>
                ),
              }))}
              onItemClick={id => {
                const rec = skateparksVeranstaltungsorte.find(o => o.record_id === id);
                if (rec) overlay.replace({ type: 'ort', record: rec });
              }}
              empty={{
                text: 'Noch keine Veranstaltungsorte angelegt.',
                action: { label: 'Ort anlegen', onClick: () => {} },
              }}
            />
          </>
        }
      />

      {/* --- RecordOverlayHost (single shell) --- */}
      <RecordOverlay
        open={overlay.open}
        onClose={overlay.close}
        onBack={overlay.canGoBack ? overlay.pop : undefined}
        onEdit={
          top?.type === 'event' ? () => { setEditEvent(top.record); setEventDialogOpen(true); }
          : top?.type === 'teilnehmer' ? () => { setEditTeilnehmer(top.record); setTeilnehmerDialogOpen(true); }
          : undefined
        }
        ariaLabel="Detail"
      >
        {top?.type === 'event' && (() => {
          const rec = top.record;
          return (
            <>
              <RecordHeader
                title={rec.fields.event_title ?? 'Ohne Titel'}
                subtitle={rec.fields.event_category?.label}
                meta={rec.fields.event_datetime ? formatDateTime(rec.fields.event_datetime) : undefined}
              />
              <EventVerwaltungDetails
                record={rec}
                skateparksVeranstaltungsorteList={skateparksVeranstaltungsorte}
                onOpenSkateparksVeranstaltungsorte={r => overlay.push({ type: 'ort', record: r })}
                teilnehmerAnmeldungList={teilnehmerAnmeldung}
                onOpenTeilnehmerAnmeldung={r => overlay.push({ type: 'teilnehmer', record: r })}
                onAddTeilnehmerAnmeldung={() => {
                  setEditTeilnehmer(null);
                  setTeilnehmerDefaults({ event: createRecordUrl(APP_IDS.EVENT_VERWALTUNG, rec.record_id) });
                  setTeilnehmerDialogOpen(true);
                }}
              />
            </>
          );
        })()}
        {top?.type === 'teilnehmer' && (() => {
          const rec = top.record;
          const eventRec = eventVerwaltung.find(e => e.record_id === extractRecordId(rec.fields.event));
          return (
            <>
              <RecordHeader
                title={`${rec.fields.participant_firstname ?? ''} ${rec.fields.participant_lastname ?? ''}`.trim() || 'Teilnehmer'}
                subtitle={eventRec?.fields.event_title}
                meta={rec.fields.participant_skill_level?.label}
              />
              <TeilnehmerAnmeldungDetails
                record={rec}
                eventVerwaltungList={eventVerwaltung}
                onOpenEventVerwaltung={r => overlay.push({ type: 'event', record: r })}
              />
            </>
          );
        })()}
        {top?.type === 'ort' && (() => {
          const rec = top.record;
          return (
            <>
              <RecordHeader
                title={rec.fields.location_name ?? 'Veranstaltungsort'}
                subtitle={[rec.fields.street, rec.fields.house_number].filter(Boolean).join(' ')}
                meta={[rec.fields.postal_code, rec.fields.city].filter(Boolean).join(' ')}
              />
              <SkateparksVeranstaltungsorteDetails
                record={rec}
                eventVerwaltungList={eventVerwaltung}
                onOpenEventVerwaltung={r => overlay.push({ type: 'event', record: r })}
                onAddEventVerwaltung={() => {
                  setEditEvent(null);
                  setEventDefaults({ location: createRecordUrl(APP_IDS.SKATEPARKS_VERANSTALTUNGSORTE, rec.record_id) });
                  setEventDialogOpen(true);
                }}
              />
            </>
          );
        })()}
      </RecordOverlay>

      {/* Dialogs */}
      <EventVerwaltungDialog
        open={eventDialogOpen}
        onClose={() => { setEventDialogOpen(false); setEditEvent(null); setEventDefaults({}); }}
        onSubmit={async fields => {
          if (editEvent) {
            await LivingAppsService.updateEventVerwaltungEntry(editEvent.record_id, fields);
          } else {
            await LivingAppsService.createEventVerwaltungEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editEvent ? editEvent.fields : eventDefaults}
        recordId={editEvent?.record_id}
        skateparksVeranstaltungsorteList={skateparksVeranstaltungsorte}
        enablePhotoScan={AI_PHOTO_SCAN['EventVerwaltung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['EventVerwaltung']}
      />

      <TeilnehmerAnmeldungDialog
        open={teilnehmerDialogOpen}
        onClose={() => { setTeilnehmerDialogOpen(false); setEditTeilnehmer(null); setTeilnehmerDefaults({}); }}
        onSubmit={async fields => {
          if (editTeilnehmer) {
            await LivingAppsService.updateTeilnehmerAnmeldungEntry(editTeilnehmer.record_id, fields);
          } else {
            await LivingAppsService.createTeilnehmerAnmeldungEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editTeilnehmer ? editTeilnehmer.fields : teilnehmerDefaults}
        recordId={editTeilnehmer?.record_id}
        eventVerwaltungList={eventVerwaltung}
        enablePhotoScan={AI_PHOTO_SCAN['TeilnehmerAnmeldung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['TeilnehmerAnmeldung']}
      />
    </>
  );
}

// --- Loading / Error ---

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="flex gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 flex-1 rounded-xl" />)}
      </div>
      <Skeleton className="h-[500px] rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);
    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });
    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });
      if (!resp.ok || !resp.body) { setRepairing(false); setRepairFailed(true); return; }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch { setRepairing(false); setRepairFailed(true); }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte lade die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen.</p>}
    </div>
  );
}
