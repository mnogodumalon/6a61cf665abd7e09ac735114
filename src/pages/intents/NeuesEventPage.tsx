/**
 * Neues Event anlegen — 2-Schritt-Wizard.
 * Steps: 1) Veranstaltungsort wählen → 2) Event-Details eingeben & anlegen.
 * Reads: skateparksVeranstaltungsorte. Writes: event_verwaltung (createEventVerwaltungEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { IconMapPin, IconCalendarEvent, IconCheck } from '@tabler/icons-react';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { tx } from '@/i18n';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { SkateparksVeranstaltungsorte } from '@/types/app';
import { createRecordUrl } from '@/services/livingAppsService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function NeuesEventPage() {
  const data = useDashboardData();
  const { skateparksVeranstaltungsorte, loading, error, fetchAll } = data;

  const [step, setStep] = useState(1);
  const [selectedLocation, setSelectedLocation] = useState<SkateparksVeranstaltungsorte | null>(null);

  // Step 2 form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventCategoryKey, setEventCategoryKey] = useState('');
  const [eventDatetime, setEventDatetime] = useState('');
  const [skillLevelKey, setSkillLevelKey] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [organizerFirstname, setOrganizerFirstname] = useState('');
  const [organizerLastname, setOrganizerLastname] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [organizerPhone, setOrganizerPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  const EVENT_CATEGORY_OPTIONS = LOOKUP_OPTIONS['event_verwaltung']?.['event_category'] ?? [];
  const SKILL_LEVEL_OPTIONS = LOOKUP_OPTIONS['event_verwaltung']?.['skill_level'] ?? [];

  const handleLocationSelect = (id: string) => {
    const loc = skateparksVeranstaltungsorte.find(l => l.record_id === id) ?? null;
    setSelectedLocation(loc);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!selectedLocation || !eventTitle || !eventCategoryKey || !eventDatetime || !skillLevelKey || !organizerFirstname || !organizerLastname || !organizerEmail) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      let eid = createdEventId;
      if (!eid) {
        const result = await LivingAppsService.createEventVerwaltungEntry({
          event_title: eventTitle,
          event_description: eventDescription || undefined,
          event_category: eventCategoryKey,
          event_datetime: eventDatetime,
          skill_level: skillLevelKey,
          max_participants: maxParticipants ? Number(maxParticipants) : undefined,
          entry_fee: entryFee ? Number(entryFee) : undefined,
          location: createRecordUrl(APP_IDS.SKATEPARKS_VERANSTALTUNGSORTE, selectedLocation.record_id),
          organizer_firstname: organizerFirstname,
          organizer_lastname: organizerLastname,
          organizer_email: organizerEmail,
          organizer_phone: organizerPhone || undefined,
        });
        eid = result.record_id;
        setCreatedEventId(eid);
      }
      await fetchAll();
      setStep(3);
    } catch (e) {
      setSubmitError(tx('Das Event konnte nicht angelegt werden. Bitte versuche es erneut.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedLocation(null);
    setEventTitle('');
    setEventDescription('');
    setEventCategoryKey('');
    setEventDatetime('');
    setSkillLevelKey('');
    setMaxParticipants('');
    setEntryFee('');
    setOrganizerFirstname('');
    setOrganizerLastname('');
    setOrganizerEmail('');
    setOrganizerPhone('');
    setSubmitError(null);
    setCreatedEventId(null);
  };

  const step2Valid =
    !!selectedLocation &&
    !!eventTitle &&
    !!eventCategoryKey &&
    !!eventDatetime &&
    !!skillLevelKey &&
    !!organizerFirstname &&
    !!organizerLastname &&
    !!organizerEmail;

  return (
    <IntentWizardShell
      title={tx('Neues Event anlegen')}
      subtitle={tx('Veranstaltungsort wählen und Event-Details eingeben')}
      steps={[{ label: tx('Veranstaltungsort') }, { label: tx('Event-Details') }, { label: tx('Fertig') }]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Veranstaltungsort wählen */}
      {step === 1 && (
        <EntitySelectStep
          items={skateparksVeranstaltungsorte.map(loc => ({
            id: loc.record_id,
            title: loc.fields.location_name ?? '',
            subtitle: loc.fields.city ?? '',
            icon: <IconMapPin size={20} className="text-primary" />,
          }))}
          onSelect={handleLocationSelect}
          searchPlaceholder={tx('Veranstaltungsort suchen …')}
          emptyText={tx('Kein Veranstaltungsort gefunden')}
          emptyIcon={<IconMapPin size={32} className="text-muted-foreground" />}
        />
      )}

      {/* Step 2: Event-Details eingeben */}
      {step === 2 && (
        selectedLocation ? (
          <div className="space-y-6">
            {/* Gewählter Ort */}
            <div className="flex items-center gap-3 rounded-2xl border bg-secondary/40 p-4">
              <IconMapPin size={20} className="text-primary shrink-0" />
              <div className="min-w-0">
                <p className="font-medium truncate">{selectedLocation.fields.location_name}</p>
                {selectedLocation.fields.city && (
                  <p className="text-sm text-muted-foreground truncate">{selectedLocation.fields.city}</p>
                )}
              </div>
              <Button variant="ghost" size="sm" className="ml-auto shrink-0" onClick={() => setStep(1)}>
                {tx('Ändern')}
              </Button>
            </div>

            {/* Formular */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="event_title">{tx('Titel')} *</Label>
                <Input
                  id="event_title"
                  value={eventTitle}
                  onChange={e => setEventTitle(e.target.value)}
                  placeholder={tx('z.B. Stadtmeisterschaft 2026')}
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
                  <Select value={eventCategoryKey} onValueChange={setEventCategoryKey}>
                    <SelectTrigger id="event_category">
                      <SelectValue placeholder={tx('Kategorie wählen')} />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_CATEGORY_OPTIONS.map(opt => (
                        <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skill_level">{tx('Skill-Level')} *</Label>
                  <Select value={skillLevelKey} onValueChange={setSkillLevelKey}>
                    <SelectTrigger id="skill_level">
                      <SelectValue placeholder={tx('Level wählen')} />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_LEVEL_OPTIONS.map(opt => (
                        <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
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
                  <Label htmlFor="entry_fee">{tx('Startgeld (€)')}</Label>
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

              <div className="rounded-2xl border p-4 space-y-4">
                <p className="text-sm font-medium text-foreground">{tx('Organisator')}</p>
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
                      placeholder={tx('name@example.com')}
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
            </div>

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={submitting}
              >
                {tx('Zurück')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!step2Valid || submitting}
                className="flex-1 sm:flex-none"
              >
                {submitting ? tx('Wird angelegt …') : tx('Event anlegen')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">{tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}</p>
            <Button variant="outline" onClick={() => setStep(1)}>{tx('Neu starten')}</Button>
          </div>
        )
      )}

      {/* Step 3: Fertig */}
      {step === 3 && (
        <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
          <div className="rounded-full bg-emerald-500/10 p-5">
            <IconCheck size={48} className="text-emerald-500" stroke={1.5} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{tx('Event erfolgreich angelegt!')}</h2>
            <p className="text-muted-foreground max-w-sm">
              {tx('Das Event wurde angelegt und ist jetzt sichtbar.')}
            </p>
            {selectedLocation && (
              <p className="text-sm text-muted-foreground">
                <IconMapPin size={14} className="inline mr-1 shrink-0" />
                {selectedLocation.fields.location_name}
                {selectedLocation.fields.city ? ` · ${selectedLocation.fields.city}` : ''}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={handleReset}>
              {tx('Weiteres Event anlegen')}
            </Button>
            <Button variant="outline" asChild>
              <a href="#/">{tx('Zurück zum Dashboard')}</a>
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
