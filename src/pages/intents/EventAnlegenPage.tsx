/**
 * Event anlegen — 2-Schritt-Wizard.
 * Steps: 1) Location wählen (Skateparks & Veranstaltungsorte) → 2) Event-Details eingeben & speichern.
 * Reads: skateparksVeranstaltungsorte. Writes: event_verwaltung (createEventVerwaltungEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */
import { useState } from 'react';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LOOKUP_OPTIONS, APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { tx } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IconMapPin, IconCalendarEvent, IconCheck } from '@tabler/icons-react';
import { format } from 'date-fns';

export default function EventAnlegenPage() {
  const data = useDashboardData();
  const { skateparksVeranstaltungsorte, loading, error, fetchAll } = data;

  const [step, setStep] = useState(1);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // Step 2 form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [eventDatetime, setEventDatetime] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [organizerFirstname, setOrganizerFirstname] = useState('');
  const [organizerLastname, setOrganizerLastname] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [organizerPhone, setOrganizerPhone] = useState('');
  const [eventDescription, setEventDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  const EVENT_CATEGORIES = LOOKUP_OPTIONS['event_verwaltung']?.['event_category'] ?? [];
  const SKILL_LEVELS = LOOKUP_OPTIONS['event_verwaltung']?.['skill_level'] ?? [];

  const selectedLocation = selectedLocationId
    ? skateparksVeranstaltungsorte.find(l => l.record_id === selectedLocationId)
    : null;

  const canSubmit =
    eventTitle.trim() !== '' &&
    eventCategory !== '' &&
    eventCategory !== 'none' &&
    eventDatetime !== '' &&
    skillLevel !== '' &&
    skillLevel !== 'none' &&
    organizerFirstname.trim() !== '' &&
    organizerLastname.trim() !== '' &&
    organizerEmail.trim() !== '' &&
    selectedLocationId !== null;

  const handleSubmit = async () => {
    if (!selectedLocationId || submitting) return;

    // Idempotency guard: if already created, skip the create
    let eid = createdEventId;
    if (!eid) {
      setSubmitting(true);
      setSubmitError(null);
      try {
        const payload: Parameters<typeof LivingAppsService.createEventVerwaltungEntry>[0] = {
          event_title: eventTitle.trim(),
          event_category: eventCategory,
          event_datetime: eventDatetime,
          skill_level: skillLevel,
          organizer_firstname: organizerFirstname.trim(),
          organizer_lastname: organizerLastname.trim(),
          organizer_email: organizerEmail.trim(),
          location: createRecordUrl(APP_IDS.SKATEPARKS_VERANSTALTUNGSORTE, selectedLocationId),
        };
        if (maxParticipants !== '') payload.max_participants = Number(maxParticipants);
        if (entryFee !== '') payload.entry_fee = Number(entryFee);
        if (organizerPhone.trim() !== '') payload.organizer_phone = organizerPhone.trim();
        if (eventDescription.trim() !== '') payload.event_description = eventDescription.trim();

        const result = await LivingAppsService.createEventVerwaltungEntry(payload);
        eid = result.record_id;
        setCreatedEventId(eid);
        await fetchAll();
        setStep(3);
      } catch (e) {
        setSubmitError(tx('Das Event konnte nicht gespeichert werden. Bitte versuche es erneut.'));
      } finally {
        setSubmitting(false);
      }
    } else {
      setStep(3);
    }
  };

  return (
    <IntentWizardShell
      title={tx('Neues Event anlegen')}
      subtitle={tx('Wähle zuerst einen Veranstaltungsort, dann trage die Event-Details ein.')}
      steps={[
        { label: tx('Location') },
        { label: tx('Event-Details') },
        { label: tx('Fertig') },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Location wählen */}
      {step === 1 && (
        <EntitySelectStep
          items={skateparksVeranstaltungsorte.map(loc => ({
            id: loc.record_id,
            title: loc.fields.location_name ?? loc.record_id,
            subtitle: [loc.fields.city, loc.fields.description].filter(Boolean).join(' · '),
            icon: <IconMapPin size={20} className="text-primary" />,
          }))}
          onSelect={(id) => {
            setSelectedLocationId(id);
            setStep(2);
          }}
          searchPlaceholder={tx('Location suchen …')}
          emptyText={tx('Keine Locations gefunden')}
          emptyIcon={<IconMapPin size={32} className="text-muted-foreground" />}
        />
      )}

      {/* Step 2: Event-Details */}
      {step === 2 && (
        selectedLocationId ? (
          <div className="space-y-6">
            {/* Selected location summary */}
            <div className="rounded-2xl border bg-secondary/40 p-4 flex items-start gap-3">
              <IconMapPin size={18} className="text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {selectedLocation?.fields.location_name ?? selectedLocationId}
                </p>
                {selectedLocation?.fields.city && (
                  <p className="text-xs text-muted-foreground">{selectedLocation.fields.city}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 ml-auto text-xs"
                onClick={() => setStep(1)}
              >
                {tx('Ändern')}
              </Button>
            </div>

            {/* Event form */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="event_title">{tx('Event-Titel')} *</Label>
                <Input
                  id="event_title"
                  value={eventTitle}
                  onChange={e => setEventTitle(e.target.value)}
                  placeholder={tx('z. B. Summer Skate Jam 2026')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="event_category">{tx('Kategorie')} *</Label>
                  <Select value={eventCategory} onValueChange={setEventCategory}>
                    <SelectTrigger id="event_category">
                      <SelectValue placeholder={tx('Kategorie wählen')} />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_CATEGORIES.map(opt => (
                        <SelectItem key={opt.key} value={opt.key}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="skill_level">{tx('Skill-Level')} *</Label>
                  <Select value={skillLevel} onValueChange={setSkillLevel}>
                    <SelectTrigger id="skill_level">
                      <SelectValue placeholder={tx('Level wählen')} />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_LEVELS.map(opt => (
                        <SelectItem key={opt.key} value={opt.key}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="event_datetime">{tx('Datum & Uhrzeit')} *</Label>
                <Input
                  id="event_datetime"
                  type="datetime-local"
                  value={eventDatetime}
                  onChange={e => setEventDatetime(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="max_participants">{tx('Max. Teilnehmerzahl')}</Label>
                  <Input
                    id="max_participants"
                    type="number"
                    min="1"
                    value={maxParticipants}
                    onChange={e => setMaxParticipants(e.target.value)}
                    placeholder={tx('z. B. 50')}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="entry_fee">{tx('Teilnahmegebühr (€)')}</Label>
                  <Input
                    id="entry_fee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={entryFee}
                    onChange={e => setEntryFee(e.target.value)}
                    placeholder={tx('z. B. 10')}
                  />
                </div>
              </div>

              <div className="pt-2">
                <p className="text-sm font-semibold text-foreground mb-3">{tx('Veranstalter')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="organizer_firstname">{tx('Vorname')} *</Label>
                    <Input
                      id="organizer_firstname"
                      value={organizerFirstname}
                      onChange={e => setOrganizerFirstname(e.target.value)}
                      placeholder={tx('Vorname')}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="organizer_lastname">{tx('Nachname')} *</Label>
                    <Input
                      id="organizer_lastname"
                      value={organizerLastname}
                      onChange={e => setOrganizerLastname(e.target.value)}
                      placeholder={tx('Nachname')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="organizer_email">{tx('E-Mail')} *</Label>
                    <Input
                      id="organizer_email"
                      type="email"
                      value={organizerEmail}
                      onChange={e => setOrganizerEmail(e.target.value)}
                      placeholder={tx('veranstalter@beispiel.de')}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="organizer_phone">{tx('Telefon')}</Label>
                    <Input
                      id="organizer_phone"
                      type="tel"
                      value={organizerPhone}
                      onChange={e => setOrganizerPhone(e.target.value)}
                      placeholder={tx('+49 …')}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="event_description">{tx('Beschreibung')}</Label>
                <Textarea
                  id="event_description"
                  value={eventDescription}
                  onChange={e => setEventDescription(e.target.value)}
                  placeholder={tx('Was erwartet die Teilnehmenden? Besonderheiten, Ablauf, …')}
                  rows={4}
                />
              </div>

              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="sm:w-auto w-full"
                >
                  {tx('Zurück')}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                  className="sm:w-auto w-full"
                >
                  {submitting ? tx('Wird gespeichert …') : tx('Event anlegen')}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">
              {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
            </p>
            <Button variant="outline" onClick={() => setStep(1)}>
              {tx('Neu starten')}
            </Button>
          </div>
        )
      )}

      {/* Step 3: Erfolg */}
      {step === 3 && (
        createdEventId ? (
          <div className="flex flex-col items-center text-center py-12 space-y-6">
            <div className="rounded-full bg-emerald-100 p-5">
              <IconCheck size={40} className="text-emerald-600" stroke={2} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">
                {tx('Event erfolgreich angelegt!')}
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                {tx('Das Event wurde gespeichert. Du kannst jetzt ein weiteres anlegen oder zum Dashboard zurückkehren.')}
              </p>
            </div>

            {selectedLocation && (
              <div className="rounded-2xl border bg-secondary/40 px-6 py-4 text-left w-full max-w-sm space-y-1">
                <p className="text-xs text-muted-foreground">{tx('Location')}</p>
                <p className="text-sm font-medium">{selectedLocation.fields.location_name}</p>
                {selectedLocation.fields.city && (
                  <p className="text-xs text-muted-foreground">{selectedLocation.fields.city}</p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setSelectedLocationId(null);
                  setCreatedEventId(null);
                  setEventTitle('');
                  setEventCategory('');
                  setEventDatetime('');
                  setSkillLevel('');
                  setMaxParticipants('');
                  setEntryFee('');
                  setOrganizerFirstname('');
                  setOrganizerLastname('');
                  setOrganizerEmail('');
                  setOrganizerPhone('');
                  setEventDescription('');
                  setSubmitError(null);
                }}
              >
                <IconCalendarEvent size={16} className="shrink-0" />
                {tx('Weiteres Event anlegen')}
              </Button>
              <Button asChild>
                <a href="#/">{tx('Zum Dashboard')}</a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">
              {tx('Dieser Schritt braucht die Daten aus Schritt 2.')}
            </p>
            <Button variant="outline" onClick={() => setStep(2)}>
              {tx('Zurück zu Event-Details')}
            </Button>
          </div>
        )
      )}
    </IntentWizardShell>
  );
}
