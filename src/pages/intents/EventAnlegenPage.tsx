/**
 * Event anlegen — 2-Schritt-Wizard für neue Skateboard-Events.
 * Steps: 1) Ort wählen (SkateparksVeranstaltungsorte auswählen) →
 *        2) Event-Details eingeben & speichern (createEventVerwaltungEntry).
 * Reads: skateparksVeranstaltungsorte. Writes: event_verwaltung (createEventVerwaltungEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */

import { useState } from 'react';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDashboardData } from '@/hooks/useDashboardData';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { tx } from '@/i18n';
import { IconMapPin, IconCheck } from '@tabler/icons-react';
import { format } from 'date-fns';

const EVENT_CATEGORY_OPTIONS = LOOKUP_OPTIONS['event_verwaltung']?.['event_category'] ?? [];
const SKILL_LEVEL_OPTIONS = LOOKUP_OPTIONS['event_verwaltung']?.['skill_level'] ?? [];

export default function EventAnlegenPage() {
  const { skateparksVeranstaltungsorte, loading, error, fetchAll } = useDashboardData();

  const [step, setStep] = useState(1);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // Step 2 form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventCategory, setEventCategory] = useState(EVENT_CATEGORY_OPTIONS[0]?.key ?? '');
  const [eventDatetime, setEventDatetime] = useState('');
  const [skillLevel, setSkillLevel] = useState(SKILL_LEVEL_OPTIONS[0]?.key ?? '');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [organizerFirstname, setOrganizerFirstname] = useState('');
  const [organizerLastname, setOrganizerLastname] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [organizerPhone, setOrganizerPhone] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedLocation = skateparksVeranstaltungsorte.find(
    l => l.record_id === selectedLocationId
  );

  const handleLocationSelect = (id: string) => {
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
    if (!selectedLocationId || !canSubmit) return;
    setSaving(true);
    setSaveError(null);
    try {
      await LivingAppsService.createEventVerwaltungEntry({
        event_title: eventTitle.trim(),
        event_description: eventDescription.trim() || undefined,
        event_category: eventCategory || undefined,
        event_datetime: eventDatetime,
        skill_level: skillLevel || undefined,
        max_participants: maxParticipants ? Number(maxParticipants) : undefined,
        entry_fee: entryFee ? Number(entryFee) : undefined,
        location: createRecordUrl(APP_IDS.SKATEPARKS_VERANSTALTUNGSORTE, selectedLocationId),
        organizer_firstname: organizerFirstname.trim(),
        organizer_lastname: organizerLastname.trim(),
        organizer_email: organizerEmail.trim(),
        organizer_phone: organizerPhone.trim() || undefined,
      });
      await fetchAll();
      setSuccess(true);
    } catch (e) {
      setSaveError(tx('Beim Speichern ist ein Fehler aufgetreten. Bitte versuche es erneut.'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedLocationId(null);
    setEventTitle('');
    setEventDescription('');
    setEventCategory(EVENT_CATEGORY_OPTIONS[0]?.key ?? '');
    setEventDatetime('');
    setSkillLevel(SKILL_LEVEL_OPTIONS[0]?.key ?? '');
    setMaxParticipants('');
    setEntryFee('');
    setOrganizerFirstname('');
    setOrganizerLastname('');
    setOrganizerEmail('');
    setOrganizerPhone('');
    setSaveError(null);
    setSuccess(false);
  };

  return (
    <IntentWizardShell
      title={tx('Neues Event anlegen')}
      subtitle={tx('Wähle zuerst den Ort, dann gib die Event-Details ein.')}
      steps={[{ label: tx('Ort wählen') }, { label: tx('Event-Details') }]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── Schritt 1: Ort wählen ── */}
      {step === 1 && (
        <EntitySelectStep
          items={skateparksVeranstaltungsorte.map(loc => ({
            id: loc.record_id,
            title: loc.fields.location_name ?? tx('Unbekannter Ort'),
            subtitle: loc.fields.city ?? undefined,
            icon: <IconMapPin size={20} className="text-primary" />,
          }))}
          onSelect={handleLocationSelect}
          searchPlaceholder={tx('Skatepark oder Veranstaltungsort suchen …')}
          emptyText={tx('Keine Orte gefunden')}
        />
      )}

      {/* ── Schritt 2: Event-Details ── */}
      {step === 2 && (
        <div className="space-y-6">
          {!selectedLocationId ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-muted-foreground">
                {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
              </p>
              <Button variant="outline" onClick={() => setStep(1)}>
                {tx('Neu starten')}
              </Button>
            </div>
          ) : success ? (
            <div className="text-center py-12 space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-emerald-100 p-4">
                  <IconCheck size={40} className="text-emerald-600" stroke={2} />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                {tx('Event erfolgreich angelegt!')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {tx('Das Event wurde gespeichert.')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button variant="outline" onClick={handleReset}>
                  {tx('Neues Event anlegen')}
                </Button>
                <Button asChild>
                  <a href="#/">{tx('Zurück zum Dashboard')}</a>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Gewählter Ort */}
              <div className="rounded-2xl border bg-secondary/40 p-4 flex items-start gap-3">
                <IconMapPin size={18} className="text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{tx('Veranstaltungsort')}</p>
                  <p className="font-medium text-foreground truncate">
                    {selectedLocation?.fields.location_name ?? tx('Unbekannter Ort')}
                  </p>
                  {selectedLocation?.fields.city && (
                    <p className="text-sm text-muted-foreground">{selectedLocation.fields.city}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 ml-auto"
                  onClick={() => setStep(1)}
                >
                  {tx('Ändern')}
                </Button>
              </div>

              {/* Event-Details Formular */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">{tx('Event-Informationen')}</h3>

                <div className="space-y-2">
                  <Label htmlFor="event_title">{tx('Titel')} *</Label>
                  <Input
                    id="event_title"
                    value={eventTitle}
                    onChange={e => setEventTitle(e.target.value)}
                    placeholder={tx('z. B. Frühjahrs-Contest 2026')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event_description">{tx('Beschreibung')}</Label>
                  <Textarea
                    id="event_description"
                    value={eventDescription}
                    onChange={e => setEventDescription(e.target.value)}
                    placeholder={tx('Kurze Beschreibung des Events …')}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="event_category">{tx('Kategorie')} *</Label>
                    <Select value={eventCategory} onValueChange={setEventCategory}>
                      <SelectTrigger id="event_category">
                        <SelectValue placeholder={tx('Kategorie wählen')} />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_CATEGORY_OPTIONS.map(opt => (
                          <SelectItem key={opt.key} value={opt.key}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skill_level">{tx('Skill-Level')} *</Label>
                    <Select value={skillLevel} onValueChange={setSkillLevel}>
                      <SelectTrigger id="skill_level">
                        <SelectValue placeholder={tx('Level wählen')} />
                      </SelectTrigger>
                      <SelectContent>
                        {SKILL_LEVEL_OPTIONS.map(opt => (
                          <SelectItem key={opt.key} value={opt.key}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event_datetime">{tx('Datum & Uhrzeit')} *</Label>
                  <Input
                    id="event_datetime"
                    type="datetime-local"
                    value={eventDatetime}
                    onChange={e => setEventDatetime(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max_participants">{tx('Max. Teilnehmer')}</Label>
                    <Input
                      id="max_participants"
                      type="number"
                      min="1"
                      value={maxParticipants}
                      onChange={e => setMaxParticipants(e.target.value)}
                      placeholder="50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="entry_fee">{tx('Startgebühr (€)')}</Label>
                    <Input
                      id="entry_fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={entryFee}
                      onChange={e => setEntryFee(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Organisator */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">{tx('Organisator')}</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="organizer_firstname">{tx('Vorname')} *</Label>
                    <Input
                      id="organizer_firstname"
                      value={organizerFirstname}
                      onChange={e => setOrganizerFirstname(e.target.value)}
                      placeholder={tx('Vorname')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="organizer_lastname">{tx('Nachname')} *</Label>
                    <Input
                      id="organizer_lastname"
                      value={organizerLastname}
                      onChange={e => setOrganizerLastname(e.target.value)}
                      placeholder={tx('Nachname')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="organizer_email">{tx('E-Mail')} *</Label>
                    <Input
                      id="organizer_email"
                      type="email"
                      value={organizerEmail}
                      onChange={e => setOrganizerEmail(e.target.value)}
                      placeholder={tx('name@beispiel.de')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="organizer_phone">{tx('Telefon')}</Label>
                    <Input
                      id="organizer_phone"
                      type="tel"
                      value={organizerPhone}
                      onChange={e => setOrganizerPhone(e.target.value)}
                      placeholder="+49 …"
                    />
                  </div>
                </div>
              </div>

              {saveError && (
                <p className="text-sm text-destructive">{saveError}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={saving}
                  className="sm:w-auto w-full"
                >
                  {tx('Zurück')}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || saving}
                  className="sm:flex-1 w-full"
                >
                  {saving ? tx('Wird gespeichert …') : tx('Event anlegen')}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </IntentWizardShell>
  );
}
