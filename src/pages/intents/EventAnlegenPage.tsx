/**
 * Event anlegen — 3-Schritt-Wizard für neue Skateboard-Events.
 * Steps: 1) Veranstaltungsort wählen → 2) Event-Details eintragen → 3) Bestätigung.
 * Reads: skateparksVeranstaltungsorte. Writes: event_verwaltung (createEventVerwaltungEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  IconMapPin,
  IconCalendarEvent,
  IconCircleCheck,
  IconUser,
  IconTrophy,
  IconUsers,
  IconCurrencyEuro,
} from '@tabler/icons-react';
import { tx, dateFnsLocale } from '@/i18n';
import { LOOKUP_OPTIONS, APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { useDashboardData } from '@/hooks/useDashboardData';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
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

const CATEGORY_OPTIONS = LOOKUP_OPTIONS['event_verwaltung']?.['event_category'] ?? [];
const SKILL_OPTIONS = LOOKUP_OPTIONS['event_verwaltung']?.['skill_level'] ?? [];

export default function EventAnlegenPage() {
  const data = useDashboardData();
  const { skateparksVeranstaltungsorte, loading, error, fetchAll } = data;

  const [step, setStep] = useState(1);

  // Step 1 selection
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // Step 2 form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategoryKey, setEventCategoryKey] = useState(CATEGORY_OPTIONS[0]?.key ?? '');
  const [eventDatetime, setEventDatetime] = useState('');
  const [skillLevelKey, setSkillLevelKey] = useState(SKILL_OPTIONS[0]?.key ?? '');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [organizerFirstname, setOrganizerFirstname] = useState('');
  const [organizerLastname, setOrganizerLastname] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [organizerPhone, setOrganizerPhone] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdEventTitle, setCreatedEventTitle] = useState('');
  const [createdEventDatetime, setCreatedEventDatetime] = useState('');
  const [createdEventCategoryKey, setCreatedEventCategoryKey] = useState('');

  const selectedLocation = skateparksVeranstaltungsorte.find(
    (l) => l.record_id === selectedLocationId
  );

  const handleLocationSelect = (id: string) => {
    setSelectedLocationId(id);
    setStep(2);
  };

  const step2Valid =
    eventTitle.trim() !== '' &&
    eventCategoryKey !== '' &&
    eventDatetime !== '' &&
    skillLevelKey !== '' &&
    organizerFirstname.trim() !== '' &&
    organizerLastname.trim() !== '' &&
    organizerEmail.trim() !== '';

  const handleSubmit = async () => {
    if (!selectedLocationId || !step2Valid) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await LivingAppsService.createEventVerwaltungEntry({
        event_title: eventTitle,
        event_category: eventCategoryKey,
        event_datetime: eventDatetime,
        skill_level: skillLevelKey,
        max_participants: maxParticipants !== '' ? Number(maxParticipants) : undefined,
        entry_fee: entryFee !== '' ? Number(entryFee) : undefined,
        event_description: eventDescription || undefined,
        organizer_firstname: organizerFirstname,
        organizer_lastname: organizerLastname,
        organizer_email: organizerEmail,
        organizer_phone: organizerPhone || undefined,
        location: createRecordUrl(APP_IDS.SKATEPARKS_VERANSTALTUNGSORTE, selectedLocationId),
      });
      setCreatedEventTitle(eventTitle);
      setCreatedEventDatetime(eventDatetime);
      setCreatedEventCategoryKey(eventCategoryKey);
      await fetchAll();
      setStep(3);
    } catch (e) {
      setSubmitError(tx('Das Event konnte nicht angelegt werden. Bitte versuche es erneut.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedLocationId(null);
    setEventTitle('');
    setEventCategoryKey(CATEGORY_OPTIONS[0]?.key ?? '');
    setEventDatetime('');
    setSkillLevelKey(SKILL_OPTIONS[0]?.key ?? '');
    setMaxParticipants('');
    setEntryFee('');
    setEventDescription('');
    setOrganizerFirstname('');
    setOrganizerLastname('');
    setOrganizerEmail('');
    setOrganizerPhone('');
    setSubmitError(null);
    setCreatedEventTitle('');
    setCreatedEventDatetime('');
    setCreatedEventCategoryKey('');
    setStep(1);
  };

  const categoryLabel =
    CATEGORY_OPTIONS.find((o) => o.key === createdEventCategoryKey)?.label ?? createdEventCategoryKey;

  const formattedDatetime = createdEventDatetime
    ? format(parseISO(createdEventDatetime), "EEEE, d. MMMM yyyy 'um' HH:mm 'Uhr'", { locale: dateFnsLocale() })
    : '';

  return (
    <IntentWizardShell
      title={tx('Neues Event anlegen')}
      subtitle={tx('Skateboard-Event in drei Schritten erstellen')}
      steps={[
        { label: tx('Veranstaltungsort') },
        { label: tx('Event-Details') },
        { label: tx('Bestätigung') },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Veranstaltungsort wählen */}
      {step === 1 && (
        <EntitySelectStep
          items={skateparksVeranstaltungsorte.map((loc) => ({
            id: loc.record_id,
            title: loc.fields.location_name ?? '',
            subtitle: loc.fields.city ?? '',
            icon: <IconMapPin size={20} className="text-primary" />,
          }))}
          onSelect={handleLocationSelect}
          searchPlaceholder={tx('Skatepark oder Veranstaltungsort suchen …')}
          emptyText={tx('Keine Veranstaltungsorte gefunden')}
          emptyIcon={<IconMapPin size={40} className="text-muted-foreground" />}
        />
      )}

      {/* Step 2: Event-Details eintragen */}
      {step === 2 && (
        selectedLocationId ? (
          <div className="space-y-6">
            {/* Selected location reminder */}
            <div className="flex items-center gap-2 rounded-xl border bg-secondary/40 px-4 py-3">
              <IconMapPin size={16} className="shrink-0 text-primary" />
              <span className="text-sm font-medium">
                {selectedLocation?.fields.location_name ?? ''}
                {selectedLocation?.fields.city ? ` · ${selectedLocation.fields.city}` : ''}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto shrink-0 text-xs"
                onClick={() => setStep(1)}
              >
                {tx('Ändern')}
              </Button>
            </div>

            {/* Event info */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-semibold text-foreground">
                <IconCalendarEvent size={18} className="text-primary shrink-0" />
                {tx('Event-Informationen')}
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="event_title">{tx('Event-Titel')} *</Label>
                  <Input
                    id="event_title"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder={tx('z. B. Citypark Street Contest 2026')}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="event_category">{tx('Kategorie')} *</Label>
                    <Select value={eventCategoryKey} onValueChange={setEventCategoryKey}>
                      <SelectTrigger id="event_category">
                        <SelectValue placeholder={tx('Kategorie wählen')} />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.key} value={opt.key}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="event_datetime">{tx('Datum & Uhrzeit')} *</Label>
                    <Input
                      id="event_datetime"
                      type="datetime-local"
                      value={eventDatetime}
                      onChange={(e) => setEventDatetime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="skill_level">{tx('Skill-Level')} *</Label>
                    <Select value={skillLevelKey} onValueChange={setSkillLevelKey}>
                      <SelectTrigger id="skill_level">
                        <SelectValue placeholder={tx('Level wählen')} />
                      </SelectTrigger>
                      <SelectContent>
                        {SKILL_OPTIONS.map((opt) => (
                          <SelectItem key={opt.key} value={opt.key}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="max_participants">{tx('Max. Teilnehmer')}</Label>
                    <Input
                      id="max_participants"
                      type="number"
                      min="1"
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(e.target.value)}
                      placeholder="50"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="entry_fee">{tx('Startgebühr (€)')}</Label>
                    <Input
                      id="entry_fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={entryFee}
                      onChange={(e) => setEntryFee(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="event_description">{tx('Beschreibung')}</Label>
                  <Textarea
                    id="event_description"
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    placeholder={tx('Kurze Beschreibung des Events …')}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Organizer info */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-semibold text-foreground">
                <IconUser size={18} className="text-primary shrink-0" />
                {tx('Veranstalter')}
              </h3>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="organizer_firstname">{tx('Vorname')} *</Label>
                    <Input
                      id="organizer_firstname"
                      value={organizerFirstname}
                      onChange={(e) => setOrganizerFirstname(e.target.value)}
                      placeholder={tx('Vorname')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="organizer_lastname">{tx('Nachname')} *</Label>
                    <Input
                      id="organizer_lastname"
                      value={organizerLastname}
                      onChange={(e) => setOrganizerLastname(e.target.value)}
                      placeholder={tx('Nachname')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="organizer_email">{tx('E-Mail')} *</Label>
                    <Input
                      id="organizer_email"
                      type="email"
                      value={organizerEmail}
                      onChange={(e) => setOrganizerEmail(e.target.value)}
                      placeholder={tx('name@example.com')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="organizer_phone">{tx('Telefon')}</Label>
                    <Input
                      id="organizer_phone"
                      type="tel"
                      value={organizerPhone}
                      onChange={(e) => setOrganizerPhone(e.target.value)}
                      placeholder="+49 …"
                    />
                  </div>
                </div>
              </div>
            </div>

            {submitError && (
              <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {submitError}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="shrink-0"
              >
                {tx('Zurück')}
              </Button>
              <Button
                disabled={!step2Valid || submitting}
                onClick={handleSubmit}
                className="shrink-0"
              >
                {submitting ? tx('Event wird angelegt …') : tx('Event anlegen')}
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

      {/* Step 3: Bestätigung */}
      {step === 3 && (
        createdEventTitle ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <IconCircleCheck size={48} className="text-emerald-500" />
              <h2 className="text-xl font-bold text-foreground">
                {tx('Event erfolgreich angelegt!')}
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                {tx('Das Event wurde gespeichert und ist jetzt in der Verwaltung sichtbar.')}
              </p>
            </div>

            <div className="rounded-2xl border bg-card p-5 space-y-4">
              <h3 className="font-semibold text-foreground">{tx('Zusammenfassung')}</h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <IconCalendarEvent size={18} className="shrink-0 text-primary mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{tx('Event-Titel')}</p>
                    <p className="font-medium text-foreground truncate">{createdEventTitle}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <IconMapPin size={18} className="shrink-0 text-primary mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{tx('Veranstaltungsort')}</p>
                    <p className="font-medium text-foreground truncate">
                      {selectedLocation?.fields.location_name ?? ''}
                      {selectedLocation?.fields.city ? ` · ${selectedLocation.fields.city}` : ''}
                    </p>
                  </div>
                </div>

                {formattedDatetime && (
                  <div className="flex items-start gap-3">
                    <IconCalendarEvent size={18} className="shrink-0 text-primary mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{tx('Datum & Uhrzeit')}</p>
                      <p className="font-medium text-foreground">{formattedDatetime}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <IconTrophy size={18} className="shrink-0 text-primary mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{tx('Kategorie')}</p>
                    <p className="font-medium text-foreground">{categoryLabel}</p>
                  </div>
                </div>

                {maxParticipants && (
                  <div className="flex items-start gap-3">
                    <IconUsers size={18} className="shrink-0 text-primary mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{tx('Max. Teilnehmer')}</p>
                      <p className="font-medium text-foreground">{maxParticipants}</p>
                    </div>
                  </div>
                )}

                {entryFee && (
                  <div className="flex items-start gap-3">
                    <IconCurrencyEuro size={18} className="shrink-0 text-primary mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{tx('Startgebühr')}</p>
                      <p className="font-medium text-foreground">{entryFee} €</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleReset} variant="outline" className="shrink-0">
                {tx('Weiteres Event anlegen')}
              </Button>
              <a href="#/">
                <Button className="shrink-0">
                  {tx('Zurück zum Dashboard')}
                </Button>
              </a>
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
