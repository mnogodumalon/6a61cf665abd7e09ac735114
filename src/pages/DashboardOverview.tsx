import { useMemo, useState } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { APP_IDS, LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { lookupKey } from '@/lib/formatters';
import { DashboardSkeleton, DashboardError } from '@/components/DashboardStates';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { KanbanWidget, type KanbanCard, type KanbanColumn, type KanbanTone } from '@/components/widgets/KanbanWidget';
import { tx, appLabel } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import {
  IconCalendarEvent,
  IconUsers,
  IconMapPin,
  IconTrophy,
  IconPlus,
} from '@tabler/icons-react';

function toneForCategory(cat: string | undefined): KanbanTone {
  if (cat === 'contest') return 'destructive';
  if (cat === 'workshop') return 'primary';
  if (cat === 'jam_session') return 'success';
  if (cat === 'demo') return 'warning';
  return 'default';
}

export default function DashboardOverview() {
  const data = useDashboardData();
  const {
    skateparksVeranstaltungsorte,
    eventVerwaltung,
    teilnehmerAnmeldung,
    setEventVerwaltung,
    skateparksVeranstaltungsorteMap,
    eventVerwaltungMap,
    loading, error, fetchAll,
  } = data;

  const crud = useEntityCrud(data);
  const enrichedEventVerwaltung = crud.enriched.eventVerwaltung;
  const enrichedTeilnehmerAnmeldung = crud.enriched.teilnehmerAnmeldung;

  const clock = useClock();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // KPI derivations — all hooks above early returns
  const totalEvents = eventVerwaltung.length;
  const totalParticipants = teilnehmerAnmeldung.length;
  const totalLocations = skateparksVeranstaltungsorte.length;
  const contests = useMemo(
    () => eventVerwaltung.filter(e => lookupKey(e.fields.event_category) === 'contest'),
    [eventVerwaltung]
  );

  // Registrations in last 7 days
  const recentRegistrations = useMemo(() => {
    const cutoff = new Date(clock);
    cutoff.setDate(cutoff.getDate() - 7);
    return enrichedTeilnehmerAnmeldung.filter(t => new Date(t.createdat) >= cutoff);
  }, [enrichedTeilnehmerAnmeldung, clock]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  // Columns from schema — inside component body so locale-aware labels work
  const columns: KanbanColumn[] = (LOOKUP_OPTIONS['event_verwaltung']?.['event_category'] ?? []).map(o => ({
    key: o.key,
    label: o.label,
    tone: toneForCategory(o.key),
  }));

  const filteredEvents = categoryFilter
    ? enrichedEventVerwaltung.filter(e => lookupKey(e.fields.event_category) === categoryFilter)
    : enrichedEventVerwaltung;

  const cards: KanbanCard[] = enrichedEventVerwaltung.map(e => ({
    id: `event:${e.record_id}`,
    column: lookupKey(e.fields.event_category) ?? '',
    title: e.fields.event_title ?? tx('Ohne Titel'),
    subtitle: e.locationName
      ? <span className="flex items-center gap-1 text-xs text-muted-foreground"><IconMapPin size={11} className="shrink-0" />{e.locationName}</span>
      : e.fields.event_datetime
        ? <span className="text-xs text-muted-foreground">{e.fields.event_datetime}</span>
        : undefined,
    tone: toneForCategory(lookupKey(e.fields.event_category)),
  }));

  // Recent registrations for aside
  const recentRegItems = enrichedTeilnehmerAnmeldung
    .slice()
    .sort((a, b) => (b.createdat ?? '').localeCompare(a.createdat ?? ''))
    .slice(0, 8)
    .map(t => ({
      id: t.record_id,
      title: `${t.fields.participant_firstname ?? ''} ${t.fields.participant_lastname ?? ''}`.trim() || tx('Unbekannt'),
      secondLine: (
        <span className="text-muted-foreground text-sm">
          {t.eventName || appLabel('event_verwaltung')}
          {t.fields.participant_skill_level?.label
            ? ` · ${t.fields.participant_skill_level.label}`
            : ''}
        </span>
      ),
    }));

  // Events with participants count for aside
  const eventsWithCount = enrichedEventVerwaltung
    .map(e => ({
      event: e,
      count: teilnehmerAnmeldung.filter(t => {
        const id = t.fields.event?.split('/').pop();
        return id === e.record_id;
      }).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const grussText = gruss(clock);
  const contestNames = namen(contests.map(e => e.fields.event_title ?? ''));
  const contextLine = totalEvents === 0
    ? tx('Leg dein erstes Event an und starte durch.')
    : contests.length > 0
      ? tx`${contestNames} — Contests in der Pipeline.`
      : tx`${totalEvents} Events aktiv, ${totalParticipants} Anmeldungen insgesamt.`;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{grussText}</h1>
          <p className="text-muted-foreground mt-1">{contextLine}</p>
        </div>
        <button
          className="shrink-0 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          onClick={() => crud.eventVerwaltung.openCreate({})}
        >
          <IconPlus size={16} className="shrink-0" />
          {tx('Neues Event')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Events gesamt')}
              value={totalEvents}
              icon={<IconCalendarEvent size={16} />}
              tone="default"
            />
            <StatStripItem
              title={tx('Anmeldungen')}
              value={totalParticipants}
              icon={<IconUsers size={16} />}
              tone={totalParticipants > 0 ? 'primary' : 'default'}
            />
            <StatStripItem
              title={tx('Veranstaltungsorte')}
              value={totalLocations}
              icon={<IconMapPin size={16} />}
              tone="default"
            />
            <StatStripItem
              title={tx('Neu (7 Tage)')}
              value={recentRegistrations.length}
              icon={<IconTrophy size={16} />}
              tone={recentRegistrations.length > 0 ? 'success' : 'default'}
            />
          </StatStrip>
        }
        primary={
          totalEvents === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center rounded-xl border border-dashed border-border">
              <IconCalendarEvent size={48} className="text-muted-foreground" stroke={1.5} />
              <div>
                <p className="font-semibold text-foreground">{tx('Noch keine Events')}</p>
                <p className="text-muted-foreground text-sm mt-1">{tx('Erstelle dein erstes Skateboard-Event.')}</p>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                onClick={() => crud.eventVerwaltung.openCreate({})}
              >
                <IconPlus size={16} className="shrink-0" />
                {tx('Erstes Event anlegen')}
              </button>
            </div>
          ) : (
            <KanbanWidget
              columns={columns}
              cards={cards}
              onCardClick={card => {
                const id = card.id.split(':')[1] ?? '';
                const rec = eventVerwaltung.find(e => e.record_id === id);
                if (rec) crud.eventVerwaltung.openDetail(rec);
              }}
              onCardMove={async (cardId, newColumn) => {
                const id = cardId.split(':')[1] ?? '';
                const rec = eventVerwaltung.find(e => e.record_id === id);
                if (!rec) return;
                const prev = rec.fields.event_category;
                const newLookup = lookupOption('event_verwaltung', 'event_category', newColumn);
                setEventVerwaltung(prev =>
                  prev.map(e => e.record_id === id
                    ? { ...e, fields: { ...e.fields, event_category: newLookup } }
                    : e
                  )
                );
                try {
                  await LivingAppsService.updateEventVerwaltungEntry(id, { event_category: newColumn });
                  undoToast(
                    tx`${rec.fields.event_title ?? ''} — Kategorie geändert`,
                    () => {
                      setEventVerwaltung(cur =>
                        cur.map(e => e.record_id === id
                          ? { ...e, fields: { ...e.fields, event_category: prev } }
                          : e
                        )
                      );
                      void LivingAppsService.updateEventVerwaltungEntry(id, {
                        event_category: prev ? (typeof prev === 'object' && 'key' in prev ? prev.key : String(prev)) : undefined,
                      });
                    }
                  );
                } catch {
                  await fetchAll();
                }
              }}
              onAddCard={column => {
                crud.eventVerwaltung.openCreate({ event_category: column });
              }}
            />
          )
        }
        aside={
          <>
            <WorkList
              title={tx('Top Events nach Anmeldungen')}
              items={eventsWithCount.map(({ event: e, count }) => ({
                id: e.record_id,
                title: e.fields.event_title ?? tx('Unbekannt'),
                secondLine: (
                  <span className="text-muted-foreground text-sm">
                    <span className="font-medium text-foreground">{count}</span>
                    {' '}{tx('Anmeldungen')}
                    {e.locationName ? ` · ${e.locationName}` : ''}
                  </span>
                ),
              }))}
              onItemClick={id => {
                const rec = eventVerwaltung.find(e => e.record_id === id);
                if (rec) crud.eventVerwaltung.openDetail(rec);
              }}
              empty={{ text: tx('Noch keine Events mit Anmeldungen.'), action: { label: tx('Event anlegen'), onClick: () => crud.eventVerwaltung.openCreate({}) } }}
            />
            <WorkList
              title={tx('Neue Anmeldungen')}
              items={recentRegItems.map(item => ({
                ...item,
              }))}
              onItemClick={id => {
                const rec = teilnehmerAnmeldung.find(t => t.record_id === id);
                if (rec) crud.teilnehmerAnmeldung.openDetail(rec);
              }}
              empty={{ text: tx('Noch keine Anmeldungen eingegangen.'), action: { label: tx('Anmeldung erfassen'), onClick: () => crud.teilnehmerAnmeldung.openCreate({}) } }}
            />
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
