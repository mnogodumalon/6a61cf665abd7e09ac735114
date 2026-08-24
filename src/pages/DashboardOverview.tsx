import { useMemo, useState } from 'react';
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay, addDays } from 'date-fns';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { DashboardSkeleton, DashboardError } from '@/components/DashboardStates';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { CalendarWidget } from '@/components/widgets/CalendarWidget';
import { ChartWidget } from '@/components/widgets/ChartWidget';
import type { CalendarEvent } from '@/components/widgets/CalendarWidget';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { dateFnsLocale } from '@/i18n';
import { tx, appLabel } from '@/i18n';
import { formatDate, formatDateTime, lookupKey } from '@/lib/formatters';
import { LivingAppsService } from '@/services/livingAppsService';
import {
  IconCalendarEvent,
  IconUsers,
  IconMapPin,
  IconAlertTriangle,
  IconPlus,
} from '@tabler/icons-react';

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
  const enrichedTeilnehmerAnmeldung = crud.enriched.teilnehmerAnmeldung;
  const totalParticipants = teilnehmerAnmeldung.length;

  const clock = useClock();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const todayStr = format(clock, 'yyyy-MM-dd');
  const weekEnd = format(addDays(clock, 7), 'yyyy-MM-dd');

  const todayEvents = useMemo(
    () => enrichedEventVerwaltung.filter(e => {
      if (!e.fields.event_datetime) return false;
      const d = e.fields.event_datetime.slice(0, 10);
      return d === todayStr;
    }),
    [enrichedEventVerwaltung, todayStr],
  );

  const upcomingEvents = useMemo(
    () => enrichedEventVerwaltung.filter(e => {
      if (!e.fields.event_datetime) return false;
      const d = e.fields.event_datetime.slice(0, 10);
      return d > todayStr && d <= weekEnd;
    }),
    [enrichedEventVerwaltung, todayStr, weekEnd],
  );

  const eventsWithoutLocation = useMemo(
    () => enrichedEventVerwaltung.filter(e => !e.fields.location),
    [enrichedEventVerwaltung],
  );

  const visibleEvents = useMemo(
    () =>
      categoryFilter
        ? enrichedEventVerwaltung.filter(e => lookupKey(e.fields.event_category) === categoryFilter)
        : enrichedEventVerwaltung,
    [enrichedEventVerwaltung, categoryFilter],
  );

  // Calendar events
  const calendarEvents = useMemo<CalendarEvent[]>(
    () =>
      visibleEvents
        .filter(e => !!e.fields.event_datetime)
        .map(e => {
          const catKey = lookupKey(e.fields.event_category);
          const tone =
            catKey === 'contest' ? 'primary' :
            catKey === 'workshop' ? 'success' :
            catKey === 'jam_session' ? 'warning' :
            'default';
          return {
            id: `event:${e.record_id}`,
            start: e.fields.event_datetime!.slice(0, 16),
            allDay: false,
            title: e.fields.event_title ?? tx('Ohne Titel'),
            subtitle: e.locationName || e.fields.event_category?.label,
            tone,
          };
        }),
    [visibleEvents],
  );

  // ─── ALL HOOKS ABOVE THIS LINE ───
  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;
  // ─── Plain derivations only below ───

  // Event-Drag-Reschedule (Datum ändern)
  async function handleEventDrop(eventId: string, newStart: string) {
    const rid = eventId.split(':')[1];
    if (!rid) return;
    const prev = eventVerwaltung.find(e => e.record_id === rid);
    if (!prev) return;
    setEventVerwaltung(evs =>
      evs.map(e =>
        e.record_id === rid
          ? { ...e, fields: { ...e.fields, event_datetime: newStart } }
          : e,
      ),
    );
    try {
      await LivingAppsService.updateEventVerwaltungEntry(rid, { event_datetime: newStart.slice(0, 16) });
      undoToast(
        tx`${prev.fields.event_title ?? ''} — ${tx('verschoben')}`,
        async () => {
          setEventVerwaltung(evs =>
            evs.map(e =>
              e.record_id === rid
                ? { ...e, fields: { ...e.fields, event_datetime: prev.fields.event_datetime } }
                : e,
            ),
          );
          await LivingAppsService.updateEventVerwaltungEntry(rid, {
            event_datetime: prev.fields.event_datetime?.slice(0, 16),
          });
        },
      );
    } catch {
      await fetchAll();
    }
  }

  // Kontextzeile
  const todayNames = namen(todayEvents.map(e => e.fields.event_title ?? ''));
  const contextLine = todayEvents.length > 0
    ? tx`Heute: ${todayNames}`
    : upcomingEvents.length > 0
    ? tx`${upcomingEvents.length} Events diese Woche — nächstes: ${upcomingEvents[0].fields.event_title ?? ''}`
    : tx('Noch keine Events geplant — leg los!');

  // Hero: Events ohne Ort sind ein dringendes Signal
  const hero =
    eventsWithoutLocation.length > 0 ? (
      <HeroBanner
        icon={<IconAlertTriangle size={18} />}
        action={{
          label: tx('Veranstaltungsort zuweisen'),
          onClick: () => crud.eventVerwaltung.openEdit(eventsWithoutLocation[0]),
        }}
      >
        <b>{namen(eventsWithoutLocation.map(e => e.fields.event_title ?? ''))}</b>{' '}
        {tx('ohne Veranstaltungsort')} — {eventsWithoutLocation.length === 1 ? tx('bitte ergänzen') : tx`${eventsWithoutLocation.length} Events betroffen`}
      </HeroBanner>
    ) : undefined;

  return (
    <div className="space-y-6">
      {/* Seitenkopf */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
            {gruss(clock)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground truncate">{contextLine}</p>
        </div>
        <button
          type="button"
          onClick={() => crud.eventVerwaltung.openCreate({})}
          className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          <IconPlus size={16} className="shrink-0" />
          <span className="hidden sm:inline">{tx('Event erstellen')}</span>
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={hero}
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Heute')}
              value={todayEvents.length}
              icon={<IconCalendarEvent size={16} />}
              tone={todayEvents.length > 0 ? 'primary' : 'default'}
            />
            <StatStripItem
              title={tx('Diese Woche')}
              value={upcomingEvents.length}
              icon={<IconCalendarEvent size={16} />}
              tone={upcomingEvents.length > 0 ? 'default' : 'default'}
            />
            <StatStripItem
              title={tx('Teilnehmer gesamt')}
              value={totalParticipants}
              icon={<IconUsers size={16} />}
            />
            <StatStripItem
              title={tx('Veranstaltungsorte')}
              value={skateparksVeranstaltungsorte.length}
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
              const rec = enrichedEventVerwaltung.find(e => e.record_id === rid);
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
              title={tx('Anstehende Events')}
              items={[...todayEvents, ...upcomingEvents].slice(0, 8).map(e => ({
                id: e.record_id,
                title: e.fields.event_title ?? tx('Ohne Titel'),
                secondLine: (
                  <>
                    <span className="text-muted-foreground">
                      {e.fields.event_datetime ? formatDateTime(e.fields.event_datetime) : '—'}
                    </span>
                    {e.locationName && (
                      <span className="text-muted-foreground"> · {e.locationName}</span>
                    )}
                  </>
                ),
                action: {
                  label: tx('Anmeldung'),
                  onClick: () =>
                    crud.teilnehmerAnmeldung.openCreate({ event: e.record_id }),
                },
              }))}
              onItemClick={id => {
                const rec = enrichedEventVerwaltung.find(e => e.record_id === id);
                if (rec) crud.eventVerwaltung.openDetail(rec);
              }}
              empty={{
                text: tx('Keine Events diese Woche — erstell dein erstes Event'),
                action: {
                  label: tx('Event erstellen'),
                  onClick: () => crud.eventVerwaltung.openCreate({}),
                },
              }}
            />
            <ChartWidget
              title={tx('Events nach Kategorie')}
              rows={enrichedEventVerwaltung.map(e => ({
                id: `event:${e.record_id}`,
                data: e,
              }))}
              dimension={{
                kind: 'category',
                accessor: r => r.data.fields.event_category,
              }}
              interaction={{
                mode: 'filter',
                selectedKey: categoryFilter,
                onSelect: seg => setCategoryFilter(seg ? seg.key : null),
              }}
            />
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
