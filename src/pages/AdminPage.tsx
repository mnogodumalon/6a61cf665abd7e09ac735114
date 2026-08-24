import { useState, useMemo, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { SkateparksVeranstaltungsorte, TeilnehmerAnmeldung, EventVerwaltung } from '@/types/app';
import { LivingAppsService, extractRecordId, cleanFieldsForApi } from '@/services/livingAppsService';
import { SkateparksVeranstaltungsorteDialog } from '@/components/dialogs/SkateparksVeranstaltungsorteDialog';
import { SkateparksVeranstaltungsorteViewDialog } from '@/components/dialogs/SkateparksVeranstaltungsorteViewDialog';
import { TeilnehmerAnmeldungDialog } from '@/components/dialogs/TeilnehmerAnmeldungDialog';
import { TeilnehmerAnmeldungViewDialog } from '@/components/dialogs/TeilnehmerAnmeldungViewDialog';
import { EventVerwaltungDialog } from '@/components/dialogs/EventVerwaltungDialog';
import { EventVerwaltungViewDialog } from '@/components/dialogs/EventVerwaltungViewDialog';
import { BulkEditDialog } from '@/components/dialogs/BulkEditDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconPencil, IconTrash, IconPlus, IconFilter, IconX, IconArrowsUpDown, IconArrowUp, IconArrowDown, IconSearch, IconCopy, IconFileText } from '@tabler/icons-react';
import { t, appLabel, fieldLabels, lookupLabel, dateFnsLocale, dateFormat } from '@/i18n';
import { format, parseISO } from 'date-fns';

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), dateFormat(), { locale: dateFnsLocale() }); } catch { return d; }
}

// Field metadata per entity for bulk edit and column filters. `label` is the
// BUILD-language fallback only — getFieldMeta() re-labels every entry (and every
// lookup option) through the runtime catalog before anything renders it.
const SKATEPARKSVERANSTALTUNGSORTE_FIELDS = [
  { key: 'location_name', label: 'Name des Veranstaltungsorts', type: 'string/text' },
  { key: 'street', label: 'Straße', type: 'string/text' },
  { key: 'house_number', label: 'Hausnummer', type: 'string/text' },
  { key: 'postal_code', label: 'Postleitzahl', type: 'string/text' },
  { key: 'city', label: 'Stadt', type: 'string/text' },
  { key: 'description', label: 'Beschreibung', type: 'string/textarea' },
  { key: 'special_notes', label: 'Besondere Hinweise', type: 'string/textarea' },
  { key: 'location_photo', label: 'Foto des Veranstaltungsorts', type: 'file' },
];
const TEILNEHMERANMELDUNG_FIELDS = [
  { key: 'emergency_contact_email', label: 'E-Mail-Adresse des Notfallkontakts', type: 'string/email' },
  { key: 'event', label: 'Event', type: 'applookup/select', targetEntity: 'event_verwaltung', targetAppId: 'EVENT_VERWALTUNG', displayField: 'event_title' },
  { key: 'participant_firstname', label: 'Vorname', type: 'string/text' },
  { key: 'participant_lastname', label: 'Nachname', type: 'string/text' },
  { key: 'participant_email', label: 'E-Mail-Adresse', type: 'string/email' },
  { key: 'participant_phone', label: 'Telefonnummer', type: 'string/tel' },
  { key: 'date_of_birth', label: 'Geburtsdatum', type: 'date/date' },
  { key: 'participant_skill_level', label: 'Eigener Schwierigkeitsgrad', type: 'lookup/select', options: [{ key: 'beginner', label: 'Anfänger' }, { key: 'intermediate', label: 'Fortgeschrittene' }, { key: 'advanced', label: 'Profi' }] },
  { key: 'emergency_contact_name', label: 'Name des Notfallkontakts', type: 'string/text' },
  { key: 'emergency_contact_phone', label: 'Telefonnummer des Notfallkontakts', type: 'string/tel' },
  { key: 'tshirt_size', label: 'T-Shirt-Größe', type: 'lookup/select', options: [{ key: 'xs', label: 'XS' }, { key: 's', label: 'S' }, { key: 'm', label: 'M' }, { key: 'l', label: 'L' }, { key: 'xl', label: 'XL' }, { key: 'xxl', label: 'XXL' }] },
  { key: 'waiver_accepted', label: 'Ich akzeptiere die Teilnahmebedingungen', type: 'bool' },
];
const EVENTVERWALTUNG_FIELDS = [
  { key: 'event_title', label: 'Titel des Events', type: 'string/text' },
  { key: 'event_description', label: 'Beschreibung', type: 'string/textarea' },
  { key: 'event_category', label: 'Kategorie', type: 'lookup/select', options: [{ key: 'contest', label: 'Contest' }, { key: 'jam_session', label: 'Jam Session' }, { key: 'demo', label: 'Demo' }, { key: 'workshop', label: 'Workshop' }, { key: 'sonstiges', label: 'Sonstiges' }] },
  { key: 'event_datetime', label: 'Datum und Uhrzeit', type: 'date/datetimeminute' },
  { key: 'skill_level', label: 'Schwierigkeitsgrad', type: 'lookup/select', options: [{ key: 'beginner', label: 'Anfänger' }, { key: 'intermediate', label: 'Fortgeschrittene' }, { key: 'advanced', label: 'Profis' }, { key: 'all_levels', label: 'Alle Levels' }] },
  { key: 'max_participants', label: 'Maximale Teilnehmerzahl', type: 'number' },
  { key: 'entry_fee', label: 'Startgebühr (in €)', type: 'number' },
  { key: 'location', label: 'Veranstaltungsort', type: 'applookup/select', targetEntity: 'skateparks_veranstaltungsorte', targetAppId: 'SKATEPARKS_VERANSTALTUNGSORTE', displayField: 'location_name' },
  { key: 'organizer_firstname', label: 'Vorname des Organisators', type: 'string/text' },
  { key: 'organizer_lastname', label: 'Nachname des Organisators', type: 'string/text' },
  { key: 'organizer_email', label: 'E-Mail des Organisators', type: 'string/email' },
  { key: 'organizer_phone', label: 'Telefonnummer des Organisators', type: 'string/tel' },
  { key: 'event_flyer', label: 'Event-Flyer', type: 'file' },
];

const ENTITY_TABS = [
  { key: 'skateparks_veranstaltungsorte', pascal: 'SkateparksVeranstaltungsorte' },
  { key: 'teilnehmer_anmeldung', pascal: 'TeilnehmerAnmeldung' },
  { key: 'event_verwaltung', pascal: 'EventVerwaltung' },
] as const;

type EntityKey = typeof ENTITY_TABS[number]['key'];

export default function AdminPage() {
  const data = useDashboardData();
  const { loading, error, fetchAll } = data;

  const [activeTab, setActiveTab] = useState<EntityKey>('skateparks_veranstaltungsorte');
  const [selectedIds, setSelectedIds] = useState<Record<EntityKey, Set<string>>>(() => ({
    'skateparks_veranstaltungsorte': new Set(),
    'teilnehmer_anmeldung': new Set(),
    'event_verwaltung': new Set(),
  }));
  const [filters, setFilters] = useState<Record<EntityKey, Record<string, string>>>(() => ({
    'skateparks_veranstaltungsorte': {},
    'teilnehmer_anmeldung': {},
    'event_verwaltung': {},
  }));
  const [showFilters, setShowFilters] = useState(false);
  const [dialogState, setDialogState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [createEntity, setCreateEntity] = useState<EntityKey | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<{ entity: EntityKey; ids: string[] } | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState<EntityKey | null>(null);
  const [viewState, setViewState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');

  const getRecords = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'skateparks_veranstaltungsorte': return (data as any).skateparksVeranstaltungsorte as SkateparksVeranstaltungsorte[] ?? [];
      case 'teilnehmer_anmeldung': return (data as any).teilnehmerAnmeldung as TeilnehmerAnmeldung[] ?? [];
      case 'event_verwaltung': return (data as any).eventVerwaltung as EventVerwaltung[] ?? [];
      default: return [];
    }
  }, [data]);

  const getLookupLists = useCallback((entity: EntityKey) => {
    const lists: Record<string, any[]> = {};
    switch (entity) {
      case 'teilnehmer_anmeldung':
        lists.eventVerwaltungList = (data as any).eventVerwaltung ?? [];
        break;
      case 'event_verwaltung':
        lists.skateparksVeranstaltungsorteList = (data as any).skateparksVeranstaltungsorte ?? [];
        break;
    }
    return lists;
  }, [data]);

  const getApplookupDisplay = useCallback((entity: EntityKey, fieldKey: string, url?: unknown) => {
    if (!url) return '—';
    const id = extractRecordId(url);
    if (!id) return '—';
    const lists = getLookupLists(entity);
    void fieldKey; // ensure used for noUnusedParameters
    if (entity === 'teilnehmer_anmeldung' && fieldKey === 'event') {
      const match = (lists.eventVerwaltungList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.event_title ?? '—';
    }
    if (entity === 'event_verwaltung' && fieldKey === 'location') {
      const match = (lists.skateparksVeranstaltungsorteList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.location_name ?? '—';
    }
    return String(url);
  }, [getLookupLists]);

  // An EntityKey IS the app key, so the runtime catalog can re-label the static
  // field metadata on every render (the tree remounts on a language switch).
  // Only display labels change here — keys, types and option keys stay as built.
  const getFieldMeta = useCallback((entity: EntityKey) => {
    const raw: any[] = (() => {
      switch (entity) {
        case 'skateparks_veranstaltungsorte': return SKATEPARKSVERANSTALTUNGSORTE_FIELDS as any[];
        case 'teilnehmer_anmeldung': return TEILNEHMERANMELDUNG_FIELDS as any[];
        case 'event_verwaltung': return EVENTVERWALTUNG_FIELDS as any[];
        default: return [];
      }
    })();
    const labels = fieldLabels(entity);
    return raw.map((f: any) => ({
      ...f,
      label: labels[f.key] ?? f.label,
      ...(f.options
        ? { options: f.options.map((o: any) => ({ ...o, label: lookupLabel(entity, f.key, o.key) ?? o.label })) }
        : {}),
    }));
  }, []);

  const getFilteredRecords = useCallback((entity: EntityKey) => {
    const records = getRecords(entity);
    const s = search.toLowerCase();
    const searched = !s ? records : records.filter((r: any) => {
      return Object.values(r.fields).some((v: any) => {
        if (v == null) return false;
        if (Array.isArray(v)) return v.some((item: any) => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
        if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
        return String(v).toLowerCase().includes(s);
      });
    });
    const entityFilters = filters[entity] ?? {};
    const fieldMeta = getFieldMeta(entity);
    return searched.filter((r: any) => {
      return fieldMeta.every((fm: any) => {
        const fv = entityFilters[fm.key];
        if (!fv || fv === '') return true;
        const val = r.fields?.[fm.key];
        if (fm.type === 'bool') {
          if (fv === 'true') return val === true;
          if (fv === 'false') return val !== true;
          return true;
        }
        if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
          // The filter select carries the option KEY, which is locale-independent —
          // the record's own label is in the build language and must not be matched.
          const key = val && typeof val === 'object' && 'key' in val ? val.key : '';
          return String(key) === fv;
        }
        if (fm.type.includes('multiplelookup')) {
          if (!Array.isArray(val)) return false;
          return val.some((item: any) => String(lookupLabel(entity, fm.key, item?.key) ?? item?.label ?? '').toLowerCase().includes(fv.toLowerCase()));
        }
        if (fm.type.includes('applookup')) {
          const display = getApplookupDisplay(entity, fm.key, val);
          return String(display).toLowerCase().includes(fv.toLowerCase());
        }
        return String(val ?? '').toLowerCase().includes(fv.toLowerCase());
      });
    });
  }, [getRecords, filters, getFieldMeta, getApplookupDisplay, search]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else { setSortKey(key); setSortDir('asc'); }
  }

  function sortRecords<T extends { fields: Record<string, any> }>(recs: T[]): T[] {
    if (!sortKey) return recs;
    return [...recs].sort((a, b) => {
      let va: any = a.fields[sortKey], vb: any = b.fields[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'object' && 'label' in va) va = va.label;
      if (typeof vb === 'object' && 'label' in vb) vb = vb.label;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  const toggleSelect = useCallback((entity: EntityKey, id: string) => {
    setSelectedIds(prev => {
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (next[entity].has(id)) next[entity].delete(id);
      else next[entity].add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((entity: EntityKey) => {
    const filtered = getFilteredRecords(entity);
    setSelectedIds(prev => {
      const allSelected = filtered.every((r: any) => prev[entity].has(r.record_id));
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (allSelected) {
        filtered.forEach((r: any) => next[entity].delete(r.record_id));
      } else {
        filtered.forEach((r: any) => next[entity].add(r.record_id));
      }
      return next;
    });
  }, [getFilteredRecords]);

  const clearSelection = useCallback((entity: EntityKey) => {
    setSelectedIds(prev => ({ ...prev, [entity]: new Set() }));
  }, []);

  const getServiceMethods = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'skateparks_veranstaltungsorte': return {
        create: (fields: any) => LivingAppsService.createSkateparksVeranstaltungsorteEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateSkateparksVeranstaltungsorteEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteSkateparksVeranstaltungsorteEntry(id),
      };
      case 'teilnehmer_anmeldung': return {
        create: (fields: any) => LivingAppsService.createTeilnehmerAnmeldungEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateTeilnehmerAnmeldungEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteTeilnehmerAnmeldungEntry(id),
      };
      case 'event_verwaltung': return {
        create: (fields: any) => LivingAppsService.createEventVerwaltungEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateEventVerwaltungEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteEventVerwaltungEntry(id),
      };
      default: return null;
    }
  }, []);

  async function handleCreate(entity: EntityKey, fields: any) {
    const svc = getServiceMethods(entity);
    if (!svc) return;
    await svc.create(fields);
    fetchAll();
    setCreateEntity(null);
  }

  async function handleUpdate(fields: any) {
    if (!dialogState) return;
    const svc = getServiceMethods(dialogState.entity);
    if (!svc) return;
    await svc.update(dialogState.record.record_id, fields);
    fetchAll();
    setDialogState(null);
  }

  async function handleBulkDelete() {
    if (!deleteTargets) return;
    const svc = getServiceMethods(deleteTargets.entity);
    if (!svc) return;
    setBulkLoading(true);
    try {
      for (const id of deleteTargets.ids) {
        await svc.remove(id);
      }
      clearSelection(deleteTargets.entity);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setDeleteTargets(null);
    }
  }

  async function handleBulkClone() {
    const svc = getServiceMethods(activeTab);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const records = getRecords(activeTab);
      const ids = Array.from(selectedIds[activeTab]);
      for (const id of ids) {
        const rec = records.find((r: any) => r.record_id === id);
        if (!rec) continue;
        const clean = cleanFieldsForApi(rec.fields, activeTab);
        await svc.create(clean as any);
      }
      clearSelection(activeTab);
      fetchAll();
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkEdit(fieldKey: string, value: any) {
    if (!bulkEditOpen) return;
    const svc = getServiceMethods(bulkEditOpen);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds[bulkEditOpen]);
      for (const id of ids) {
        await svc.update(id, { [fieldKey]: value });
      }
      clearSelection(bulkEditOpen);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setBulkEditOpen(null);
    }
  }

  function updateFilter(entity: EntityKey, fieldKey: string, value: string) {
    setFilters(prev => ({
      ...prev,
      [entity]: { ...prev[entity], [fieldKey]: value },
    }));
  }

  function clearEntityFilters(entity: EntityKey) {
    setFilters(prev => ({ ...prev, [entity]: {} }));
  }

  const activeFilterCount = useMemo(() => {
    const f = filters[activeTab] ?? {};
    return Object.values(f).filter(v => v && v !== '').length;
  }, [filters, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-destructive">{error.message}</p>
        <Button onClick={fetchAll}>{t('retry')}</Button>
      </div>
    );
  }

  const filtered = getFilteredRecords(activeTab);
  const sel = selectedIds[activeTab];
  const allFiltered = filtered.every((r: any) => sel.has(r.record_id)) && filtered.length > 0;
  const fieldMeta = getFieldMeta(activeTab);

  return (
    <PageShell
      title={t('admin')}
      subtitle={t('admin_subtitle')}
      action={
        <Button onClick={() => setCreateEntity(activeTab)} className="shrink-0">
          <IconPlus className="h-4 w-4 mr-2" /> {t('add')}
        </Button>
      }
    >
      <div className="flex gap-2 flex-wrap">
        {ENTITY_TABS.map(tab => {
          const count = getRecords(tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(''); setSortKey(''); setSortDir('asc'); fetchAll(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {appLabel(tab.key)}
              <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(f => !f)} className="gap-2">
            <IconFilter className="h-4 w-4" />
            {t('filter')}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearEntityFilters(activeTab)}>
              {t('clear_filters')}
            </Button>
          )}
        </div>
        {sel.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap bg-muted/60 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium">{sel.size} {t('selected')}</span>
            <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(activeTab)}>
              <IconPencil className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">{t('bulk_edit')}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkClone()}>
              <IconCopy className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">{t('bulk_clone')}</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteTargets({ entity: activeTab, ids: Array.from(sel) })}>
              <IconTrash className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">{t('bulk_delete')}</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => clearSelection(activeTab)}>
              <IconX className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">{t('deselect_all')}</span>
            </Button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 rounded-lg border bg-muted/30">
          {fieldMeta.map((fm: any) => (
            <div key={fm.key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{fm.label}</label>
              {fm.type === 'bool' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t('all_values')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_values')}</SelectItem>
                    <SelectItem value="true">{t('yes')}</SelectItem>
                    <SelectItem value="false">{t('no')}</SelectItem>
                  </SelectContent>
                </Select>
              ) : fm.type === 'lookup/select' || fm.type === 'lookup/radio' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t('all_values')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_values')}</SelectItem>
                    {fm.options?.map((o: any) => (
                      <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-8 text-xs"
                  placeholder={`${t('filter')}...`}
                  value={filters[activeTab]?.[fm.key] ?? ''}
                  onChange={e => updateFilter(activeTab, fm.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[27px] bg-card shadow-lg overflow-x-auto">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="w-10 px-6">
                <Checkbox
                  checked={allFiltered}
                  onCheckedChange={() => toggleSelectAll(activeTab)}
                />
              </TableHead>
              {fieldMeta.map((fm: any) => (
                <TableHead key={fm.key} className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort(fm.key)}>
                  <span className="inline-flex items-center gap-1">
                    {fm.label}
                    {sortKey === fm.key ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map((record: any) => (
              <TableRow key={record.record_id} className={`transition-colors cursor-pointer ${sel.has(record.record_id) ? "bg-primary/5" : "hover:bg-muted/50"}`} onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewState({ entity: activeTab, record }); }}>
                <TableCell>
                  <Checkbox
                    checked={sel.has(record.record_id)}
                    onCheckedChange={() => toggleSelect(activeTab, record.record_id)}
                  />
                </TableCell>
                {fieldMeta.map((fm: any) => {
                  const val = record.fields?.[fm.key];
                  if (fm.type === 'bool') {
                    return (
                      <TableCell key={fm.key}>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          val ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {val ? t('yes') : t('no')}
                        </span>
                      </TableCell>
                    );
                  }
                  if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{lookupLabel(activeTab, fm.key, val?.key) ?? val?.label ?? '—'}</span></TableCell>;
                  }
                  if (fm.type.startsWith('multiplelookup')) {
                    return <TableCell key={fm.key}>{Array.isArray(val) ? val.map((v: any) => lookupLabel(activeTab, fm.key, v?.key) ?? v?.label ?? v).join(', ') : '—'}</TableCell>;
                  }
                  if (fm.type.startsWith('multipleapplookup')) {
                    return (
                      <TableCell key={fm.key}>
                        {Array.isArray(val) && val.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {val.map((url: any, i: number) => (
                              <span key={i} className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getApplookupDisplay(activeTab, fm.key, url)}</span>
                            ))}
                          </div>
                        ) : '—'}
                      </TableCell>
                    );
                  }
                  if (fm.type.startsWith('applookup')) {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getApplookupDisplay(activeTab, fm.key, val)}</span></TableCell>;
                  }
                  if (fm.type.includes('date')) {
                    return <TableCell key={fm.key} className="text-muted-foreground">{fmtDate(val)}</TableCell>;
                  }
                  if (fm.type.startsWith('file')) {
                    return (
                      <TableCell key={fm.key}>
                        {val ? (
                          <div className="relative h-8 w-8 rounded bg-muted overflow-hidden">
                            <img src={val} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        ) : '—'}
                      </TableCell>
                    );
                  }
                  if (fm.type === 'string/textarea') {
                    return <TableCell key={fm.key} className="max-w-xs"><span className="truncate block">{val ?? '—'}</span></TableCell>;
                  }
                  if (fm.type === 'geo') {
                    return (
                      <TableCell key={fm.key} className="max-w-[200px]">
                        <span className="truncate block" title={val ? `${val.lat}, ${val.long}` : undefined}>
                          {val?.info ?? (val ? `${val.lat?.toFixed(4)}, ${val.long?.toFixed(4)}` : '—')}
                        </span>
                      </TableCell>
                    );
                  }
                  return <TableCell key={fm.key}>{val ?? '—'}</TableCell>;
                })}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setDialogState({ entity: activeTab, record })}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTargets({ entity: activeTab, ids: [record.record_id] })}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={fieldMeta.length + 2} className="text-center py-16 text-muted-foreground">
                  {t('no_results')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(createEntity === 'skateparks_veranstaltungsorte' || dialogState?.entity === 'skateparks_veranstaltungsorte') && (
        <SkateparksVeranstaltungsorteDialog
          open={createEntity === 'skateparks_veranstaltungsorte' || dialogState?.entity === 'skateparks_veranstaltungsorte'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'skateparks_veranstaltungsorte' ? handleUpdate : (fields: any) => handleCreate('skateparks_veranstaltungsorte', fields)}
          defaultValues={dialogState?.entity === 'skateparks_veranstaltungsorte' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['SkateparksVeranstaltungsorte']}
          enablePhotoLocation={AI_PHOTO_LOCATION['SkateparksVeranstaltungsorte']}
        />
      )}
      {(createEntity === 'teilnehmer_anmeldung' || dialogState?.entity === 'teilnehmer_anmeldung') && (
        <TeilnehmerAnmeldungDialog
          open={createEntity === 'teilnehmer_anmeldung' || dialogState?.entity === 'teilnehmer_anmeldung'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'teilnehmer_anmeldung' ? handleUpdate : (fields: any) => handleCreate('teilnehmer_anmeldung', fields)}
          defaultValues={dialogState?.entity === 'teilnehmer_anmeldung' ? dialogState.record?.fields : undefined}
          eventVerwaltungList={(data as any).eventVerwaltung ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['TeilnehmerAnmeldung']}
          enablePhotoLocation={AI_PHOTO_LOCATION['TeilnehmerAnmeldung']}
        />
      )}
      {(createEntity === 'event_verwaltung' || dialogState?.entity === 'event_verwaltung') && (
        <EventVerwaltungDialog
          open={createEntity === 'event_verwaltung' || dialogState?.entity === 'event_verwaltung'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'event_verwaltung' ? handleUpdate : (fields: any) => handleCreate('event_verwaltung', fields)}
          defaultValues={dialogState?.entity === 'event_verwaltung' ? dialogState.record?.fields : undefined}
          skateparksVeranstaltungsorteList={(data as any).skateparksVeranstaltungsorte ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['EventVerwaltung']}
          enablePhotoLocation={AI_PHOTO_LOCATION['EventVerwaltung']}
        />
      )}
      {viewState?.entity === 'skateparks_veranstaltungsorte' && (
        <SkateparksVeranstaltungsorteViewDialog
          open={viewState?.entity === 'skateparks_veranstaltungsorte'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'skateparks_veranstaltungsorte', record: r }); }}
        />
      )}
      {viewState?.entity === 'teilnehmer_anmeldung' && (
        <TeilnehmerAnmeldungViewDialog
          open={viewState?.entity === 'teilnehmer_anmeldung'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'teilnehmer_anmeldung', record: r }); }}
          eventVerwaltungList={(data as any).eventVerwaltung ?? []}
        />
      )}
      {viewState?.entity === 'event_verwaltung' && (
        <EventVerwaltungViewDialog
          open={viewState?.entity === 'event_verwaltung'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'event_verwaltung', record: r }); }}
          skateparksVeranstaltungsorteList={(data as any).skateparksVeranstaltungsorte ?? []}
        />
      )}

      <BulkEditDialog
        open={!!bulkEditOpen}
        onClose={() => setBulkEditOpen(null)}
        onApply={handleBulkEdit}
        fields={bulkEditOpen ? getFieldMeta(bulkEditOpen) : []}
        selectedCount={bulkEditOpen ? selectedIds[bulkEditOpen].size : 0}
        loading={bulkLoading}
        lookupLists={bulkEditOpen ? getLookupLists(bulkEditOpen) : {}}
      />

      <ConfirmDialog
        open={!!deleteTargets}
        onClose={() => setDeleteTargets(null)}
        onConfirm={handleBulkDelete}
        title={t('bulk_delete')}
        description={t('confirm_bulk_delete', { n: deleteTargets?.ids.length ?? 0 })}
      />
    </PageShell>
  );
}