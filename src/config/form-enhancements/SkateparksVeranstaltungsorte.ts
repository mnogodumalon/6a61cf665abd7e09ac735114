import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'location_name',
    { row: ['street', 'house_number'], cols: '2fr 1fr' },
    { row: ['postal_code', 'city'], cols: '1fr 2fr' },
    'description',
    'special_notes',
  ],
  defaults: {},
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};

export const computedApplookupRefs: Record<string, { lookupKey: string }[]> = {};
