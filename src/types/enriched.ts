import type { EventVerwaltung, TeilnehmerAnmeldung } from './app';

export type EnrichedEventVerwaltung = EventVerwaltung & {
  locationName: string;
};

export type EnrichedTeilnehmerAnmeldung = TeilnehmerAnmeldung & {
  eventName: string;
};
