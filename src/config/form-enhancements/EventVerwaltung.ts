import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'event_title',
    'event_category',
    'event_datetime',
    'skill_level',
    'location',
    'max_participants',
    'entry_fee',
    { row: ['organizer_firstname', 'organizer_lastname'] },
    'organizer_email',
    'organizer_phone',
    'event_description',
  ],
  defaults: {
    'event_datetime': { kind: 'today', withTime: true },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};

export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
