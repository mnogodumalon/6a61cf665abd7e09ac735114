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
  createdat: string;
  updatedat: string | null;
  fields: {
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
    event_category: [{ key: "contest", label: "Contest" }, { key: "jam_session", label: "Jam Session" }, { key: "demo", label: "Demo" }, { key: "workshop", label: "Workshop" }, { key: "sonstiges", label: "Sonstiges" }],
    skill_level: [{ key: "beginner", label: "Anfänger" }, { key: "intermediate", label: "Fortgeschrittene" }, { key: "advanced", label: "Profis" }, { key: "all_levels", label: "Alle Levels" }],
  },
  'teilnehmer_anmeldung': {
    participant_skill_level: [{ key: "intermediate", label: "Fortgeschrittene" }, { key: "advanced", label: "Profi" }, { key: "beginner", label: "Anfänger" }],
    tshirt_size: [{ key: "xs", label: "XS" }, { key: "s", label: "S" }, { key: "m", label: "M" }, { key: "l", label: "L" }, { key: "xl", label: "XL" }, { key: "xxl", label: "XXL" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'skateparks_&_veranstaltungsorte': {
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

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateSkateparksVeranstaltungsorte = StripLookup<SkateparksVeranstaltungsorte['fields']>;
export type CreateEventVerwaltung = StripLookup<EventVerwaltung['fields']>;
export type CreateTeilnehmerAnmeldung = StripLookup<TeilnehmerAnmeldung['fields']>;