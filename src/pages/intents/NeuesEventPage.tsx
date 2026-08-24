/**
 * Neues Skateboard-Event anlegen — 3-Schritt-Wizard.
 * Steps: 1) Veranstaltungsort wählen → 2) Event-Details eingeben → 3) Bestätigen & speichern.
 * Reads: skateparksVeranstaltungsorte. Writes: event_verwaltung (createEventVerwaltungEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { useDashboardData } from '@/hooks/useDashboardData';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { tx } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IconMapPin, IconCalendarEvent, IconCheck, IconAlertCircle } from '@tabler/icons-react';

const EVENT_CATEGORIES = LOOKUP_OPTIONS['event_verwaltung']?.['event_category'] ?? [];
const SKILL_LEVELS = LOOKUP_OPTIONS['event_verwaltung']?.['skill_level'] ?? [];

export default function NeuesEventPage() {
  const { skateparksVeranstaltungsorte, loading, error, fetchAll } = useDashboardData();

  // Step management
  const [step, setStep] = useState(1);

  // Step 1 — selected location
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // Step 2 — event details
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

  // Step 3 — submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const selectedLocation = selectedLocationId
    ? skateparksVeranstaltungsorte.find(l => l.record_id === selectedLocationId) ?? null
    : null;

  const detailsValid =
    eventTitle.trim().length > 0 &&
    eventCategoryKey !== '' &&
    eventDatetime !== '' &&
    skillLevelKey !== '' &&
    organizerFirstname.trim().length > 0 &&
    organizerLastname.trim().length > 0 &&
    organizerEmail.trim().length > 0;

  const handleSubmit = async () => {
    if (!selectedLocationId) return;

    // idempotency guard — do not re-create if already succeeded
    if (createdId) {
      window.location.hash = '/';
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await LivingAppsService.createEventVerwaltungEntry({
        event_title: eventTitle.trim(),
        event_description: eventDescription.trim() || undefined,
        event_category: eventCategoryKey,
        event_datetime: eventDatetime,
        skill_level: skillLevelKey,
        max_participants: maxParticipants ? Number(maxParticipants) : undefined,
        entry_fee: entryFee ? Number(entryFee) : undefined,
        location: createRecordUrl(APP_IDS.SKATEPARKS_VERANSTALTUNGSORTE, selectedLocationId),
        organizer_firstname: organizerFirstname.trim(),
        organizer_lastname: organizerLastname.trim(),
        organizer_email: organizerEmail.trim(),
        organizer_phone: organizerPhone.trim() || undefined,
      });
      setCreatedId(result.record_id);
    } catch (_err) {
      setSubmitError(tx('Das Event konnte nicht gespeichert werden. Bitte versuche es erneut.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedLocationId(null);
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
    setCreatedId(null);
  };

  const getCategoryLabel = (key: string) =>
    EVENT_CATEGORIES.find(c => c.key === key)?.label ?? key;

  const getSkillLabel = (key: string) =>
    SKILL_LEVELS.find(s => s.key === key)?.label ?? key;

  return (
    <IntentWizardShell
      title={tx('Neues Event anlegen')}
      subtitle={tx('In drei Schritten zum perfekten Skateboard-Event')}
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
      {/* ─── Schritt 1: Veranstaltungsort wählen ─── */}
      {step === 1 && (
        <EntitySelectStep
          items={skateparksVeranstaltungsorte.map(loc => ({
            id: loc.record_id,
            title: loc.fields.location_name ?? '',
            subtitle: [
              loc.fields.street && loc.fields.house_number
                ? `${loc.fields.street} ${loc.fields.house_number}`
                : loc.fields.street ?? '',
              loc.fields.city ?? '',
            ]
              .filter(Boolean)
              .join(', '),
            icon: <IconMapPin size={20} className="text-primary" />,
          }))}
          onSelect={(id) => {
            setSelectedLocationId(id);
            setStep(2);
          }}
          searchPlaceholder={tx('Ort suchen …')}
          emptyText={tx('Keine Veranstaltungsorte gefunden')}
          emptyIcon={<IconMapPin size={40} className="text-muted-foreground" />}
        />
      )}

      {/* ─── Schritt 2: Event-Details ─── */}
      {step === 2 && (
        selectedLocationId ? (
          <div className="space-y-6">
            {/* Location context */}
            <div className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-3">
              <IconMapPin size={16} className="shrink-0 text-primary" />
              <span className="text-sm font-medium">
                {selectedLocation?.fields.location_name ?? tx('Gewählter Ort')}
              </span>
              {selectedLocation?.fields.city && (
                <span className="text-sm text-muted-foreground">
                  — {selectedLocation.fields.city}
                </span>
              )}
              <button
                className="ml-auto text-xs text-primary underline"
                onClick={() => setStep(1)}
              >
                {tx('Ändern')}
              </button>
            </div>

            {/* Event basics */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {tx('Event-Informationen')}
              </h3>

              <div className="space-y-2">
                <label className="text-sm font-medium">{tx('Titel')} *</label>
                <Input
                  value={eventTitle}
                  onChange={e => setEventTitle(e.target.value)}
                  placeholder={tx('z. B. Stadtpark Jam Session 2026')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{tx('Beschreibung')}</label>
                <Textarea
                  value={eventDescription}
                  onChange={e => setEventDescription(e.target.value)}
                  placeholder={tx('Kurze Beschreibung des Events …')}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{tx('Kategorie')} *</label>
                  <Select value={eventCategoryKey} onValueChange={setEventCategoryKey}>
                    <SelectTrigger>
                      <SelectValue placeholder={tx('Kategorie wählen')} />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_CATEGORIES.map(c => (
                        <SelectItem key={c.key} value={c.key}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{tx('Skill-Level')} *</label>
                  <Select value={skillLevelKey} onValueChange={setSkillLevelKey}>
                    <SelectTrigger>
                      <SelectValue placeholder={tx('Level wählen')} />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_LEVELS.map(s => (
                        <SelectItem key={s.key} value={s.key}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{tx('Datum & Uhrzeit')} *</label>
                <Input
                  type="datetime-local"
                  value={eventDatetime}
                  onChange={e => setEventDatetime(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{tx('Max. Teilnehmer')}</label>
                  <Input
                    type="number"
                    min="1"
                    value={maxParticipants}
                    onChange={e => setMaxParticipants(e.target.value)}
                    placeholder="50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{tx('Startgebühr (€)')}</label>
                  <Input
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

            {/* Organizer */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {tx('Veranstalter')}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{tx('Vorname')} *</label>
                  <Input
                    value={organizerFirstname}
                    onChange={e => setOrganizerFirstname(e.target.value)}
                    placeholder={tx('Vorname')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{tx('Nachname')} *</label>
                  <Input
                    value={organizerLastname}
                    onChange={e => setOrganizerLastname(e.target.value)}
                    placeholder={tx('Nachname')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{tx('E-Mail')} *</label>
                  <Input
                    type="email"
                    value={organizerEmail}
                    onChange={e => setOrganizerEmail(e.target.value)}
                    placeholder={tx('name@beispiel.de')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{tx('Telefon')}</label>
                  <Input
                    type="tel"
                    value={organizerPhone}
                    onChange={e => setOrganizerPhone(e.target.value)}
                    placeholder="+49 …"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                disabled={!detailsValid}
                onClick={() => setStep(3)}
              >
                {tx('Weiter zur Bestätigung')}
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

      {/* ─── Schritt 3: Bestätigung ─── */}
      {step === 3 && (
        selectedLocationId && eventTitle ? (
          createdId ? (
            /* Success state */
            <div className="flex flex-col items-center gap-6 py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <IconCheck size={32} className="text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">{tx('Event erfolgreich angelegt!')}</h2>
                <p className="text-sm text-muted-foreground">
                  {tx('Das Event wurde gespeichert und ist jetzt im System verfügbar.')}
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
          ) : (
            /* Confirmation summary */
            <div className="space-y-6">
              <div className="rounded-2xl border bg-card p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  <IconCalendarEvent size={16} className="shrink-0" />
                  {tx('Zusammenfassung')}
                </div>

                <dl className="space-y-3">
                  <div className="flex justify-between gap-4">
                    <dt className="text-sm text-muted-foreground">{tx('Veranstaltungsort')}</dt>
                    <dd className="text-sm font-medium text-right">
                      {selectedLocation?.fields.location_name ?? '—'}
                      {selectedLocation?.fields.city && (
                        <span className="block text-muted-foreground font-normal">
                          {selectedLocation.fields.city}
                        </span>
                      )}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-sm text-muted-foreground">{tx('Titel')}</dt>
                    <dd className="text-sm font-medium text-right">{eventTitle}</dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-sm text-muted-foreground">{tx('Datum & Uhrzeit')}</dt>
                    <dd className="text-sm font-medium text-right">
                      {eventDatetime
                        ? format(new Date(eventDatetime), "dd.MM.yyyy 'um' HH:mm 'Uhr'")
                        : '—'}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-sm text-muted-foreground">{tx('Kategorie')}</dt>
                    <dd className="text-sm font-medium text-right">
                      {getCategoryLabel(eventCategoryKey)}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-sm text-muted-foreground">{tx('Skill-Level')}</dt>
                    <dd className="text-sm font-medium text-right">
                      {getSkillLabel(skillLevelKey)}
                    </dd>
                  </div>

                  {maxParticipants && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-sm text-muted-foreground">{tx('Max. Teilnehmer')}</dt>
                      <dd className="text-sm font-medium text-right">{maxParticipants}</dd>
                    </div>
                  )}

                  {entryFee && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-sm text-muted-foreground">{tx('Startgebühr')}</dt>
                      <dd className="text-sm font-medium text-right">{entryFee} €</dd>
                    </div>
                  )}

                  <div className="border-t pt-3 flex justify-between gap-4">
                    <dt className="text-sm text-muted-foreground">{tx('Veranstalter')}</dt>
                    <dd className="text-sm font-medium text-right">
                      {organizerFirstname} {organizerLastname}
                      <span className="block text-muted-foreground font-normal">
                        {organizerEmail}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>

              {submitError && (
                <div className="flex items-start gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <IconAlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <Button variant="outline" onClick={() => setStep(2)} disabled={submitting}>
                  {tx('Zurück bearbeiten')}
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? tx('Wird gespeichert …') : tx('Event anlegen')}
                </Button>
              </div>
            </div>
          )
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">
              {tx('Dieser Schritt braucht die Angaben aus den vorherigen Schritten.')}
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
