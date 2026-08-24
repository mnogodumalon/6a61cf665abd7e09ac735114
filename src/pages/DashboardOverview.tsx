import { useMemo, useState, useCallback } from 'react';
import { format, parseISO, isAfter, isBefore, startOfDay, addDays } from 'date-fns';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { DashboardSkeleton, DashboardError } from '@/components/DashboardStates';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { CalendarWidget, type CalendarEvent, type CalendarTone } from '@/components/widgets/CalendarWidget';
import { tx, appLabel } from '@/i18n';
import { dateFnsLocale } from '@/i18n';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { LivingAppsService } from '@/services/livingAppsService';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import {
  IconCalendar,
  IconUsers,
  IconMapPin,
  IconAlertTriangle,
  IconTicket,
} from '@tabler/icons-react';
import type { EnrichedEventVerwaltung } from '@/types/enriched';

export default function DashboardOverview() {
  const data = useDashboardData();
  const {
    skateparksVeranstaltungsorte,
    eventVerwaltung,
    teilnehmerAnmeldung,
    setEventVerwaltung,
    loading,
    error,
    fetchAll,
  } = data;

  const crud = useEntityCrud(data);
  const enrichedEvents = crud.enriched.eventVerwaltung as EnrichedEventVerwaltung[];
  const enrichedTeilnehmer = crud.enriched.teilnehmerAnmeldung;

  const clock = useClock();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // teilnehmerByEvent — must be above early returns
  const teilnehmerByEvent = useMemo(() => {
    const m = new Map<string, number>();
    teilnehmerAnmeldung.forEach(t => {
      const url = t.fields.event;
      if (!url) return;
      const match = url.match(/([a-f0-9]{24})$/i);
      const id = match ? match[1] : null;
      if (id) m.set(id, (m.get(id) ?? 0) + 1);
    });
    return m;
  }, [teilnehmerAnmeldung]);

  // calendarEvents — must be above early returns
  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    let list = enrichedEvents;
    if (categoryFilter) {
      list = list.filter(e => e.fields.event_category?.key === categoryFilter);
    }
    return list
      .filter(e => !!e.fields.event_datetime)
      .map(e => {
        const count = teilnehmerByEvent.get(e.record_id) ?? 0;
        const max = e.fields.max_participants;
        let tone: CalendarTone = 'default';
        if (!e.fields.location) tone = 'warning';
        else if (max && count >= max) tone = 'destructive';
        else tone = 'primary';
        return {
          id: `event:${e.record_id}`,
          start: e.fields.event_datetime!,
          title: e.fields.event_title ?? tx('Unbekanntes Event'),
          subtitle: e.locationName || tx('Kein Ort'),
          tone,
        };
      });
  }, [enrichedEvents, categoryFilter, teilnehmerByEvent]);

  // handleEventDrop — must be above early returns
  const handleEventDrop = useCallback(async (eventId: string, newStart: string) => {
    const rid = eventId.split(':')[1];
    if (!rid) return;
    const prev = eventVerwaltung.find(e => e.record_id === rid);
    if (!prev) return;
    const oldDatetime = prev.fields.event_datetime;
    setEventVerwaltung(list =>
      list.map(e => e.record_id === rid ? { ...e, fields: { ...e.fields, event_datetime: newStart } } : e)
    );
    try {
      await LivingAppsService.updateEventVerwaltungEntry(rid, { event_datetime: newStart });
      undoToast(tx`${prev.fields.event_title ?? ''} — verschoben`, async () => {
        setEventVerwaltung(list =>
          list.map(e => e.record_id === rid ? { ...e, fields: { ...e.fields, event_datetime: oldDatetime } } : e)
        );
        await LivingAppsService.updateEventVerwaltungEntry(rid, { event_datetime: oldDatetime });
      });
    } catch {
      fetchAll();
    }
  }, [eventVerwaltung, setEventVerwaltung, fetchAll]);

  // ─── All hooks above this line ───
  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const todayStr = format(clock, 'yyyy-MM-dd');
  const todayStart = startOfDay(clock);
  const nextWeek = addDays(clock, 7);

  // Upcoming events (today or future)
  const upcomingEvents = enrichedEvents.filter(e => {
    if (!e.fields.event_datetime) return false;
    return !isBefore(parseISO(e.fields.event_datetime), todayStart);
  }).sort((a, b) => (a.fields.event_datetime ?? '').localeCompare(b.fields.event_datetime ?? ''));

  // Events happening today
  const todayEvents = enrichedEvents.filter(e => {
    if (!e.fields.event_datetime) return false;
    return e.fields.event_datetime.startsWith(todayStr);
  });

  // Events ohne Veranstaltungsort (fehlt location)
  const ohneOrt = enrichedEvents.filter(e => !e.fields.location);

  // Next week's events
  const nextWeekEvents = enrichedEvents.filter(e => {
    if (!e.fields.event_datetime) return false;
    const d = parseISO(e.fields.event_datetime);
    return !isBefore(d, todayStart) && isBefore(d, nextWeek);
  });

  // Recent signups (last 7 days)
  const recentAnmeldungen = enrichedTeilnehmer
    .filter(t => {
      const created = parseISO(t.createdat || t.created_at || todayStr);
      return !isBefore(addDays(clock, 7), created) && isAfter(created, addDays(clock, -7));
    })
    .sort((a, b) => (b.createdat || '').localeCompare(a.createdat || ''));

  // Context line
  const todayNames = todayEvents.map(e => e.fields.event_title ?? '').filter(Boolean);
  const contextLine = todayEvents.length > 0
    ? tx`Heute: ${namen(todayNames)} — ${todayEvents.length} ${todayEvents.length === 1 ? tx('Event') : tx('Events')} finden statt.`
    : upcomingEvents.length > 0
    ? tx`Nächstes Event: ${upcomingEvents[0].fields.event_title ?? ''} am ${formatDate(upcomingEvents[0].fields.event_datetime)}.`
    : tx('Noch keine Events geplant — lege dein erstes Event an.');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {gruss(clock)} {/* i18n-exempt */}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{contextLine}</p>
        </div>
        <button
          onClick={() => crud.eventVerwaltung.openCreate({})}
          className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <IconCalendar size={16} className="shrink-0" />
          {tx('Event erstellen')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={
          ohneOrt.length > 0 ? (
            <HeroBanner
              icon={<IconAlertTriangle size={18} />}
              action={{
                label: tx('Ort zuweisen'),
                onClick: () => crud.eventVerwaltung.openEdit(ohneOrt[0]),
              }}
            >
              <b>{namen(ohneOrt.map(e => e.fields.event_title ?? ''))}</b>{' '}
              {ohneOrt.length === 1
                ? tx('hat noch keinen Veranstaltungsort.')
                : tx`— ${ohneOrt.length} Events ohne Veranstaltungsort.`}
            </HeroBanner>
          ) : undefined
        }
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Events gesamt')}
              value={enrichedEvents.length}
              icon={<IconCalendar size={16} className="shrink-0" />}
            />
            <StatStripItem
              title={tx('Diese Woche')}
              value={nextWeekEvents.length}
              icon={<IconTicket size={16} className="shrink-0" />}
              tone={nextWeekEvents.length > 0 ? 'primary' : 'default'}
            />
            <StatStripItem
              title={tx('Teilnehmer')}
              value={teilnehmerAnmeldung.length}
              icon={<IconUsers size={16} className="shrink-0" />}
            />
            <StatStripItem
              title={tx('Veranstaltungsorte')}
              value={skateparksVeranstaltungsorte.length}
              icon={<IconMapPin size={16} className="shrink-0" />}
              onClick={() => crud.skateparksVeranstaltungsorte.openCreate({})}
            />
          </StatStrip>
        }
        primary={
          <CalendarWidget
            events={calendarEvents}
            defaultView="week"
            locale={dateFnsLocale()}
            onEventClick={ev => {
              const rid = ev.id.split(':')[1];
              const record = enrichedEvents.find(e => e.record_id === rid);
              if (record) crud.eventVerwaltung.openDetail(record);
            }}
            onEventDrop={handleEventDrop}
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
              title={tx('Anstehende Events')}
              items={upcomingEvents.slice(0, 8).map(e => {
                const count = teilnehmerByEvent.get(e.record_id) ?? 0;
                const max = e.fields.max_participants;
                const full = max ? count >= max : false;
                return {
                  id: e.record_id,
                  title: e.fields.event_title ?? tx('Unbenannt'),
                  secondLine: (
                    <>
                      <span className={full ? 'font-medium text-destructive' : 'text-muted-foreground'}>
                        {full ? tx('Ausgebucht') : `${count}${max ? `/${max}` : ''} ${tx('Teilnehmer')}`}
                      </span>
                      <span className="text-muted-foreground"> · {formatDateTime(e.fields.event_datetime)}</span>
                    </>
                  ),
                  action: {
                    label: tx('Anmeldung'),
                    onClick: () => crud.teilnehmerAnmeldung.openCreate({ event: e.record_id }),
                  },
                };
              })}
              onItemClick={id => {
                const record = enrichedEvents.find(e => e.record_id === id);
                if (record) crud.eventVerwaltung.openDetail(record);
              }}
              empty={{
                text: tx('Keine anstehenden Events — erstelle dein erstes Event.'),
                action: { label: tx('Event anlegen'), onClick: () => crud.eventVerwaltung.openCreate({}) },
              }}
            />
            <WorkList
              title={tx('Neue Anmeldungen')}
              items={recentAnmeldungen.slice(0, 6).map(t => ({
                id: t.record_id,
                title: `${t.fields.participant_firstname ?? ''} ${t.fields.participant_lastname ?? ''}`.trim() || tx('Unbekannt'),
                secondLine: (
                  <span className="text-muted-foreground">
                    {t.eventName || tx('Event unbekannt')}
                  </span>
                ),
              }))}
              onItemClick={id => {
                const record = enrichedTeilnehmer.find(t => t.record_id === id);
                if (record) crud.teilnehmerAnmeldung.openDetail(record);
              }}
              empty={{
                text: tx('Noch keine Anmeldungen in den letzten 7 Tagen.'),
                action: { label: tx('Anmeldung erfassen'), onClick: () => crud.teilnehmerAnmeldung.openCreate({}) },
              }}
            />
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
