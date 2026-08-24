import type { EventVerwaltung, TeilnehmerAnmeldung } from './app';

export type EnrichedTeilnehmerAnmeldung = TeilnehmerAnmeldung & {
  eventName: string;
};

export type EnrichedEventVerwaltung = EventVerwaltung & {
  locationName: string;
};
