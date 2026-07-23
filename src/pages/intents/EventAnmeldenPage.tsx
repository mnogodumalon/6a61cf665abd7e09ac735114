import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { SkateparksVeranstaltungsorte, EventVerwaltung, TeilnehmerAnmeldung } from '@/types/app';
import {
  IconMapPin,
  IconCalendar,
  IconUser,
  IconUsers,
  IconCheck,
  IconPlus,
  IconAlertTriangle,
  IconBuildingSkyscraper,
  IconClipboardList,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Location' },
  { label: 'Event' },
  { label: 'Teilnehmer' },
  { label: 'Zusammenfassung' },
];

function formatDatetime(val: string | undefined): string {
  if (!val) return '–';
  try {
    const d = new Date(val);
    return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return val;
  }
}

function formatCurrency(val: number): string {
  return val.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

interface TileSelectProps {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}

function TileSelect({ options, value, onChange }: TileSelectProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
            value === opt.key
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card border-border text-foreground hover:border-primary/50 hover:bg-accent'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function EventAnmeldenPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Step state — initialize from URL
  const [step, setStep] = useState<number>(() => {
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);
    if (urlStep >= 1 && urlStep <= 4) return urlStep;
    return 1;
  });

  // Data
  const [skateparks, setSkateparks] = useState<SkateparksVeranstaltungsorte[]>([]);
  const [teilnehmerList, setTeilnehmerList] = useState<TeilnehmerAnmeldung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Step 1 — Location
  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => searchParams.get('locationId') ?? '');

  // Step 2 — Event form
  const [createdEvent, setCreatedEvent] = useState<EventVerwaltung | null>(null);
  const [eventForm, setEventForm] = useState({
    event_title: '',
    event_description: '',
    event_category: '',
    event_datetime: '',
    skill_level: '',
    max_participants: 20,
    entry_fee: 0,
    organizer_firstname: '',
    organizer_lastname: '',
    organizer_email: '',
    organizer_phone: '',
  });
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);

  // Step 3 — Participant form
  const [participantForm, setParticipantForm] = useState({
    participant_firstname: '',
    participant_lastname: '',
    participant_email: '',
    participant_phone: '',
    date_of_birth: '',
    participant_skill_level: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    tshirt_size: '',
    waiver_accepted: false,
  });
  const [participantSubmitting, setParticipantSubmitting] = useState(false);
  const [participantError, setParticipantError] = useState<string | null>(null);
  const [participantSuccess, setParticipantSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [sp, tn] = await Promise.all([
        LivingAppsService.getSkateparksVeranstaltungsorte(),
        LivingAppsService.getTeilnehmerAnmeldung(),
      ]);
      setSkateparks(sp);
      setTeilnehmerList(tn);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshTeilnehmer = useCallback(async () => {
    try {
      const tn = await LivingAppsService.getTeilnehmerAnmeldung();
      setTeilnehmerList(tn);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync step to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (step > 1) {
      params.set('step', String(step));
    } else {
      params.delete('step');
    }
    if (selectedLocationId) {
      params.set('locationId', selectedLocationId);
    } else {
      params.delete('locationId');
    }
    setSearchParams(params, { replace: true });
  }, [step, selectedLocationId, searchParams, setSearchParams]);

  // Deep-link: if locationId is in URL and step=1, jump to step 2
  useEffect(() => {
    const locId = searchParams.get('locationId');
    if (locId && step === 1 && skateparks.length > 0) {
      const found = skateparks.find(s => s.record_id === locId);
      if (found) {
        setSelectedLocationId(locId);
        setStep(2);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skateparks]);

  const handleStepChange = (newStep: number) => {
    setStep(newStep);
  };

  // Derived data
  const selectedLocation = skateparks.find(s => s.record_id === selectedLocationId) ?? null;

  const eventParticipants = createdEvent
    ? teilnehmerList.filter(t => {
        const eventId = extractRecordId(t.fields.event ?? '');
        return eventId === createdEvent.record_id;
      })
    : [];

  const maxParticipants = createdEvent?.fields.max_participants ?? eventForm.max_participants;
  const registeredCount = eventParticipants.length;
  const isFull = registeredCount >= maxParticipants;

  // Step 1: select location
  const handleLocationSelect = (id: string) => {
    setSelectedLocationId(id);
    setStep(2);
  };

  // Step 2: submit event
  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventError(null);
    if (!eventForm.event_title.trim()) {
      setEventError('Bitte gib einen Event-Titel ein.');
      return;
    }
    if (!eventForm.event_datetime) {
      setEventError('Bitte wähle Datum und Uhrzeit aus.');
      return;
    }
    if (!selectedLocationId) {
      setEventError('Keine Location ausgewählt.');
      return;
    }
    setEventSubmitting(true);
    try {
      const locationUrl = createRecordUrl(APP_IDS.SKATEPARKS_VERANSTALTUNGSORTE, selectedLocationId);
      const result = await LivingAppsService.createEventVerwaltungEntry({
        event_title: eventForm.event_title,
        event_description: eventForm.event_description || undefined,
        event_category: eventForm.event_category || undefined,
        event_datetime: eventForm.event_datetime.slice(0, 16),
        skill_level: eventForm.skill_level || undefined,
        max_participants: eventForm.max_participants,
        entry_fee: eventForm.entry_fee,
        location: locationUrl,
        organizer_firstname: eventForm.organizer_firstname || undefined,
        organizer_lastname: eventForm.organizer_lastname || undefined,
        organizer_email: eventForm.organizer_email || undefined,
        organizer_phone: eventForm.organizer_phone || undefined,
      });
      // Extract record_id from API response
      const newId = result && typeof result === 'object'
        ? (result.record_id ?? Object.keys(result)[0])
        : null;
      const newEvent: EventVerwaltung = {
        record_id: newId ?? '',
        createdat: new Date().toISOString(),
        updatedat: null,
        fields: {
          event_title: eventForm.event_title,
          event_description: eventForm.event_description || undefined,
          event_datetime: eventForm.event_datetime.slice(0, 16),
          max_participants: eventForm.max_participants,
          entry_fee: eventForm.entry_fee,
          location: locationUrl,
          organizer_firstname: eventForm.organizer_firstname || undefined,
          organizer_lastname: eventForm.organizer_lastname || undefined,
          organizer_email: eventForm.organizer_email || undefined,
          organizer_phone: eventForm.organizer_phone || undefined,
        },
      };
      setCreatedEvent(newEvent);
      setStep(3);
    } catch (err) {
      setEventError(err instanceof Error ? err.message : 'Fehler beim Erstellen des Events.');
    } finally {
      setEventSubmitting(false);
    }
  };

  // Step 3: register participant
  const handleParticipantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setParticipantError(null);
    setParticipantSuccess(false);
    if (!participantForm.participant_firstname.trim() || !participantForm.participant_lastname.trim()) {
      setParticipantError('Bitte Vor- und Nachname eingeben.');
      return;
    }
    if (!participantForm.waiver_accepted) {
      setParticipantError('Bitte akzeptiere die Haftungsfreistellung.');
      return;
    }
    if (!createdEvent?.record_id) {
      setParticipantError('Kein Event gefunden.');
      return;
    }
    setParticipantSubmitting(true);
    try {
      const eventUrl = createRecordUrl(APP_IDS.EVENT_VERWALTUNG, createdEvent.record_id);
      await LivingAppsService.createTeilnehmerAnmeldungEntry({
        event: eventUrl,
        participant_firstname: participantForm.participant_firstname,
        participant_lastname: participantForm.participant_lastname,
        participant_email: participantForm.participant_email || undefined,
        participant_phone: participantForm.participant_phone || undefined,
        date_of_birth: participantForm.date_of_birth ? participantForm.date_of_birth.slice(0, 10) : undefined,
        participant_skill_level: participantForm.participant_skill_level || undefined,
        emergency_contact_name: participantForm.emergency_contact_name || undefined,
        emergency_contact_phone: participantForm.emergency_contact_phone || undefined,
        tshirt_size: participantForm.tshirt_size || undefined,
        waiver_accepted: participantForm.waiver_accepted,
      });
      await refreshTeilnehmer();
      setParticipantSuccess(true);
      setParticipantForm({
        participant_firstname: '',
        participant_lastname: '',
        participant_email: '',
        participant_phone: '',
        date_of_birth: '',
        participant_skill_level: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        tshirt_size: '',
        waiver_accepted: false,
      });
    } catch (err) {
      setParticipantError(err instanceof Error ? err.message : 'Fehler beim Anmelden des Teilnehmers.');
    } finally {
      setParticipantSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedLocationId('');
    setCreatedEvent(null);
    setEventForm({
      event_title: '',
      event_description: '',
      event_category: '',
      event_datetime: '',
      skill_level: '',
      max_participants: 20,
      entry_fee: 0,
      organizer_firstname: '',
      organizer_lastname: '',
      organizer_email: '',
      organizer_phone: '',
    });
    setEventError(null);
    setParticipantForm({
      participant_firstname: '',
      participant_lastname: '',
      participant_email: '',
      participant_phone: '',
      date_of_birth: '',
      participant_skill_level: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      tshirt_size: '',
      waiver_accepted: false,
    });
    setParticipantError(null);
    setParticipantSuccess(false);
  };

  const eventCategoryOptions = LOOKUP_OPTIONS['event_verwaltung']?.['event_category'] ?? [];
  const skillLevelOptions = LOOKUP_OPTIONS['event_verwaltung']?.['skill_level'] ?? [];
  const participantSkillOptions = LOOKUP_OPTIONS['teilnehmer_anmeldung']?.['participant_skill_level'] ?? [];
  const tshirtSizeOptions = LOOKUP_OPTIONS['teilnehmer_anmeldung']?.['tshirt_size'] ?? [];

  const progressPercent = maxParticipants > 0 ? Math.min((registeredCount / maxParticipants) * 100, 100) : 0;
  const progressColor = progressPercent >= 100 ? 'bg-red-500' : progressPercent >= 80 ? 'bg-amber-500' : 'bg-primary';

  return (
    <IntentWizardShell
      title="Event anmelden"
      subtitle="In 4 Schritten vom Skatepark zum vollständigen Event mit Teilnehmerliste"
      steps={WIZARD_STEPS}
      currentStep={step}
      onStepChange={handleStepChange}
      loading={loading}
      error={error}
      onRetry={fetchData}
    >
      {/* ─── Step 1: Location wählen ─── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5 space-y-1 overflow-hidden">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <IconMapPin size={18} className="text-primary shrink-0" />
              Skatepark oder Veranstaltungsort wählen
            </h2>
            <p className="text-sm text-muted-foreground">
              Wähle den Ort, an dem dein Event stattfinden soll.
            </p>
          </div>

          <EntitySelectStep
            items={skateparks.map(s => ({
              id: s.record_id,
              title: s.fields.location_name ?? '(Kein Name)',
              subtitle: [s.fields.city, s.fields.street].filter(Boolean).join(', '),
              icon: <IconBuildingSkyscraper size={20} className="text-primary" />,
            }))}
            onSelect={handleLocationSelect}
            searchPlaceholder="Skatepark suchen..."
            emptyIcon={<IconBuildingSkyscraper size={40} />}
            emptyText="Keine Skateparks gefunden."
          />

          <div className="rounded-xl border border-dashed bg-muted/30 p-4 flex items-start gap-3">
            <IconAlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Neuen Skatepark anlegen?</span>{' '}
              Skateparks und Veranstaltungsorte werden im Bereich "Skateparks &amp; Veranstaltungsorte" verwaltet. Lege den Ort dort zuerst an und kehre dann hierher zurück.
            </p>
          </div>
        </div>
      )}

      {/* ─── Step 2: Event erstellen ─── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Location badge */}
          {selectedLocation && (
            <div className="rounded-xl border bg-card p-4 flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <IconMapPin size={18} className="text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Gewählter Ort</p>
                <p className="font-semibold text-sm truncate">{selectedLocation.fields.location_name}</p>
                {selectedLocation.fields.city && (
                  <p className="text-xs text-muted-foreground truncate">
                    {[selectedLocation.fields.city, selectedLocation.fields.street].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-primary underline shrink-0"
              >
                Ändern
              </button>
            </div>
          )}

          <form onSubmit={handleEventSubmit} className="space-y-5">
            <div className="rounded-2xl border bg-card p-5 space-y-4 overflow-hidden">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <IconCalendar size={18} className="text-primary shrink-0" />
                Event-Details
              </h2>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Event-Titel <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="z.B. Sommerskate Contest 2026"
                  value={eventForm.event_title}
                  onChange={e => setEventForm(f => ({ ...f, event_title: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Beschreibung</label>
                <textarea
                  rows={3}
                  placeholder="Was erwartet die Teilnehmer?"
                  value={eventForm.event_description}
                  onChange={e => setEventForm(f => ({ ...f, event_description: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Kategorie</label>
                <TileSelect
                  options={eventCategoryOptions}
                  value={eventForm.event_category}
                  onChange={v => setEventForm(f => ({ ...f, event_category: v }))}
                />
              </div>

              {/* Skill level */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Skill-Level</label>
                <TileSelect
                  options={skillLevelOptions}
                  value={eventForm.skill_level}
                  onChange={v => setEventForm(f => ({ ...f, skill_level: v }))}
                />
              </div>

              {/* Datetime */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Datum &amp; Uhrzeit <span className="text-destructive">*</span>
                </label>
                <Input
                  type="datetime-local"
                  required
                  value={eventForm.event_datetime}
                  onChange={e => setEventForm(f => ({ ...f, event_datetime: e.target.value }))}
                />
              </div>

              {/* Max participants + entry fee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Max. Teilnehmer</label>
                  <Input
                    type="number"
                    min={1}
                    value={eventForm.max_participants}
                    onChange={e => setEventForm(f => ({ ...f, max_participants: parseInt(e.target.value, 10) || 0 }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Startgeld (€)</label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={eventForm.entry_fee}
                    onChange={e => setEventForm(f => ({ ...f, entry_fee: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </div>

            {/* Organizer */}
            <div className="rounded-2xl border bg-card p-5 space-y-4 overflow-hidden">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <IconUser size={18} className="text-primary shrink-0" />
                Veranstalter
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Vorname</label>
                  <Input
                    placeholder="Max"
                    value={eventForm.organizer_firstname}
                    onChange={e => setEventForm(f => ({ ...f, organizer_firstname: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Nachname</label>
                  <Input
                    placeholder="Mustermann"
                    value={eventForm.organizer_lastname}
                    onChange={e => setEventForm(f => ({ ...f, organizer_lastname: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">E-Mail</label>
                  <Input
                    type="email"
                    placeholder="max@example.com"
                    value={eventForm.organizer_email}
                    onChange={e => setEventForm(f => ({ ...f, organizer_email: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Telefon</label>
                  <Input
                    type="tel"
                    placeholder="+49 170 1234567"
                    value={eventForm.organizer_phone}
                    onChange={e => setEventForm(f => ({ ...f, organizer_phone: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {eventError && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                <IconAlertTriangle size={16} className="shrink-0" />
                {eventError}
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Zurück
              </Button>
              <Button type="submit" disabled={eventSubmitting} className="flex-1">
                {eventSubmitting ? 'Wird erstellt...' : 'Event erstellen & weiter'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Step 3: Teilnehmer anmelden ─── */}
      {step === 3 && createdEvent && (
        <div className="space-y-4">
          {/* Event info badge */}
          <div className="rounded-xl border bg-card p-4 flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconCalendar size={18} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Event</p>
              <p className="font-semibold text-sm truncate">{createdEvent.fields.event_title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {formatDatetime(createdEvent.fields.event_datetime)}
                {selectedLocation?.fields.location_name ? ` · ${selectedLocation.fields.location_name}` : ''}
              </p>
            </div>
          </div>

          {/* Participant counter */}
          <div className="rounded-2xl border bg-card p-5 space-y-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconUsers size={18} className="text-primary shrink-0" />
                <span className="font-semibold text-foreground">Teilnehmer</span>
              </div>
              <span className={`font-bold text-lg ${isFull ? 'text-red-600' : 'text-foreground'}`}>
                {registeredCount} / {maxParticipants}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progressColor}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {isFull && (
              <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                <IconAlertTriangle size={15} className="shrink-0" />
                Maximale Teilnehmerzahl erreicht — keine weiteren Anmeldungen möglich.
              </div>
            )}
          </div>

          {/* Registered participants list */}
          {eventParticipants.length > 0 && (
            <div className="rounded-2xl border bg-card p-5 space-y-3 overflow-hidden">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <IconClipboardList size={18} className="text-primary shrink-0" />
                Angemeldete Teilnehmer
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {eventParticipants.map((t, idx) => (
                  <div
                    key={t.record_id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary text-sm"
                  >
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-medium min-w-0 truncate">
                      {t.fields.participant_firstname} {t.fields.participant_lastname}
                    </span>
                    <IconCheck size={14} className="text-green-600 shrink-0 ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participant add form */}
          {!isFull ? (
            <form onSubmit={handleParticipantSubmit} className="rounded-2xl border bg-card p-5 space-y-4 overflow-hidden">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <IconPlus size={18} className="text-primary shrink-0" />
                Neuen Teilnehmer anmelden
              </h3>

              {participantSuccess && (
                <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                  <IconCheck size={16} className="shrink-0" />
                  Teilnehmer erfolgreich angemeldet!
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Vorname <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    placeholder="Max"
                    value={participantForm.participant_firstname}
                    onChange={e => setParticipantForm(f => ({ ...f, participant_firstname: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Nachname <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    placeholder="Mustermann"
                    value={participantForm.participant_lastname}
                    onChange={e => setParticipantForm(f => ({ ...f, participant_lastname: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">E-Mail</label>
                  <Input
                    type="email"
                    placeholder="max@example.com"
                    value={participantForm.participant_email}
                    onChange={e => setParticipantForm(f => ({ ...f, participant_email: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Telefon</label>
                  <Input
                    type="tel"
                    placeholder="+49 170 1234567"
                    value={participantForm.participant_phone}
                    onChange={e => setParticipantForm(f => ({ ...f, participant_phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Geburtsdatum</label>
                <Input
                  type="date"
                  value={participantForm.date_of_birth}
                  onChange={e => setParticipantForm(f => ({ ...f, date_of_birth: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Skill-Level</label>
                <TileSelect
                  options={participantSkillOptions}
                  value={participantForm.participant_skill_level}
                  onChange={v => setParticipantForm(f => ({ ...f, participant_skill_level: v }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">T-Shirt Größe</label>
                <TileSelect
                  options={tshirtSizeOptions}
                  value={participantForm.tshirt_size}
                  onChange={v => setParticipantForm(f => ({ ...f, tshirt_size: v }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Notfallkontakt (Name)</label>
                  <Input
                    placeholder="Marta Mustermann"
                    value={participantForm.emergency_contact_name}
                    onChange={e => setParticipantForm(f => ({ ...f, emergency_contact_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Notfallkontakt (Telefon)</label>
                  <Input
                    type="tel"
                    placeholder="+49 170 9876543"
                    value={participantForm.emergency_contact_phone}
                    onChange={e => setParticipantForm(f => ({ ...f, emergency_contact_phone: e.target.value }))}
                  />
                </div>
              </div>

              {/* Waiver */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={participantForm.waiver_accepted}
                  onChange={e => setParticipantForm(f => ({ ...f, waiver_accepted: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 accent-primary shrink-0"
                />
                <span className="text-sm text-foreground">
                  Ich akzeptiere die{' '}
                  <span className="font-medium">Haftungsfreistellung</span>{' '}
                  und bestätige, dass der Teilnehmer die Risiken des Skatens kennt.{' '}
                  <span className="text-destructive font-medium">*</span>
                </span>
              </label>

              {participantError && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                  <IconAlertTriangle size={16} className="shrink-0" />
                  {participantError}
                </div>
              )}

              <Button type="submit" disabled={participantSubmitting} className="w-full">
                {participantSubmitting ? 'Wird angemeldet...' : 'Teilnehmer anmelden'}
              </Button>
            </form>
          ) : (
            <div className="rounded-2xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Das Event ist ausgebucht. Keine weiteren Anmeldungen möglich.
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setStep(4)}
          >
            Fertig – zur Zusammenfassung
          </Button>
        </div>
      )}

      {/* ─── Step 4: Zusammenfassung ─── */}
      {step === 4 && createdEvent && (
        <div className="space-y-4">
          {/* Event details card */}
          <div className="rounded-2xl border bg-card p-5 space-y-4 overflow-hidden">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <IconCalendar size={18} className="text-primary shrink-0" />
              Event-Übersicht
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Titel</p>
                <p className="font-semibold text-sm">{createdEvent.fields.event_title}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Datum &amp; Uhrzeit</p>
                <p className="font-semibold text-sm">{formatDatetime(createdEvent.fields.event_datetime)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-semibold text-sm">{selectedLocation?.fields.location_name ?? '–'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Startgeld</p>
                <p className="font-semibold text-sm">{formatCurrency(createdEvent.fields.entry_fee ?? 0)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Max. Teilnehmer</p>
                <p className="font-semibold text-sm">{createdEvent.fields.max_participants ?? maxParticipants}</p>
              </div>
              {createdEvent.fields.organizer_firstname && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Veranstalter</p>
                  <p className="font-semibold text-sm">
                    {createdEvent.fields.organizer_firstname} {createdEvent.fields.organizer_lastname}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Participant summary */}
          <div className="rounded-2xl border bg-card p-5 space-y-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <IconUsers size={18} className="text-primary shrink-0" />
                Angemeldete Teilnehmer
              </h2>
              <span className="text-sm font-bold text-foreground bg-primary/10 text-primary px-3 py-1 rounded-full">
                {registeredCount} Personen
              </span>
            </div>

            {eventParticipants.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Noch keine Teilnehmer angemeldet.</p>
            ) : (
              <div className="space-y-2">
                {eventParticipants.map((t, idx) => (
                  <div
                    key={t.record_id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary text-sm"
                  >
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-medium min-w-0 truncate">
                      {t.fields.participant_firstname} {t.fields.participant_lastname}
                    </span>
                    {t.fields.tshirt_size && typeof t.fields.tshirt_size === 'object' && 'label' in t.fields.tshirt_size && (
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        T-Shirt: {(t.fields.tshirt_size as { label: string }).label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <Button onClick={handleReset} className="w-full" variant="outline">
              <IconPlus size={16} className="mr-2" />
              Neues Event anlegen
            </Button>
            <a href="#/" className="block">
              <Button variant="secondary" className="w-full">
                Zurück zum Dashboard
              </Button>
            </a>
          </div>
        </div>
      )}

      {/* Fallback if step 3/4 but no event yet */}
      {(step === 3 || step === 4) && !createdEvent && (
        <div className="rounded-2xl border bg-card p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Kein Event gefunden. Bitte starte den Wizard neu.</p>
          <Button variant="outline" onClick={handleReset}>Neu starten</Button>
        </div>
      )}
    </IntentWizardShell>
  );
}
