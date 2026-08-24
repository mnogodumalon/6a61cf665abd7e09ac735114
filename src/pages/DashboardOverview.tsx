import { useState, useMemo } from 'react';
import { format, parseISO, isAfter, isBefore, startOfDay, addDays } from 'date-fns';
import { dateFnsLocale } from '@/i18n';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { DashboardSkeleton, DashboardError } from '@/components/DashboardStates';
import { DashboardGrid } from '@/components/DashboardGrid';
import { WorkList } from '@/components/WorkList';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { HeroBanner } from '@/components/HeroBanner';
import { tx } from '@/i18n';
import { useClock, namen, undoToast, gruss } from '@/lib/polish';
import { formatDate, formatDateTime, lookupKey } from '@/lib/formatters';
import {
  CalendarWidget,
  type CalendarEvent,
  type CalendarTone,
} from '@/components/widgets/CalendarWidget';
import type { EnrichedEventVerwaltung } from '@/types/enriched';
import {
  IconCalendar,
  IconUsers,
  IconAlertTriangle,
  IconPlus,
  IconTrophy,
} from '@tabler/icons-react';
import { LivingAppsService } from '@/services/livingAppsService';

function toneForEvent(ev: EnrichedEventVerwaltung, now: Date): CalendarTone {
  if (!ev.fields.event_datetime) return 'warning';
  const dt = parseISO(ev.fields.event_datetime);
  if (isBefore(dt, now)) return 'default';
  const inTwoDays = addDays(now, 2);
  if (isBefore(dt, inTwoDays)) return 'destructive';
  return 'primary';
}

export default function DashboardOverview() {
  const data = useDashboardData();
  const {
    skateparksVeranstaltungsorte,
    teilnehmerAnmeldung,
    eventVerwaltung,
    setEventVerwaltung,
    loading,
    error,
    fetchAll,
  } = data;

  const crud = useEntityCrud(data);
  const enrichedEventVerwaltung = crud.enriched.eventVerwaltung;
  const enrichedTeilnehmer = crud.enriched.teilnehmerAnmeldung;

  const clock = useClock();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const today = startOfDay(clock);
  const todayStr = format(clock, 'yyyy-MM-dd');

  const upcomingEvents = useMemo(
    () =>
      enrichedEventVerwaltung
        .filter(ev => ev.fields.event_datetime && isAfter(parseISO(ev.fields.event_datetime), today))
        .sort((a, b) => (a.fields.event_datetime ?? '').localeCompare(b.fields.event_datetime ?? '')),
    [enrichedEventVerwaltung, today],
  );

  const todayEvents = useMemo(
    () =>
      enrichedEventVerwaltung.filter(ev => {
        if (!ev.fields.event_datetime) return false;
        return ev.fields.event_datetime.startsWith(todayStr);
      }),
    [enrichedEventVerwaltung, todayStr],
  );

  const ohneWaiver = useMemo(
    () => enrichedTeilnehmer.filter(t => !t.fields.waiver_accepted),
    [enrichedTeilnehmer],
  );

  const filteredEvents = useMemo(() => {
    if (!categoryFilter) return enrichedEventVerwaltung;
    return enrichedEventVerwaltung.filter(
      ev => lookupKey(ev.fields.event_category) === categoryFilter,
    );
  }, [enrichedEventVerwaltung, categoryFilter]);

  const calendarEvents = useMemo<CalendarEvent[]>(
    () =>
      filteredEvents
        .filter(ev => !!ev.fields.event_datetime)
        .map(ev => ({
          id: `event:${ev.record_id}`,
          start: ev.fields.event_datetime!,
          allDay: false,
          title: ev.fields.event_title ?? tx('Ohne Titel'),
          subtitle: ev.locationName || ev.fields.event_category?.label,
          tone: toneForEvent(ev, clock),
        })),
    [filteredEvents, clock],
  );

  const naechsteTeilnehmerMemo = useMemo(
    () =>
      enrichedTeilnehmer
        .filter(t => {
          if (!t.fields.event) return false;
          return upcomingEvents.some(e => t.fields.event?.includes(e.record_id));
        })
        .sort((a, b) => {
          const evA = upcomingEvents.find(e => a.fields.event?.includes(e.record_id));
          const evB = upcomingEvents.find(e => b.fields.event?.includes(e.record_id));
          return (evA?.fields.event_datetime ?? '').localeCompare(evB?.fields.event_datetime ?? '');
        })
        .slice(0, 8),
    [enrichedTeilnehmer, upcomingEvents],
  );

  // ─── All hooks above early returns ───────────────────────────────────────

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const naechsteTeilnehmer = naechsteTeilnehmerMemo;

  // Reschedule via drag (only updates datetime)
  const reschedule = async (eventId: string, newStart: string) => {
    const rid = eventId.split(':')[1];
    if (!rid) return;
    const prev = eventVerwaltung.find(e => e.record_id === rid);
    if (!prev) return;
    setEventVerwaltung(list =>
      list.map(e =>
        e.record_id === rid
          ? { ...e, fields: { ...e.fields, event_datetime: newStart } }
          : e,
      ),
    );
    undoToast(
      tx`${prev.fields.event_title ?? ''} — verschoben`,
      async () => {
        setEventVerwaltung(list =>
          list.map(e => (e.record_id === rid ? prev : e)),
        );
        await LivingAppsService.updateEventVerwaltungEntry(rid, {
          event_datetime: prev.fields.event_datetime,
        });
      },
    );
    try {
      await LivingAppsService.updateEventVerwaltungEntry(rid, { event_datetime: newStart });
    } catch {
      await fetchAll();
    }
  };

  // Context line
  const eventNamen = todayEvents.map(ev => ev.fields.event_title ?? '');
  const contextLine =
    todayEvents.length > 0
      ? tx`${namen(eventNamen)} ${todayEvents.length === 1 ? tx('findet heute statt') : tx('finden heute statt')}.`
      : upcomingEvents.length > 0
        ? tx`Nächstes Event: ${upcomingEvents[0].fields.event_title ?? ''} am ${formatDate(upcomingEvents[0].fields.event_datetime)}.`
        : tx('Noch keine Events geplant – leg jetzt los!');

  const emptyDashboard = enrichedEventVerwaltung.length === 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{gruss(clock)}</h1>
          <p className="text-muted-foreground text-sm mt-1">{contextLine}</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
          onClick={() => crud.eventVerwaltung.openCreate({})}
        >
          <IconPlus size={16} className="shrink-0" />
          {tx('Neues Event')}
        </button>
      </div>

      {emptyDashboard ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <IconTrophy size={48} className="text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">{tx('Dein erstes Event anlegen')}</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {tx('Erstelle ein Event und lade Teilnehmer ein.')}
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            onClick={() => crud.eventVerwaltung.openCreate({})}
          >
            <IconPlus size={16} />
            {tx('Erstes Event erstellen')}
          </button>
        </div>
      ) : (
        <DashboardGrid
          variant="wide"
          hero={
            ohneWaiver.length > 0 && (
              <HeroBanner
                icon={<IconAlertTriangle size={18} />}
                action={{
                  label: tx('Teilnehmer anzeigen'),
                  onClick: () => {
                    const first = ohneWaiver[0];
                    crud.teilnehmerAnmeldung.openDetail(first);
                  },
                }}
              >
                <b>{namen(ohneWaiver.map(t => `${t.fields.participant_firstname ?? ''} ${t.fields.participant_lastname ?? ''}`.trim()))}</b>{' '}
                {ohneWaiver.length === 1
                  ? tx('hat die Teilnahmebedingungen noch nicht akzeptiert.')
                  : tx('haben die Teilnahmebedingungen noch nicht akzeptiert.')}
              </HeroBanner>
            )
          }
          kpis={
            <StatStrip>
              <StatStripItem
                title={tx('Events gesamt')}
                value={enrichedEventVerwaltung.length}
                icon={<IconCalendar size={16} />}
                tone="default"
              />
              <StatStripItem
                title={tx('Bevorstehend')}
                value={upcomingEvents.length}
                icon={<IconCalendar size={16} />}
                tone={upcomingEvents.length > 0 ? 'primary' : 'default'}
                onClick={() => setCategoryFilter(null)}
                active={categoryFilter === null && upcomingEvents.length > 0}
              />
              <StatStripItem
                title={tx('Heute')}
                value={todayEvents.length}
                icon={<IconCalendar size={16} />}
                tone={todayEvents.length > 0 ? 'warning' : 'default'}
              />
              <StatStripItem
                title={tx('Teilnehmer')}
                value={teilnehmerAnmeldung.length}
                icon={<IconUsers size={16} />}
                tone="default"
              />
              <StatStripItem
                title={tx('Locations')}
                value={skateparksVeranstaltungsorte.length}
                icon={<IconCalendar size={16} />}
                tone="default"
                onClick={() => crud.skateparksVeranstaltungsorte.openCreate({})}
              />
            </StatStrip>
          }
          primary={
            <CalendarWidget
              events={calendarEvents}
              defaultView="month"
              locale={dateFnsLocale()}
              onEventClick={ev => {
                const rid = ev.id.split(':')[1];
                const record = eventVerwaltung.find(e => e.record_id === rid);
                if (record) crud.eventVerwaltung.openDetail(record);
              }}
              onEventDrop={(eventId, newStart) => reschedule(eventId, newStart)}
              onEmptyClick={date => {
                crud.eventVerwaltung.openCreate({
                  event_datetime: format(date, "yyyy-MM-dd'T'HH:mm"),
                });
              }}
            />
          }
          aside={
            <>
              <WorkList
                title={tx('Kommende Events')}
                items={upcomingEvents.slice(0, 6).map(ev => ({
                  id: ev.record_id,
                  title: ev.fields.event_title ?? tx('Ohne Titel'),
                  secondLine: (
                    <>
                      <span className="font-medium text-primary">
                        {formatDateTime(ev.fields.event_datetime)}
                      </span>
                      {ev.locationName && (
                        <span className="text-muted-foreground"> · {ev.locationName}</span>
                      )}
                    </>
                  ),
                  action: {
                    label: tx('Anmeldung'),
                    onClick: () => {
                      crud.teilnehmerAnmeldung.openCreate({ event: ev.record_id });
                    },
                  },
                }))}
                onItemClick={id => {
                  const record = eventVerwaltung.find(e => e.record_id === id);
                  if (record) crud.eventVerwaltung.openDetail(record);
                }}
                empty={{
                  text: tx('Keine bevorstehenden Events – erstelle jetzt eines!'),
                  action: {
                    label: tx('Event anlegen'),
                    onClick: () => crud.eventVerwaltung.openCreate({}),
                  },
                }}
              />
              <WorkList
                title={tx('Neue Anmeldungen')}
                items={naechsteTeilnehmer.map(t => {
                  const ev = upcomingEvents.find(e => t.fields.event?.includes(e.record_id));
                  return {
                    id: t.record_id,
                    title: `${t.fields.participant_firstname ?? ''} ${t.fields.participant_lastname ?? ''}`.trim() || tx('Unbekannt'),
                    secondLine: (
                      <>
                        <span
                          className={
                            t.fields.waiver_accepted
                              ? 'font-medium text-emerald-600'
                              : 'font-medium text-amber-600'
                          }
                        >
                          {t.fields.waiver_accepted ? tx('Bestätigt') : tx('Ausstehend')}
                        </span>
                        {ev && (
                          <span className="text-muted-foreground"> · {ev.fields.event_title}</span>
                        )}
                      </>
                    ),
                  };
                })}
                onItemClick={id => {
                  const record = teilnehmerAnmeldung.find(t => t.record_id === id);
                  if (record) crud.teilnehmerAnmeldung.openDetail(record);
                }}
                empty={{
                  text: tx('Noch keine Anmeldungen für bevorstehende Events.'),
                  action: {
                    label: tx('Anmeldung erfassen'),
                    onClick: () => crud.teilnehmerAnmeldung.openCreate({}),
                  },
                }}
              />
            </>
          }
        />
      )}

      {crud.surfaces}
    </div>
  );
}
