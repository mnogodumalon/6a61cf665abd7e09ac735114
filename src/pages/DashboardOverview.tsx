import { useMemo, useState } from 'react';
import { format, parseISO, isToday, isFuture, isAfter, addDays, startOfDay, endOfDay, isBefore } from 'date-fns';
import { dateFnsLocale } from '@/i18n';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { DashboardSkeleton, DashboardError } from '@/components/DashboardStates';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { CalendarWidget, type CalendarEvent } from '@/components/widgets/CalendarWidget';
import { tx, appLabel } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { formatDate, formatDateTime, lookupKey } from '@/lib/formatters';
import { LivingAppsService } from '@/services/livingAppsService';
import {
  IconCalendarEvent,
  IconUsers,
  IconCalendar,
  IconAlertTriangle,
  IconTrophy,
  IconMusic,
  IconStar,
  IconSchool,
  IconDots,
} from '@tabler/icons-react';

// Tone per event category
function toneForCategory(key: string | undefined): CalendarEvent['tone'] {
  switch (key) {
    case 'contest': return 'primary';
    case 'jam_session': return 'success';
    case 'demo': return 'warning';
    case 'workshop': return 'default';
    default: return 'default';
  }
}

function categoryIcon(key: string | undefined) {
  switch (key) {
    case 'contest': return <IconTrophy size={12} className="shrink-0" />;
    case 'jam_session': return <IconMusic size={12} className="shrink-0" />;
    case 'demo': return <IconStar size={12} className="shrink-0" />;
    case 'workshop': return <IconSchool size={12} className="shrink-0" />;
    default: return <IconDots size={12} className="shrink-0" />;
  }
}

export default function DashboardOverview() {
  const data = useDashboardData();
  const {
    skateparksVeranstaltungsorte, teilnehmerAnmeldung, eventVerwaltung,
    setEventVerwaltung,
    loading, error, fetchAll,
  } = data;

  const crud = useEntityCrud(data);
  const enrichedEventVerwaltung = crud.enriched.eventVerwaltung;
  const enrichedTeilnehmerAnmeldung = crud.enriched.teilnehmerAnmeldung;

  const clock = useClock();
  const [filterActive, setFilterActive] = useState<'today' | 'week' | null>(null);

  // Calendar events — must be above early returns (useMemo is a hook)
  const calendarEvents = useMemo<CalendarEvent[]>(
    () =>
      enrichedEventVerwaltung
        .filter(e => !!e.fields.event_datetime)
        .map(e => {
          const catKey = lookupKey(e.fields.event_category);
          return {
            id: `event:${e.record_id}`,
            start: e.fields.event_datetime!,
            title: e.fields.event_title ?? tx('Ohne Titel'),
            subtitle: e.locationName || undefined,
            tone: toneForCategory(catKey),
          };
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enrichedEventVerwaltung],
  );

  // ─── All hooks above early returns ───
  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  // ─── Plain derivations below ───
  const todayStr = format(clock, 'yyyy-MM-dd');
  const weekEndStr = format(addDays(clock, 7), 'yyyy-MM-dd');

  // Events with date
  const eventsWithDate = enrichedEventVerwaltung.filter(e => !!e.fields.event_datetime);

  // Today's events
  const todayEvents = eventsWithDate.filter(e => {
    const dt = e.fields.event_datetime!;
    return dt.startsWith(todayStr);
  });

  // This week events
  const weekEvents = eventsWithDate.filter(e => {
    const dt = e.fields.event_datetime!;
    return dt >= todayStr && dt <= weekEndStr;
  });

  // Upcoming events (future)
  const upcomingEvents = eventsWithDate
    .filter(e => e.fields.event_datetime! >= todayStr)
    .sort((a, b) => a.fields.event_datetime!.localeCompare(b.fields.event_datetime!));

  // Total participants
  const totalParticipants = teilnehmerAnmeldung.length;

  // Recent registrations (latest 5)
  const recentRegistrations = [...enrichedTeilnehmerAnmeldung]
    .sort((a, b) => (b.createdat ?? '').localeCompare(a.createdat ?? ''))
    .slice(0, 5);

  // Events today: hero signal
  const heroEvents = todayEvents;
  const hasHero = heroEvents.length > 0;

  // KPI filtering
  const filteredEvents = filterActive === 'today'
    ? todayEvents
    : filterActive === 'week'
    ? weekEvents
    : null;

  // Context line
  const nextEvent = upcomingEvents[0];
  const contextLine = nextEvent
    ? tx`Nächstes Event: "${nextEvent.fields.event_title ?? ''}" — ${formatDateTime(nextEvent.fields.event_datetime)}`
    : tx('Noch keine Events geplant — lege jetzt los!');

  // Reschedule handler (optimistic)
  const reschedule = async (eventId: string, newStart: string) => {
    const rid = eventId.split(':')[1];
    if (!rid) return;
    const prev = eventVerwaltung.find(e => e.record_id === rid);
    if (!prev) return;
    setEventVerwaltung(evts =>
      evts.map(e =>
        e.record_id === rid
          ? { ...e, fields: { ...e.fields, event_datetime: newStart } }
          : e,
      ),
    );
    try {
      await LivingAppsService.updateEventVerwaltungEntry(rid, { event_datetime: newStart });
      undoToast(
        tx`Termin verschoben`,
        async () => {
          setEventVerwaltung(evts =>
            evts.map(e =>
              e.record_id === rid
                ? { ...e, fields: { ...e.fields, event_datetime: prev.fields.event_datetime } }
                : e,
            ),
          );
          await LivingAppsService.updateEventVerwaltungEntry(rid, { event_datetime: prev.fields.event_datetime });
        },
      );
    } catch {
      await fetchAll();
    }
  };

  const workListEvents = (filteredEvents ?? upcomingEvents.slice(0, 5)).map(e => ({
    id: e.record_id,
    title: e.fields.event_title ?? tx('Ohne Titel'),
    secondLine: (
      <>
        <span className="font-medium text-muted-foreground">{e.fields.event_category?.label ?? ''}</span>
        {e.fields.event_datetime && (
          <span className="text-muted-foreground"> · {formatDateTime(e.fields.event_datetime)}</span>
        )}
      </>
    ),
  }));

  const workListParticipants = recentRegistrations.map(p => ({
    id: p.record_id,
    title: `${p.fields.participant_firstname ?? ''} ${p.fields.participant_lastname ?? ''}`.trim() || tx('Unbekannt'),
    secondLine: (
      <>
        <span className="text-muted-foreground">{p.eventName || appLabel('event_verwaltung')}</span>
        {p.fields.participant_skill_level && (
          <span className="text-muted-foreground"> · {p.fields.participant_skill_level.label}</span>
        )}
      </>
    ),
  }));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{gruss(clock)}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{contextLine}</p>
        </div>
        <button
          onClick={() => crud.eventVerwaltung.openCreate({})}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors self-start sm:self-auto"
        >
          <IconCalendarEvent size={16} className="shrink-0" />
          {tx('Neues Event')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={
          hasHero ? (
            <HeroBanner
              icon={<IconAlertTriangle size={18} />}
              action={{
                label: tx('Event öffnen'),
                onClick: () => crud.eventVerwaltung.openDetail(heroEvents[0]),
              }}
            >
              {tx`Heute findet${heroEvents.length === 1 ? tx` das Event` : tx` ${heroEvents.length} Events`} statt`}{' '}
              — <b>{namen(heroEvents.map(e => e.fields.event_title ?? ''))}</b>
            </HeroBanner>
          ) : undefined
        }
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Events gesamt')}
              value={eventVerwaltung.length}
              icon={<IconCalendar size={16} className="shrink-0" />}
            />
            <StatStripItem
              title={tx('Heute')}
              value={todayEvents.length}
              icon={<IconCalendarEvent size={16} className="shrink-0" />}
              tone={todayEvents.length > 0 ? 'primary' : 'default'}
              onClick={() => setFilterActive(f => f === 'today' ? null : 'today')}
              active={filterActive === 'today'}
            />
            <StatStripItem
              title={tx('Diese Woche')}
              value={weekEvents.length}
              icon={<IconCalendarEvent size={16} className="shrink-0" />}
              onClick={() => setFilterActive(f => f === 'week' ? null : 'week')}
              active={filterActive === 'week'}
            />
            <StatStripItem
              title={tx('Teilnehmer')}
              value={totalParticipants}
              icon={<IconUsers size={16} className="shrink-0" />}
            />
          </StatStrip>
        }
        primary={
          <CalendarWidget
            events={filterActive
              ? calendarEvents.filter(ev => {
                  const rid = ev.id.split(':')[1];
                  const filtered = filteredEvents?.map(e => e.record_id) ?? [];
                  return filtered.includes(rid ?? '');
                })
              : calendarEvents}
            defaultView="month"
            locale={dateFnsLocale()}
            onEventClick={ev => {
              const rid = ev.id.split(':')[1];
              const record = enrichedEventVerwaltung.find(e => e.record_id === rid);
              if (record) crud.eventVerwaltung.openDetail(record);
            }}
            onEventDrop={(eventId, newStart) => reschedule(eventId, newStart)}
            onEmptyClick={date => {
              crud.eventVerwaltung.openCreate({
                event_datetime: format(date, "yyyy-MM-dd'T'HH:mm"),
              });
            }}
            renderEvent={(ev) => {
              const catKey = (() => {
                const rid = ev.id.split(':')[1];
                const record = enrichedEventVerwaltung.find(e => e.record_id === rid);
                return lookupKey(record?.fields.event_category);
              })();
              return (
                <div className="flex items-center gap-1 px-1.5 py-0.5 text-xs truncate">
                  {categoryIcon(catKey)}
                  <span className="truncate">{ev.title}</span>
                </div>
              );
            }}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Kommende Events')}
              items={workListEvents}
              onItemClick={id => {
                const record = enrichedEventVerwaltung.find(e => e.record_id === id);
                if (record) crud.eventVerwaltung.openDetail(record);
              }}
              empty={{
                text: tx('Keine Events geplant — erstelle jetzt ein Event!'),
                action: {
                  label: tx('Neues Event'),
                  onClick: () => crud.eventVerwaltung.openCreate({}),
                },
              }}
            />
            <WorkList
              title={tx('Neue Anmeldungen')}
              items={workListParticipants}
              onItemClick={id => {
                const record = enrichedTeilnehmerAnmeldung.find(p => p.record_id === id);
                if (record) crud.teilnehmerAnmeldung.openDetail(record);
              }}
              empty={{
                text: tx('Noch keine Anmeldungen — teile den Anmeldelink!'),
                action: {
                  label: tx('Anmeldung eintragen'),
                  onClick: () => crud.teilnehmerAnmeldung.openCreate({}),
                },
              }}
            />
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
