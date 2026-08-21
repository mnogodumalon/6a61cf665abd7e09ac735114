import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface SkateparksVeranstaltungsorte {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    location_name?: string;
    street?: string;
    house_number?: string;
    postal_code?: string;
    city?: string;
    description?: string;
    special_notes?: string;
    location_photo?: string;
  };
}

export interface EventVerwaltung {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    event_title?: string;
    event_description?: string;
    event_category?: LookupValue;
    event_datetime?: string; // Format: YYYY-MM-DD oder ISO String
    skill_level?: LookupValue;
    max_participants?: number;
    entry_fee?: number;
    location?: string; // applookup -> URL zu 'SkateparksVeranstaltungsorte' Record
    organizer_firstname?: string;
    organizer_lastname?: string;
    organizer_email?: string;
    organizer_phone?: string;
    event_flyer?: string;
  };
}

export interface TeilnehmerAnmeldung {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    emergency_contact_email?: string;
    event?: string; // applookup -> URL zu 'EventVerwaltung' Record
    participant_firstname?: string;
    participant_lastname?: string;
    participant_email?: string;
    participant_phone?: string;
    date_of_birth?: string; // Format: YYYY-MM-DD oder ISO String
    participant_skill_level?: LookupValue;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    tshirt_size?: LookupValue;
    waiver_accepted?: boolean;
  };
}

export const APP_IDS = {
  SKATEPARKS_VERANSTALTUNGSORTE: '6a61cf45b2071fe2be39980d',
  EVENT_VERWALTUNG: '6a61cf4d2c69a785bf2f447f',
  TEILNEHMER_ANMELDUNG: '6a61cf4f03b573eb0707b89e',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'event_verwaltung': {
    event_category: [{ key: "jam_session", get label() { return lookupLabel('event_verwaltung', 'event_category', "jam_session") ?? "Jam Session"; } }, { key: "demo", get label() { return lookupLabel('event_verwaltung', 'event_category', "demo") ?? "Demo"; } }, { key: "contest", get label() { return lookupLabel('event_verwaltung', 'event_category', "contest") ?? "Contest"; } }, { key: "workshop", get label() { return lookupLabel('event_verwaltung', 'event_category', "workshop") ?? "Workshop"; } }, { key: "sonstiges", get label() { return lookupLabel('event_verwaltung', 'event_category', "sonstiges") ?? "Sonstiges"; } }],
    skill_level: [{ key: "beginner", get label() { return lookupLabel('event_verwaltung', 'skill_level', "beginner") ?? "Anfänger"; } }, { key: "intermediate", get label() { return lookupLabel('event_verwaltung', 'skill_level', "intermediate") ?? "Fortgeschrittene"; } }, { key: "advanced", get label() { return lookupLabel('event_verwaltung', 'skill_level', "advanced") ?? "Profis"; } }, { key: "all_levels", get label() { return lookupLabel('event_verwaltung', 'skill_level', "all_levels") ?? "Alle Levels"; } }],
  },
  'teilnehmer_anmeldung': {
    participant_skill_level: [{ key: "beginner", get label() { return lookupLabel('teilnehmer_anmeldung', 'participant_skill_level', "beginner") ?? "Anfänger"; } }, { key: "intermediate", get label() { return lookupLabel('teilnehmer_anmeldung', 'participant_skill_level', "intermediate") ?? "Fortgeschrittene"; } }, { key: "advanced", get label() { return lookupLabel('teilnehmer_anmeldung', 'participant_skill_level', "advanced") ?? "Profi"; } }],
    tshirt_size: [{ key: "xs", get label() { return lookupLabel('teilnehmer_anmeldung', 'tshirt_size', "xs") ?? "XS"; } }, { key: "s", get label() { return lookupLabel('teilnehmer_anmeldung', 'tshirt_size', "s") ?? "S"; } }, { key: "m", get label() { return lookupLabel('teilnehmer_anmeldung', 'tshirt_size', "m") ?? "M"; } }, { key: "l", get label() { return lookupLabel('teilnehmer_anmeldung', 'tshirt_size', "l") ?? "L"; } }, { key: "xl", get label() { return lookupLabel('teilnehmer_anmeldung', 'tshirt_size', "xl") ?? "XL"; } }, { key: "xxl", get label() { return lookupLabel('teilnehmer_anmeldung', 'tshirt_size', "xxl") ?? "XXL"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'skateparks_veranstaltungsorte': {
    'location_name': 'string/text',
    'street': 'string/text',
    'house_number': 'string/text',
    'postal_code': 'string/text',
    'city': 'string/text',
    'description': 'string/textarea',
    'special_notes': 'string/textarea',
    'location_photo': 'file',
  },
  'event_verwaltung': {
    'event_title': 'string/text',
    'event_description': 'string/textarea',
    'event_category': 'lookup/select',
    'event_datetime': 'date/datetimeminute',
    'skill_level': 'lookup/select',
    'max_participants': 'number',
    'entry_fee': 'number',
    'location': 'applookup/select',
    'organizer_firstname': 'string/text',
    'organizer_lastname': 'string/text',
    'organizer_email': 'string/email',
    'organizer_phone': 'string/tel',
    'event_flyer': 'file',
  },
  'teilnehmer_anmeldung': {
    'emergency_contact_email': 'string/email',
    'event': 'applookup/select',
    'participant_firstname': 'string/text',
    'participant_lastname': 'string/text',
    'participant_email': 'string/email',
    'participant_phone': 'string/tel',
    'date_of_birth': 'date/date',
    'participant_skill_level': 'lookup/select',
    'emergency_contact_name': 'string/text',
    'emergency_contact_phone': 'string/tel',
    'tshirt_size': 'lookup/select',
    'waiver_accepted': 'bool',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

// Aliases for the pre-0.0.279 app keys (see 4c).
LOOKUP_OPTIONS['skateparks_&_veranstaltungsorte'] = LOOKUP_OPTIONS['skateparks_veranstaltungsorte'];
FIELD_TYPES['skateparks_&_veranstaltungsorte'] = FIELD_TYPES['skateparks_veranstaltungsorte'];

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateSkateparksVeranstaltungsorte = StripLookup<SkateparksVeranstaltungsorte['fields']>;
export type CreateEventVerwaltung = StripLookup<EventVerwaltung['fields']>;
export type CreateTeilnehmerAnmeldung = StripLookup<TeilnehmerAnmeldung['fields']>;