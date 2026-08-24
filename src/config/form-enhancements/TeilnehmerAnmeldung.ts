import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ['event', { row: ['participant_firstname', 'participant_lastname'], cols: '1fr 1fr' }, 'participant_email', 'participant_phone', 'date_of_birth', 'participant_skill_level', 'tshirt_size', { row: ['emergency_contact_name', 'emergency_contact_phone'], cols: '1fr 1fr' }, 'emergency_contact_email', 'waiver_accepted'],
  defaults: {
    waiver_accepted: { kind: 'literal', value: false },
  },
  computed: {},
};

// Build-time-populated field dependencies for MODUS-2 arrow functions in
// `computed`. The sub-agent leaves this empty; scripts/parse-formulas.mjs
// fills it after Step 0 by regex-extracting ctx.* calls from each function
// body. The dialog feeds these into classifyComputed so MODUS-2 entries get
// inline anchors instead of always landing in the aggregate section.
export const computedDeps: Record<string, string[]> = {};

// Build-time-populated applookup (ownKey → lookupKey) pairs found in MODUS-2
// arrow functions. Filled by scripts/parse-formulas.mjs from regex matches
// on `ctx.applookup('x','y')` and `ctx.applookupAny('x','y')`. The dialog
// merges this with MODUS-1 refs extracted at render time, so every numeric
// field the formula pulls from a selected lookup is surfaced as an inline
// hint next to the lookup combobox.
export const computedApplookupRefs: Record<string, { lookupKey: string }[]> = {};
