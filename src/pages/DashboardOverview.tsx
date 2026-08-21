import { useMemo, useState } from 'react';
import { format, parseISO, isAfter, isBefore, startOfDay, addDays } from 'date-fns';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { DashboardSkeleton, DashboardError } from '@/components/DashboardStates';
import { DashboardGrid } from '@/components/DashboardGrid';
import { WorkList } from '@/components/WorkList';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { CalendarWidget, type CalendarEvent } from '@/components/widgets/CalendarWidget';
import { ChartWidget } from '@/components/widgets/ChartWidget';
import { tx, appLabel, dateFnsLocale } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { formatDateTime, formatDate, lookupKey } from '@/lib/formatters';
import { LivingAppsService } from '@/services/livingAppsService';
import {
  IconCalendarEvent,
  IconUsers,
  IconMapPin,
  IconTrophy,
  IconPlus,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';

// Category → tone mapping for CalendarEvents
function toneForCategory(cat?: string): CalendarEvent['tone'] {
  switch (cat) {
    case 'contest': return 'destructive';
    case 'workshop': return 'primary';
    case 'jam_session': return 'success';
    case 'demo': return 'warning';
    default: return 'default';
  }
}

export default function DashboardOverview() {
  const data = useDashboardData();
  const {
    eventVerwaltung, teilnehmerAnmeldung, skateparksVeranstaltungsorte,
    setEventVerwaltung, loading, error, fetchAll,
  } = data;

  const clock = useClock();
  const crud = useEntityCrud(data);
  const enrichedEvents = crud.enriched.eventVerwaltung;
  const enrichedTeilnehmer = crud.enriched.teilnehmerAnmeldung;

  // Filter state for stat strip
  const [activeFilter, setActiveFilter] = useState<'upcoming' | 'past' | null>(null);

  // Derived values
  const today = startOfDay(clock);
  const nextWeek = addDays(today, 7);

  const upcomingEvents = useMemo(
    () => enrichedEvents.filter(e => e.fields.event_datetime && isAfter(parseISO(e.fields.event_datetime!), today)),
    [enrichedEvents, today],
  );

  const thisWeekEvents = useMemo(
    () => upcomingEvents.filter(e => isBefore(parseISO(e.fields.event_datetime!), nextWeek)),
    [upcomingEvents, nextWeek],
  );

  const totalAnmeldungen = teilnehmerAnmeldung.length;
  const totalOrte = skateparksVeranstaltungsorte.length;

  // Context line — naming upcoming events
  const contextLine = useMemo(() => {
    if (upcomingEvents.length === 0) return tx('Noch keine Events geplant — leg jetzt los!');
    const names = upcomingEvents.slice(0, 3).map(e => e.fields.event_title ?? '');
    return tx`${namen(names)} — bevorstehende Events`;
  }, [upcomingEvents]);

  // Calendar events mapping
  const calendarEvents = useMemo<CalendarEvent[]>(
    () =>
      enrichedEvents
        .filter(e => !!e.fields.event_datetime)
        .map(e => ({
          id: `event:${e.record_id}`,
          start: e.fields.event_datetime!,
          title: e.fields.event_title ?? tx('Ohne Titel'),
          subtitle: e.locationName || undefined,
          tone: toneForCategory(lookupKey(e.fields.event_category)),
        })),
    [enrichedEvents],
  );

  // Filtered events for WorkList (upcoming)
  const workListItems = useMemo(() => {
    const src = activeFilter === 'past'
      ? enrichedEvents.filter(e => e.fields.event_datetime && isBefore(parseISO(e.fields.event_datetime!), today))
      : upcomingEvents;
    return src.slice(0, 8).map(e => ({
      id: e.record_id,
      title: e.fields.event_title ?? tx('Ohne Titel'),
      secondLine: (
        <span className="text-muted-foreground text-xs">
          {formatDateTime(e.fields.event_datetime)}
          {e.locationName ? ` · ${e.locationName}` : ''}
        </span>
      ),
      action: {
        label: tx('Anmelden'),
        onClick: () => crud.teilnehmerAnmeldung.openCreate({ event: e.record_id }),
      },
    }));
  }, [enrichedEvents, upcomingEvents, activeFilter, today, crud.teilnehmerAnmeldung]);

  // Anmeldungs-WorkList (recent signups)
  const anmeldungItems = useMemo(
    () =>
      enrichedTeilnehmer.slice(0, 6).map(t => ({
        id: t.record_id,
        title: [t.fields.participant_firstname, t.fields.participant_lastname].filter(Boolean).join(' ') || tx('Unbekannt'),
        secondLine: (
          <span className="text-muted-foreground text-xs">
            {t.eventName || tx('Kein Event')}
          </span>
        ),
      })),
    [enrichedTeilnehmer],
  );

  // Empty state CTA
  const hasNoEvents = eventVerwaltung.length === 0;

  // Chart rows for category distribution
  const chartRows = useMemo(
    () =>
      enrichedEvents.map(e => ({
        id: `event:${e.record_id}`,
        data: e,
      })),
    [enrichedEvents],
  );

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  // Reschedule handler (optimistic)
  const handleEventDrop = async (eventId: string, newStart: string) => {
    const rid = eventId.split(':')[1];
    if (!rid) return;
    const prev = eventVerwaltung.find(e => e.record_id === rid);
    setEventVerwaltung(list =>
      list.map(e => e.record_id === rid ? { ...e, fields: { ...e.fields, event_datetime: newStart } } : e),
    );
    try {
      await LivingAppsService.updateEventVerwaltungEntry(rid, { event_datetime: newStart });
      undoToast(tx`Event verschoben auf ${formatDateTime(newStart)}`, async () => {
        setEventVerwaltung(list =>
          list.map(e => e.record_id === rid ? { ...e, fields: { ...e.fields, event_datetime: prev?.fields.event_datetime } } : e),
        );
        await LivingAppsService.updateEventVerwaltungEntry(rid, { event_datetime: prev?.fields.event_datetime });
      });
    } catch {
      await fetchAll();
    }
  };

  // Empty app state
  if (hasNoEvents) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{gruss(clock)}</h1>
          <p className="text-muted-foreground mt-1">{tx('Starte deine Skateboard-Event-Verwaltung!')}</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
          <IconTrophy size={48} className="text-muted-foreground" stroke={1.5} />
          <div>
            <p className="text-lg font-semibold">{tx('Noch keine Events angelegt')}</p>
            <p className="text-muted-foreground mt-1">{tx('Erstelle dein erstes Skatepark-Event und verwalte Anmeldungen.')}</p>
          </div>
          <Button onClick={() => crud.eventVerwaltung.openCreate({})}>
            <IconPlus size={16} className="shrink-0" />
            {tx('Erstes Event erstellen')}
          </Button>
        </div>
        {crud.surfaces}
      </div>
    );
  }

  const toggleFilter = (f: 'upcoming' | 'past') =>
    setActiveFilter(prev => (prev === f ? null : f));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{gruss(clock)}</h1>
          <p className="text-muted-foreground mt-1">{contextLine}</p>
        </div>
        <Button size="sm" onClick={() => crud.eventVerwaltung.openCreate({})}>
          <IconPlus size={16} className="shrink-0" />
          <span className="hidden sm:inline">{tx('Neues Event')}</span>
        </Button>
      </div>

      <DashboardGrid
        variant="wide"
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Events gesamt')}
              value={eventVerwaltung.length}
              icon={<IconCalendarEvent size={16} />}
            />
            <StatStripItem
              title={tx('Diese Woche')}
              value={thisWeekEvents.length}
              icon={<IconCalendarEvent size={16} />}
              tone={thisWeekEvents.length > 0 ? 'primary' : 'default'}
              onClick={() => toggleFilter('upcoming')}
              active={activeFilter === 'upcoming'}
            />
            <StatStripItem
              title={tx('Anmeldungen')}
              value={totalAnmeldungen}
              icon={<IconUsers size={16} />}
            />
            <StatStripItem
              title={appLabel('skateparks_veranstaltungsorte')}
              value={totalOrte}
              icon={<IconMapPin size={16} />}
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
              const rec = eventVerwaltung.find(e => e.record_id === rid);
              if (rec) crud.eventVerwaltung.openDetail(rec);
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
              title={activeFilter === 'past' ? tx('Vergangene Events') : tx('Bevorstehende Events')}
              items={workListItems}
              onItemClick={id => {
                const rec = eventVerwaltung.find(e => e.record_id === id);
                if (rec) crud.eventVerwaltung.openDetail(rec);
              }}
              empty={{
                text: activeFilter === 'past'
                  ? tx('Keine vergangenen Events.')
                  : tx('Keine bevorstehenden Events — erstelle jetzt ein Event!'),
                action: { label: tx('Event erstellen'), onClick: () => crud.eventVerwaltung.openCreate({}) },
              }}
            />
            <WorkList
              title={tx('Letzte Anmeldungen')}
              items={anmeldungItems}
              onItemClick={id => {
                const rec = teilnehmerAnmeldung.find(t => t.record_id === id);
                if (rec) crud.teilnehmerAnmeldung.openDetail(rec);
              }}
              empty={{
                text: tx('Noch keine Anmeldungen.'),
                action: { label: tx('Anmeldung erfassen'), onClick: () => crud.teilnehmerAnmeldung.openCreate({}) },
              }}
            />
          </>
        }
      />

      {/* Chart: Events by Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartWidget
          title={tx('Events nach Kategorie')}
          rows={chartRows}
          dimension={{
            kind: 'category',
            accessor: r => r.data.fields.event_category,
          }}
          interaction={{
            mode: 'drill',
            onSegmentClick: seg => {
              const recs = enrichedEvents.filter(e => seg.test({ id: `event:${e.record_id}`, data: e }));
              if (recs.length > 0) crud.eventVerwaltung.openDetail(recs[0]);
            },
          }}
        />
        <ChartWidget
          title={tx('Events nach Level')}
          rows={chartRows}
          dimension={{
            kind: 'category',
            accessor: r => r.data.fields.skill_level,
          }}
        />
      </div>

      {crud.surfaces}
    </div>
  );
}
