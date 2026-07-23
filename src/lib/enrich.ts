import type { EnrichedEventVerwaltung, EnrichedTeilnehmerAnmeldung } from '@/types/enriched';
import type { EventVerwaltung, SkateparksVeranstaltungsorte, TeilnehmerAnmeldung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface EventVerwaltungMaps {
  skateparksVeranstaltungsorteMap: Map<string, SkateparksVeranstaltungsorte>;
}

export function enrichEventVerwaltung(
  eventVerwaltung: EventVerwaltung[],
  maps: EventVerwaltungMaps
): EnrichedEventVerwaltung[] {
  return eventVerwaltung.map(r => ({
    ...r,
    locationName: resolveDisplay(r.fields.location, maps.skateparksVeranstaltungsorteMap, 'location_name'),
  }));
}

interface TeilnehmerAnmeldungMaps {
  eventVerwaltungMap: Map<string, EventVerwaltung>;
}

export function enrichTeilnehmerAnmeldung(
  teilnehmerAnmeldung: TeilnehmerAnmeldung[],
  maps: TeilnehmerAnmeldungMaps
): EnrichedTeilnehmerAnmeldung[] {
  return teilnehmerAnmeldung.map(r => ({
    ...r,
    eventName: resolveDisplay(r.fields.event, maps.eventVerwaltungMap, 'event_title'),
  }));
}
