import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'event_title',
    'event_description',
    'event_category',
    'event_datetime',
    'skill_level',
    'max_participants',
    'entry_fee',
    'location',
    { row: ['organizer_firstname', 'organizer_lastname'] },
    'organizer_email',
    'organizer_phone',
    'organizer_notes',
  ],
  defaults: {
    'event_datetime': { kind: 'today', withTime: true },
    'event_category': { kind: 'lookup', key: 'jam_session', label: 'Jam Session' },
    'skill_level': { kind: 'lookup', key: 'all_levels', label: 'Alle Levels' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};

export const computedApplookupRefs: Record<string, { lookupKey: string }[]> = {};
