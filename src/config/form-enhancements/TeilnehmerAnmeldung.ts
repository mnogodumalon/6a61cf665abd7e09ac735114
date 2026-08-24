import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'event',
    { row: ['participant_firstname', 'participant_lastname'] },
    'participant_email',
    'participant_phone',
    'date_of_birth',
    'participant_skill_level',
    'emergency_contact_name',
    'emergency_contact_phone',
    'emergency_contact_email',
    'tshirt_size',
    'waiver_accepted',
  ],
  defaults: {
    'waiver_accepted': { kind: 'literal', value: false },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};

export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
