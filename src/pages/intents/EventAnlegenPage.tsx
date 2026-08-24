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
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { LOOKUP_OPTIONS, APP_IDS } from '@/types/app';
import { tx } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IconMapPin, IconCalendarEvent, IconCheck } from '@tabler/icons-react';

const EVENT_CATEGORIES = LOOKUP_OPTIONS['event_verwaltung']?.['event_category'] ?? [];
const SKILL_LEVELS = LOOKUP_OPTIONS['event_verwaltung']?.['skill_level'] ?? [];

export default function EventAnlegenPage() {
  const { skateparksVeranstaltungsorte, loading, error, fetchAll } = useDashboardData();

  const [step, setStep] = useState(1);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // Step 2 form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategory, setEventCategory] = useState(EVENT_CATEGORIES[0]?.key ?? '');
  const [eventDatetime, setEventDatetime] = useState('');
  const [skillLevel, setSkillLevel] = useState(SKILL_LEVELS[0]?.key ?? '');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [organizerFirstname, setOrganizerFirstname] = useState('');
  const [organizerLastname, setOrganizerLastname] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [organizerPhone, setOrganizerPhone] = useState('');
  const [eventDescription, setEventDescription] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedLocation = skateparksVeranstaltungsorte.find(
    l => l.record_id === selectedLocationId
  );

  const handleSelectLocation = (id: string) => {
    setSelectedLocationId(id);
    setStep(2);
  };

  const canSubmit =
    eventTitle.trim() !== '' &&
    eventCategory !== '' &&
    eventDatetime !== '' &&
    skillLevel !== '' &&
    organizerFirstname.trim() !== '' &&
    organizerLastname.trim() !== '' &&
    organizerEmail.trim() !== '' &&
    selectedLocationId !== null;

  const handleSubmit = async () => {
    if (!selectedLocationId || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await LivingAppsService.createEventVerwaltungEntry({
        event_title: eventTitle.trim(),
        event_category: eventCategory,
        event_datetime: eventDatetime,
        skill_level: skillLevel,
        max_participants: maxParticipants !== '' ? Number(maxParticipants) : undefined,
        entry_fee: entryFee !== '' ? Number(entryFee) : undefined,
        organizer_firstname: organizerFirstname.trim(),
        organizer_lastname: organizerLastname.trim(),
        organizer_email: organizerEmail.trim(),
        organizer_phone: organizerPhone.trim() || undefined,
        event_description: eventDescription.trim() || undefined,
        location: createRecordUrl(APP_IDS.SKATEPARKS_VERANSTALTUNGSORTE, selectedLocationId),
      });
      await fetchAll();
      setSuccess(true);
    } catch (e) {
      setSaveError(tx('Das Event konnte nicht gespeichert werden. Bitte versuche es erneut.'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedLocationId(null);
    setEventTitle('');
    setEventCategory(EVENT_CATEGORIES[0]?.key ?? '');
    setEventDatetime('');
    setSkillLevel(SKILL_LEVELS[0]?.key ?? '');
    setMaxParticipants('');
    setEntryFee('');
    setOrganizerFirstname('');
    setOrganizerLastname('');
    setOrganizerEmail('');
    setOrganizerPhone('');
    setEventDescription('');
    setSaveError(null);
    setSuccess(false);
  };

  if (success) {
    return (
      <IntentWizardShell
        title={tx('Event anlegen')}
        subtitle={tx('Neues Skateboard-Event erfolgreich erstellt')}
        steps={[{ label: tx('Location') }, { label: tx('Event-Details') }]}
        currentStep={2}
        onStepChange={setStep}
        loading={loading}
        error={error}
        onRetry={fetchAll}
      >
        <div className="flex flex-col items-center justify-center py-16 space-y-6 text-center">
          <div className="rounded-full bg-emerald-100 p-5">
            <IconCheck size={48} className="text-emerald-600" stroke={1.5} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">{tx('Event wurde angelegt!')}</h2>
            <p className="text-sm text-muted-foreground">
              {tx('Das Event wurde erfolgreich gespeichert und ist jetzt verfügbar.')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleReset} variant="outline">
              {tx('Weiteres Event anlegen')}
            </Button>
            <Button asChild>
              <a href="#/">{tx('Zurück zum Dashboard')}</a>
            </Button>
          </div>
        </div>
      </IntentWizardShell>
    );
  }

  return (
    <IntentWizardShell
      title={tx('Event anlegen')}
      subtitle={tx('Wähle eine Location und gib die Event-Details ein')}
      steps={[{ label: tx('Location') }, { label: tx('Event-Details') }]}
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
            title: loc.fields.location_name ?? '',
            subtitle: loc.fields.city ?? '',
            icon: <IconMapPin size={20} className="text-primary" />,
          }))}
          onSelect={handleSelectLocation}
          searchPlaceholder={tx('Location suchen …')}
          emptyText={tx('Keine Locations gefunden')}
          emptyIcon={<IconMapPin size={40} className="text-muted-foreground" />}
        />
      )}

      {/* Step 2: Event-Details eingeben */}
      {step === 2 && (
        selectedLocationId ? (
          <div className="space-y-6">
            {/* Selected location summary */}
            <div className="flex items-center gap-3 rounded-xl border bg-secondary/40 px-4 py-3">
              <IconMapPin size={18} className="shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {selectedLocation?.fields.location_name ?? selectedLocationId}
                </p>
                {selectedLocation?.fields.city && (
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedLocation.fields.city}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto shrink-0"
                onClick={() => setStep(1)}
              >
                {tx('Ändern')}
              </Button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Event-Titel */}
              <div className="space-y-1.5">
                <Label htmlFor="event_title">
                  {tx('Event-Titel')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="event_title"
                  value={eventTitle}
                  onChange={e => setEventTitle(e.target.value)}
                  placeholder={tx('z. B. Sommerskate Contest 2026')}
                />
              </div>

              {/* Kategorie + Skill Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="event_category">
                    {tx('Kategorie')} <span className="text-destructive">*</span>
                  </Label>
                  <Select value={eventCategory} onValueChange={setEventCategory}>
                    <SelectTrigger id="event_category" className="w-full">
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
                  <Label htmlFor="skill_level">
                    {tx('Skill Level')} <span className="text-destructive">*</span>
                  </Label>
                  <Select value={skillLevel} onValueChange={setSkillLevel}>
                    <SelectTrigger id="skill_level" className="w-full">
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

              {/* Datum & Uhrzeit */}
              <div className="space-y-1.5">
                <Label htmlFor="event_datetime">
                  {tx('Datum & Uhrzeit')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="event_datetime"
                  type="datetime-local"
                  value={eventDatetime}
                  onChange={e => setEventDatetime(e.target.value)}
                />
              </div>

              {/* Teilnehmer + Eintritt */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="max_participants">{tx('Max. Teilnehmer')}</Label>
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
                  <Label htmlFor="entry_fee">{tx('Eintrittsgebühr (€)')}</Label>
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

              {/* Organizer */}
              <div className="space-y-1.5">
                <Label>{tx('Veranstalter')} <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    value={organizerFirstname}
                    onChange={e => setOrganizerFirstname(e.target.value)}
                    placeholder={tx('Vorname')}
                    aria-label={tx('Vorname Veranstalter')}
                  />
                  <Input
                    value={organizerLastname}
                    onChange={e => setOrganizerLastname(e.target.value)}
                    placeholder={tx('Nachname')}
                    aria-label={tx('Nachname Veranstalter')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="organizer_email">
                    {tx('E-Mail')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="organizer_email"
                    type="email"
                    value={organizerEmail}
                    onChange={e => setOrganizerEmail(e.target.value)}
                    placeholder={tx('name@beispiel.de')}
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

              {/* Beschreibung */}
              <div className="space-y-1.5">
                <Label htmlFor="event_description">{tx('Beschreibung')}</Label>
                <Textarea
                  id="event_description"
                  value={eventDescription}
                  onChange={e => setEventDescription(e.target.value)}
                  placeholder={tx('Was erwartet die Teilnehmer?')}
                  rows={4}
                />
              </div>
            </div>

            {/* Error */}
            {saveError && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="sm:w-auto w-full"
              >
                {tx('Zurück')}
              </Button>
              <Button
                disabled={!canSubmit || saving}
                onClick={handleSubmit}
                className="sm:ml-auto sm:w-auto w-full"
              >
                <IconCalendarEvent size={16} className="shrink-0 mr-2" />
                {saving ? tx('Wird gespeichert …') : tx('Event anlegen')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
            </p>
            <Button variant="outline" onClick={() => setStep(1)}>
              {tx('Neu starten')}
            </Button>
          </div>
        )
      )}
    </IntentWizardShell>
  );
}
