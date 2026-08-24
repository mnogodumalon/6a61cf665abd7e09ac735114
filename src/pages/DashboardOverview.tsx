import { useMemo, useState } from 'react';
import { format, parseISO, isAfter, isBefore, addDays, startOfDay } from 'date-fns';
import { dateFnsLocale } from '@/i18n';
import { tx, appLabel } from '@/i18n';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { DashboardSkeleton, DashboardError } from '@/components/DashboardStates';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { CalendarWidget, type CalendarEvent } from '@/components/widgets/CalendarWidget';
import { ChartWidget, type ChartSegment } from '@/components/widgets/ChartWidget';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import type { EnrichedEventVerwaltung } from '@/types/enriched';
import { extractRecordId, LivingAppsService } from '@/services/livingAppsService';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { LOOKUP_OPTIONS } from '@/types/app';
import {
  IconCalendar,
  IconUsers,
  IconMapPin,
  IconAlertTriangle,
  IconTrophy,
} from '@tabler/icons-react';

export default function DashboardOverview() {
  const clock = useClock();
  const data = useDashboardData();
  const {
    skateparksVeranstaltungsorte,
    eventVerwaltung,
    teilnehmerAnmeldung,
    eventVerwaltungMap,
    loading,
    error,
    fetchAll,
    setEventVerwaltung,
  } = data;

  const crud = useEntityCrud(data);
  const enrichedEventVerwaltung = crud.enriched.eventVerwaltung;

  const [categoryFilter, setCategoryFilter] = useState<ChartSegment<EnrichedEventVerwaltung> | null>(null);

  // Participant counts per event — must be ABOVE early returns
  const participantsByEvent = useMemo(() => {
    const map = new Map<string, number>();
    teilnehmerAnmeldung.forEach(t => {
      const eid = extractRecordId(t.fields.event);
      if (eid) map.set(eid, (map.get(eid) ?? 0) + 1);
    });
    return map;
  }, [teilnehmerAnmeldung]);

  // Calendar events — must be ABOVE early returns
  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    return enrichedEventVerwaltung
      .filter(ev => !!ev.fields.event_datetime)
      .map(ev => {
        const pCount = participantsByEvent.get(ev.record_id) ?? 0;
        const max = ev.fields.max_participants ?? 0;
        const isFull = max > 0 && pCount >= max;
        const hasNoLocation = !ev.fields.location;
        return {
          id: `event:${ev.record_id}`,
          start: ev.fields.event_datetime!,
          title: ev.fields.event_title ?? tx('Unbenanntes Event'),
          subtitle: ev.locationName || tx('Kein Ort'),
          tone: hasNoLocation ? 'warning' : isFull ? 'destructive' : ev.fields.event_category?.key === 'contest' ? 'primary' : 'default',
        } as CalendarEvent;
      });
  }, [enrichedEventVerwaltung, participantsByEvent]);

  // ── ALL hooks above early returns ──────────────────────────────────────────
  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;
  // ── Plain derivations only below ───────────────────────────────────────────

  const today = format(clock, 'yyyy-MM-dd');

  // Upcoming events (from today onward)
  const upcomingEvents = enrichedEventVerwaltung
    .filter(ev => ev.fields.event_datetime && ev.fields.event_datetime >= today)
    .sort((a, b) => (a.fields.event_datetime ?? '').localeCompare(b.fields.event_datetime ?? ''));

  const totalParticipants = teilnehmerAnmeldung.length;
  const totalVenues = skateparksVeranstaltungsorte.length;

  // Events missing location (urgent)
  const eventsNoLocation = enrichedEventVerwaltung.filter(
    ev => !ev.fields.location && ev.fields.event_datetime && ev.fields.event_datetime >= today
  );

  // Upcoming events in next 7 days
  const nextWeekCutoff = format(addDays(clock, 7), 'yyyy-MM-dd');
  const thisWeekEvents = upcomingEvents.filter(
    ev => ev.fields.event_datetime && ev.fields.event_datetime <= nextWeekCutoff
  );

  // Filtered events for aside list
  const asideEvents = categoryFilter
    ? upcomingEvents.filter(r => categoryFilter.test({ id: `event:${r.record_id}`, data: r }))
    : upcomingEvents;

  // Greeting context line
  const nextEvent = upcomingEvents[0];
  const contextLine = nextEvent
    ? nextEvent.fields.event_datetime?.startsWith(today)
      ? tx`Heute: ${nextEvent.fields.event_title ?? ''}${nextEvent.locationName ? ` — ${nextEvent.locationName}` : ''}`
      : tx`Nächstes Event: ${nextEvent.fields.event_title ?? ''} am ${formatDate(nextEvent.fields.event_datetime)}`
    : tx('Noch keine Events geplant — leg das erste an!');

  // Category options (inside component body — locale-aware)
  const categoryOptions = LOOKUP_OPTIONS['event_verwaltung']?.['event_category'] ?? [];

  // Optimistic drag reschedule
  const handleEventDrop = async (eventId: string, newStart: string) => {
    const rid = eventId.split(':')[1];
    if (!rid) return;
    const prev = eventVerwaltung.find(e => e.record_id === rid);
    if (!prev) return;
    setEventVerwaltung(list =>
      list.map(e => e.record_id === rid ? { ...e, fields: { ...e.fields, event_datetime: newStart } } : e)
    );
    try {
      await LivingAppsService.updateEventVerwaltungEntry(rid, { event_datetime: newStart });
      undoToast(tx`${prev.fields.event_title ?? ''} — Datum geändert`, async () => {
        setEventVerwaltung(list =>
          list.map(e => e.record_id === rid ? { ...e, fields: { ...e.fields, event_datetime: prev.fields.event_datetime } } : e)
        );
        await LivingAppsService.updateEventVerwaltungEntry(rid, { event_datetime: prev.fields.event_datetime });
      });
    } catch {
      await fetchAll();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{gruss(clock)}</h1>
          <p className="text-muted-foreground mt-1">{contextLine}</p>
        </div>
        <button
          onClick={() => crud.eventVerwaltung.openCreate({})}
          className="shrink-0 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <IconCalendar size={16} className="shrink-0" />
          {tx('Event erstellen')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={
          eventsNoLocation.length > 0 ? (
            <HeroBanner
              icon={<IconAlertTriangle size={18} />}
              action={{
                label: tx('Ort zuweisen'),
                onClick: () => crud.eventVerwaltung.openEdit(eventsNoLocation[0]),
              }}
            >
              <b>{namen(eventsNoLocation.map(e => e.fields.event_title ?? ''))}</b>{' '}
              {tx('ohne Veranstaltungsort')} — {tx('bitte vor dem Event eintragen.')}
            </HeroBanner>
          ) : undefined
        }
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Kommende Events')}
              value={upcomingEvents.length}
              icon={<IconCalendar size={16} />}
              tone={upcomingEvents.length === 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Diese Woche')}
              value={thisWeekEvents.length}
              icon={<IconTrophy size={16} />}
              tone={thisWeekEvents.length > 0 ? 'primary' : 'default'}
            />
            <StatStripItem
              title={tx('Teilnehmer gesamt')}
              value={totalParticipants}
              icon={<IconUsers size={16} />}
            />
            <StatStripItem
              title={tx('Veranstaltungsorte')}
              value={totalVenues}
              icon={<IconMapPin size={16} />}
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
              title={tx('Nächste Events')}
              items={asideEvents.slice(0, 8).map(ev => {
                const pCount = participantsByEvent.get(ev.record_id) ?? 0;
                const max = ev.fields.max_participants;
                const countLabel = max
                  ? `${pCount}/${max} ${tx('Teilnehmer')}`
                  : pCount > 0
                  ? tx`${pCount} Teilnehmer`
                  : tx('Noch keine Anmeldungen');
                return {
                  id: ev.record_id,
                  title: ev.fields.event_title ?? tx('Unbenanntes Event'),
                  secondLine: (
                    <>
                      <span className="text-muted-foreground">
                        {formatDateTime(ev.fields.event_datetime)}
                      </span>
                      {ev.locationName && (
                        <span className="text-muted-foreground"> · {ev.locationName}</span>
                      )}
                      <span className="text-muted-foreground"> · {countLabel}</span>
                    </>
                  ),
                  action: {
                    label: tx('Anmelden'),
                    onClick: () => crud.teilnehmerAnmeldung.openCreate({ event: ev.record_id }),
                  },
                };
              })}
              onItemClick={id => {
                const rec = eventVerwaltung.find(e => e.record_id === id);
                if (rec) crud.eventVerwaltung.openDetail(rec);
              }}
              empty={{
                text: tx('Noch keine Events geplant'),
                action: {
                  label: tx('Erstes Event anlegen'),
                  onClick: () => crud.eventVerwaltung.openCreate({}),
                },
              }}
            />
            <ChartWidget
              title={tx('Events nach Kategorie')}
              rows={enrichedEventVerwaltung.map(ev => ({
                id: `event:${ev.record_id}`,
                data: ev,
              }))}
              dimension={{
                kind: 'category',
                accessor: r => r.data.fields.event_category,
              }}
              interaction={{
                mode: 'filter',
                selectedKey: categoryFilter?.key ?? null,
                onSelect: seg => setCategoryFilter(prev => prev?.key === seg?.key ? null : seg),
              }}
            />
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
