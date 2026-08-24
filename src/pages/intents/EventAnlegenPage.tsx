/**
 * Event anlegen — 2-Schritt-Wizard.
 * Steps: 1) Veranstaltungsort wählen → 2) Event-Details eingeben & speichern.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IconMapPin, IconCalendarEvent, IconAlertCircle, IconCheck } from '@tabler/icons-react';

export default function EventAnlegenPage() {
  const { skateparksVeranstaltungsorte, loading, error, fetchAll } = useDashboardData();

  const [step, setStep] = useState(1);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  // Step 2 form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategoryKey, setEventCategoryKey] = useState('');
  const [eventDatetime, setEventDatetime] = useState('');
  const [skillLevelKey, setSkillLevelKey] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [organizerFirstname, setOrganizerFirstname] = useState('');
  const [organizerLastname, setOrganizerLastname] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [organizerPhone, setOrganizerPhone] = useState('');

  const EVENT_CATEGORY_OPTIONS = LOOKUP_OPTIONS['event_verwaltung']?.['event_category'] ?? [];
  const SKILL_LEVEL_OPTIONS = LOOKUP_OPTIONS['event_verwaltung']?.['skill_level'] ?? [];

  const selectedLocation = selectedLocationId
    ? skateparksVeranstaltungsorte.find(l => l.record_id === selectedLocationId)
    : null;

  const canSubmit =
    !!eventTitle &&
    !!eventCategoryKey &&
    !!eventDatetime &&
    !!skillLevelKey &&
    !!organizerFirstname &&
    !!organizerLastname &&
    !!organizerEmail;

  const handleSubmit = async () => {
    if (!selectedLocationId || !canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await LivingAppsService.createEventVerwaltungEntry({
        event_title: eventTitle,
        event_category: eventCategoryKey,
        event_datetime: eventDatetime,
        skill_level: skillLevelKey,
        max_participants: maxParticipants ? Number(maxParticipants) : undefined,
        entry_fee: entryFee ? Number(entryFee) : undefined,
        organizer_firstname: organizerFirstname,
        organizer_lastname: organizerLastname,
        organizer_email: organizerEmail,
        organizer_phone: organizerPhone || undefined,
        location: createRecordUrl(APP_IDS.SKATEPARKS_VERANSTALTUNGSORTE, selectedLocationId),
      });
      setCreatedEventId(result.record_id);
      setStep(3);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : tx('Fehler beim Speichern.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedLocationId(null);
    setCreatedEventId(null);
    setSubmitError(null);
    setEventTitle('');
    setEventCategoryKey('');
    setEventDatetime('');
    setSkillLevelKey('');
    setMaxParticipants('');
    setEntryFee('');
    setOrganizerFirstname('');
    setOrganizerLastname('');
    setOrganizerEmail('');
    setOrganizerPhone('');
  };

  return (
    <IntentWizardShell
      title={tx('Event anlegen')}
      subtitle={tx('Neues Skateboard-Event mit Veranstaltungsort erstellen')}
      steps={[
        { label: tx('Veranstaltungsort') },
        { label: tx('Event-Details') },
        { label: tx('Fertig') },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Schritt 1: Veranstaltungsort wählen */}
      {step === 1 && (
        <EntitySelectStep
          items={skateparksVeranstaltungsorte.map(loc => ({
            id: loc.record_id,
            title: loc.fields.location_name ?? tx('Unbenannter Ort'),
            subtitle: [loc.fields.city, loc.fields.street]
              .filter(Boolean)
              .join(' · '),
            icon: <IconMapPin size={20} className="text-primary" />,
          }))}
          onSelect={(id) => {
            setSelectedLocationId(id);
            setStep(2);
          }}
          searchPlaceholder={tx('Ort oder Stadt suchen …')}
          emptyText={tx('Keine Veranstaltungsorte gefunden.')}
          emptyIcon={<IconMapPin size={40} className="text-muted-foreground" />}
        />
      )}

      {/* Schritt 2: Event-Details eingeben */}
      {step === 2 && (
        selectedLocationId ? (
          <div className="space-y-6">
            {/* Gewählter Ort */}
            <div className="rounded-2xl border bg-secondary/40 p-4 flex items-start gap-3">
              <IconMapPin size={20} className="text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {selectedLocation?.fields.location_name ?? tx('Veranstaltungsort')}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {[selectedLocation?.fields.city, selectedLocation?.fields.street]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
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

            {/* Event-Grunddaten */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">{tx('Event-Informationen')}</h3>

              <div className="space-y-2">
                <Label htmlFor="event_title">{tx('Event-Titel')} *</Label>
                <Input
                  id="event_title"
                  value={eventTitle}
                  onChange={e => setEventTitle(e.target.value)}
                  placeholder={tx('z. B. Sommer Skate Contest 2026')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event_category">{tx('Kategorie')} *</Label>
                  <Select value={eventCategoryKey || 'none'} onValueChange={v => setEventCategoryKey(v === 'none' ? '' : v)}>
                    <SelectTrigger id="event_category">
                      <SelectValue placeholder={tx('Kategorie wählen')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tx('Bitte wählen')}</SelectItem>
                      {EVENT_CATEGORY_OPTIONS.map(opt => (
                        <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skill_level">{tx('Skill-Level')} *</Label>
                  <Select value={skillLevelKey || 'none'} onValueChange={v => setSkillLevelKey(v === 'none' ? '' : v)}>
                    <SelectTrigger id="skill_level">
                      <SelectValue placeholder={tx('Level wählen')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tx('Bitte wählen')}</SelectItem>
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

            {/* Veranstalter */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">{tx('Veranstalter')}</h3>

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

            {submitError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-2 text-sm text-destructive">
                <IconAlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
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
                className="sm:w-auto w-full sm:ml-auto"
              >
                {submitting ? tx('Speichern …') : tx('Event anlegen')}
              </Button>
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

      {/* Schritt 3: Erfolg */}
      {step === 3 && (
        createdEventId ? (
          <div className="text-center py-12 space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-emerald-500/10 p-4">
                <IconCheck size={40} className="text-emerald-600" stroke={1.5} />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">{tx('Event erfolgreich angelegt!')}</h2>
              <p className="text-sm text-muted-foreground">
                {tx('Das Event wurde gespeichert und mit dem Veranstaltungsort verknüpft.')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handleReset} variant="outline">
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
