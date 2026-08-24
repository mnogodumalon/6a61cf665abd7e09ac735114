import { useState, useMemo } from 'react';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { DashboardSkeleton, DashboardError } from '@/components/DashboardStates';
import { DashboardGrid } from '@/components/DashboardGrid';
import { WorkList } from '@/components/WorkList';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { CalendarWidget, type CalendarEvent } from '@/components/widgets/CalendarWidget';
import { ChartWidget, type ChartRow } from '@/components/widgets/ChartWidget';
import { tx, dateFnsLocale, appLabel, fieldLabel } from '@/i18n';
import { gruss, useClock, namen, undoToast } from '@/lib/polish';
import { formatDate, formatDateTime, lookupKey } from '@/lib/formatters';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { EnrichedEventVerwaltung } from '@/types/enriched';
import {
  IconCalendar,
  IconUsers,
  IconMapPin,
  IconChartBar,
  IconPlus,
} from '@tabler/icons-react';

export default function DashboardOverview() {
  const data = useDashboardData();
  const {
    skateparksVeranstaltungsorte,
    eventVerwaltung,
    teilnehmerAnmeldung,
    skateparksVeranstaltungsorteMap,
    setEventVerwaltung,
    loading,
    error,
    fetchAll,
  } = data;

  const crud = useEntityCrud(data);
  const enrichedEventVerwaltung = crud.enriched.eventVerwaltung as EnrichedEventVerwaltung[];
  const enrichedTeilnehmerAnmeldung = crud.enriched.teilnehmerAnmeldung;

  const clock = useClock();
  const [categoryFilter, setCategoryFilter] = useState<import('@/components/widgets/ChartWidget').ChartSegment<EnrichedEventVerwaltung> | null>(null);

  // Events in the future (upcoming)
  const todayStr = format(clock, 'yyyy-MM-dd');

  const upcomingEvents = useMemo(() =>
    enrichedEventVerwaltung.filter(e =>
      e.fields.event_datetime && e.fields.event_datetime >= todayStr
    ).sort((a, b) => (a.fields.event_datetime ?? '').localeCompare(b.fields.event_datetime ?? '')),
    [enrichedEventVerwaltung, todayStr]
  );

  const nextEvent = upcomingEvents[0];

  // Events in the next 7 days
  const in7Days = format(addDays(clock, 7), 'yyyy-MM-dd');
  const eventsThisWeek = useMemo(() =>
    enrichedEventVerwaltung.filter(e =>
      e.fields.event_datetime &&
      e.fields.event_datetime >= todayStr &&
      e.fields.event_datetime <= in7Days
    ),
    [enrichedEventVerwaltung, todayStr, in7Days]
  );

  // Anmeldungen für upcoming Events
  const upcomingEventIds = useMemo(() => new Set(upcomingEvents.map(e => e.record_id)), [upcomingEvents]);

  const anmeldungenFuerUpcoming = useMemo(() =>
    enrichedTeilnehmerAnmeldung.filter(a => {
      const id = extractRecordId(a.fields.event);
      return id ? upcomingEventIds.has(id) : false;
    }),
    [enrichedTeilnehmerAnmeldung, upcomingEventIds]
  );

  // Map events to CalendarEvents
  const calendarEvents: CalendarEvent[] = useMemo(() =>
    enrichedEventVerwaltung.flatMap(e => {
      if (!e.fields.event_datetime) return [];
      const catKey = lookupKey(e.fields.event_category);
      const toneMap: Record<string, 'primary' | 'success' | 'warning' | 'default' | 'destructive'> = {
        contest: 'destructive',
        jam_session: 'primary',
        demo: 'success',
        workshop: 'warning',
        sonstiges: 'default',
      };
      return [{
        id: `event:${e.record_id}`,
        start: e.fields.event_datetime,
        title: e.fields.event_title ?? tx('Ohne Titel'),
        subtitle: e.locationName || e.fields.event_category?.label,
        tone: toneMap[catKey ?? ''] ?? 'default',
      }];
    }),
    [enrichedEventVerwaltung]
  );

  // ChartWidget rows für Kategorien
  const chartRows: ChartRow<EnrichedEventVerwaltung>[] = useMemo(() =>
    enrichedEventVerwaltung.map(e => ({
      id: `event_verwaltung:${e.record_id}`,
      data: e,
    })),
    [enrichedEventVerwaltung]
  );

  // Anmeldungen in upcoming WorkList: sortiert nach Event-Datum
  const neuesteAnmeldungen = useMemo(() =>
    [...enrichedTeilnehmerAnmeldung]
      .sort((a, b) => (b.createdat ?? '').localeCompare(a.createdat ?? ''))
      .slice(0, 8),
    [enrichedTeilnehmerAnmeldung]
  );

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  // ─── Derivations only below this line ───

  const totalEvents = enrichedEventVerwaltung.length;
  const totalAnmeldungen = teilnehmerAnmeldung.length;
  const totalOrte = skateparksVeranstaltungsorte.length;

  const contextLine = nextEvent
    ? tx`Nächstes Event: ${nextEvent.fields.event_title ?? ''} am ${formatDateTime(nextEvent.fields.event_datetime)}`
    : tx`Noch keine Events geplant — leg das erste an!`;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {gruss(clock)} 🛹
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{contextLine}</p>
        </div>
        <button
          onClick={() => crud.eventVerwaltung.openCreate({})}
          className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
        >
          <IconPlus size={16} className="shrink-0" />
          {tx('Event anlegen')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Events diese Woche')}
              value={eventsThisWeek.length}
              icon={<IconCalendar size={16} />}
              tone={eventsThisWeek.length > 0 ? 'primary' : 'default'}
            />
            <StatStripItem
              title={tx('Anmeldungen gesamt')}
              value={totalAnmeldungen}
              icon={<IconUsers size={16} />}
              tone={totalAnmeldungen > 0 ? 'success' : 'default'}
            />
            <StatStripItem
              title={tx('Veranstaltungsorte')}
              value={totalOrte}
              icon={<IconMapPin size={16} />}
            />
            <StatStripItem
              title={tx('Events gesamt')}
              value={totalEvents}
              icon={<IconChartBar size={16} />}
            />
          </StatStrip>
        }
        primary={
          <CalendarWidget
            events={calendarEvents}
            locale={dateFnsLocale()}
            defaultView="month"
            onEventClick={(ev) => {
              const id = ev.id.split(':')[1] ?? '';
              const record = enrichedEventVerwaltung.find(e => e.record_id === id);
              if (record) crud.eventVerwaltung.openDetail(record);
            }}
            onEmptyClick={(date) => {
              crud.eventVerwaltung.openCreate({
                event_datetime: format(date, "yyyy-MM-dd'T'HH:mm"),
              });
            }}
            onEventDrop={async (eventId, newStart) => {
              const id = eventId.split(':')[1] ?? '';
              const record = enrichedEventVerwaltung.find(e => e.record_id === id);
              if (!record) return;
              const oldVal = record.fields.event_datetime;
              // Optimistic update
              setEventVerwaltung(prev =>
                prev.map(e => e.record_id === id
                  ? { ...e, fields: { ...e.fields, event_datetime: newStart } }
                  : e
                )
              );
              try {
                await LivingAppsService.updateEventVerwaltungEntry(id, { event_datetime: newStart });
                undoToast(
                  tx`${record.fields.event_title ?? ''} — verschoben`,
                  () => {
                    setEventVerwaltung(prev =>
                      prev.map(e => e.record_id === id
                        ? { ...e, fields: { ...e.fields, event_datetime: oldVal } }
                        : e
                      )
                    );
                    LivingAppsService.updateEventVerwaltungEntry(id, { event_datetime: oldVal }).catch(() => fetchAll());
                  }
                );
              } catch {
                fetchAll();
              }
            }}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Neueste Anmeldungen')}
              items={neuesteAnmeldungen.map(a => ({
                id: a.record_id,
                title: [a.fields.participant_firstname, a.fields.participant_lastname].filter(Boolean).join(' ') || tx('Unbekannt'),
                secondLine: (
                  <span className="text-muted-foreground text-xs">
                    {a.eventName || tx('Kein Event')}
                    {a.fields.participant_skill_level && (
                      <> · <span className="font-medium">{a.fields.participant_skill_level.label}</span></>
                    )}
                  </span>
                ),
                action: {
                  label: tx('Details'),
                  onClick: () => crud.teilnehmerAnmeldung.openDetail(a),
                },
              }))}
              onItemClick={(id) => {
                const a = enrichedTeilnehmerAnmeldung.find(r => r.record_id === id);
                if (a) crud.teilnehmerAnmeldung.openDetail(a);
              }}
              empty={{
                text: tx('Noch keine Anmeldungen — Events anlegen und Teilnehmer einladen!'),
                action: {
                  label: tx('Erste Anmeldung'),
                  onClick: () => crud.teilnehmerAnmeldung.openCreate({}),
                },
              }}
            />

            <ChartWidget
              title={tx('Events nach Kategorie')}
              rows={chartRows}
              dimension={{
                kind: 'category',
                accessor: (r) => r.data.fields.event_category,
                label: fieldLabel('event_verwaltung', 'event_category'),
              }}
              interaction={{
                mode: 'filter',
                selectedKey: categoryFilter?.key ?? null,
                onSelect: setCategoryFilter,
              }}
            />
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
