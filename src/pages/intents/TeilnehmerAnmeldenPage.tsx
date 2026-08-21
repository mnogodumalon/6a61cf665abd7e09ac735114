/**
 * Teilnehmer Anmelden — 2-Schritt-Wizard.
 * Steps: 1) Event wählen → 2) Teilnehmerdaten eingeben & absenden.
 * Reads: eventVerwaltung, skateparksVeranstaltungsorte.
 * Writes: teilnehmerAnmeldung (createTeilnehmerAnmeldungEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  IconCalendarEvent,
  IconUser,
  IconCheck,
  IconMapPin,
  IconUsers,
} from '@tabler/icons-react';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichEventVerwaltung } from '@/lib/enrich';
import type { EnrichedEventVerwaltung } from '@/types/enriched';
import { LOOKUP_OPTIONS, APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { tx, dateFnsLocale } from '@/i18n';

const SKILL_LEVEL_OPTIONS = LOOKUP_OPTIONS['teilnehmer_anmeldung']?.['participant_skill_level'] ?? [];
const TSHIRT_OPTIONS = LOOKUP_OPTIONS['teilnehmer_anmeldung']?.['tshirt_size'] ?? [];

export default function TeilnehmerAnmeldenPage() {
  const { eventVerwaltung, skateparksVeranstaltungsorteMap, loading, error, fetchAll } =
    useDashboardData();

  const [step, setStep] = useState(1);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Step 2 form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [skillLevelKey, setSkillLevelKey] = useState('');
  const [tshirtKey, setTshirtKey] = useState('none');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyEmail, setEmergencyEmail] = useState('');
  const [waiverAccepted, setWaiverAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const enrichedEvents: EnrichedEventVerwaltung[] = enrichEventVerwaltung(
    eventVerwaltung,
    { skateparksVeranstaltungsorteMap }
  );

  const selectedEvent = selectedEventId
    ? enrichedEvents.find(e => e.record_id === selectedEventId) ?? null
    : null;

  const step2Valid =
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    email.trim() !== '' &&
    dateOfBirth !== '' &&
    skillLevelKey !== '' &&
    emergencyName.trim() !== '' &&
    emergencyPhone.trim() !== '' &&
    waiverAccepted;

  const handleSelectEvent = (id: string) => {
    setSelectedEventId(id);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!selectedEventId || !step2Valid) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await LivingAppsService.createTeilnehmerAnmeldungEntry({
        participant_firstname: firstName.trim(),
        participant_lastname: lastName.trim(),
        participant_email: email.trim(),
        participant_phone: phone.trim() || undefined,
        date_of_birth: dateOfBirth,
        participant_skill_level: skillLevelKey,
        tshirt_size: tshirtKey !== 'none' ? tshirtKey : undefined,
        emergency_contact_name: emergencyName.trim(),
        emergency_contact_phone: emergencyPhone.trim(),
        emergency_contact_email: emergencyEmail.trim() || undefined,
        waiver_accepted: true,
        event: createRecordUrl(APP_IDS.EVENT_VERWALTUNG, selectedEventId),
      });
      setSuccess(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : tx('Anmeldung fehlgeschlagen. Bitte erneut versuchen.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedEventId(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setDateOfBirth('');
    setSkillLevelKey('');
    setTshirtKey('none');
    setEmergencyName('');
    setEmergencyPhone('');
    setEmergencyEmail('');
    setWaiverAccepted(false);
    setSubmitError(null);
    setSuccess(false);
  };

  return (
    <IntentWizardShell
      title={tx('Teilnehmer anmelden')}
      subtitle={tx('Event wählen und Anmeldung abschließen')}
      steps={[{ label: tx('Event wählen') }, { label: tx('Daten eingeben') }]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Event auswählen */}
      {step === 1 && (
        <EntitySelectStep
          items={enrichedEvents.map(e => {
            const dateLabel = e.fields.event_datetime
              ? format(parseISO(e.fields.event_datetime), 'dd. MMM yyyy, HH:mm', { locale: dateFnsLocale() })
              : tx('Datum unbekannt');
            const participantCount = e.fields.max_participants;
            const stats = participantCount
              ? [{ label: tx('Max. Teilnehmer'), value: String(participantCount) }]
              : [];
            if (e.fields.entry_fee != null && e.fields.entry_fee > 0) {
              stats.push({ label: tx('Startgeld'), value: `${e.fields.entry_fee} €` });
            }
            return {
              id: e.record_id,
              title: e.fields.event_title ?? tx('Unbenanntes Event'),
              subtitle: `${dateLabel}${e.locationName ? ` · ${e.locationName}` : ''}`,
              status: e.fields.event_category
                ? { key: e.fields.event_category.key, label: e.fields.event_category.label }
                : undefined,
              stats,
              icon: <IconCalendarEvent size={20} className="text-primary" />,
            };
          })}
          onSelect={handleSelectEvent}
          searchPlaceholder={tx('Event suchen …')}
          emptyText={tx('Keine Events gefunden')}
          emptyIcon={<IconCalendarEvent size={48} className="text-muted-foreground" />}
        />
      )}

      {/* Step 2: Teilnehmerdaten eingeben */}
      {step === 2 && (
        <>
          {!selectedEvent ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-muted-foreground">
                {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
              </p>
              <Button variant="outline" onClick={() => setStep(1)}>
                {tx('Neu starten')}
              </Button>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center gap-6 py-12 text-center">
              <div className="rounded-full bg-emerald-100 p-4">
                <IconCheck size={40} className="text-emerald-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  {tx('Anmeldung erfolgreich!')}
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {tx('Die Anmeldung für')} <strong>{selectedEvent.fields.event_title}</strong>{' '}
                  {tx('wurde gespeichert.')}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleReset} variant="outline">
                  {tx('Weitere Anmeldung')}
                </Button>
                <a href="#/">
                  <Button>{tx('Zurück zum Dashboard')}</Button>
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Event-Zusammenfassung */}
              <div className="rounded-2xl border bg-secondary/40 p-4 flex gap-3 items-start">
                <IconCalendarEvent size={20} className="text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {selectedEvent.fields.event_title}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                    {selectedEvent.fields.event_datetime && (
                      <span>
                        <IconCalendarEvent size={12} className="inline mr-1" />
                        {format(parseISO(selectedEvent.fields.event_datetime), 'dd. MMM yyyy, HH:mm', { locale: dateFnsLocale() })}
                      </span>
                    )}
                    {selectedEvent.locationName && (
                      <span>
                        <IconMapPin size={12} className="inline mr-1" />
                        {selectedEvent.locationName}
                      </span>
                    )}
                    {selectedEvent.fields.max_participants && (
                      <span>
                        <IconUsers size={12} className="inline mr-1" />
                        {tx('Max.')} {selectedEvent.fields.max_participants} {tx('Teilnehmer')}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-xs"
                  onClick={() => setStep(1)}
                >
                  {tx('Ändern')}
                </Button>
              </div>

              {/* Persönliche Daten */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <IconUser size={16} className="shrink-0" />
                  {tx('Persönliche Daten')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">
                      {tx('Vorname')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder={tx('Max')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">
                      {tx('Nachname')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder={tx('Mustermann')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">
                      {tx('E-Mail')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={tx('max@beispiel.de')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">{tx('Telefon')}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+49 123 456789"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="dob">
                      {tx('Geburtsdatum')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="dob"
                      type="date"
                      value={dateOfBirth}
                      onChange={e => setDateOfBirth(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="skillLevel">
                      {tx('Skill-Level')} <span className="text-destructive">*</span>
                    </Label>
                    <Select value={skillLevelKey} onValueChange={setSkillLevelKey}>
                      <SelectTrigger id="skillLevel">
                        <SelectValue placeholder={tx('Level wählen')} />
                      </SelectTrigger>
                      <SelectContent>
                        {SKILL_LEVEL_OPTIONS.map(o => (
                          <SelectItem key={o.key} value={o.key}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tshirt">{tx('T-Shirt-Größe')}</Label>
                  <Select value={tshirtKey} onValueChange={setTshirtKey}>
                    <SelectTrigger id="tshirt">
                      <SelectValue placeholder={tx('Größe wählen (optional)')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tx('Keine Angabe')}</SelectItem>
                      {TSHIRT_OPTIONS.map(o => (
                        <SelectItem key={o.key} value={o.key}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notfallkontakt */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">
                  {tx('Notfallkontakt')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="emergencyName">
                      {tx('Name')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="emergencyName"
                      value={emergencyName}
                      onChange={e => setEmergencyName(e.target.value)}
                      placeholder={tx('Vollständiger Name')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="emergencyPhone">
                      {tx('Telefon')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="emergencyPhone"
                      type="tel"
                      value={emergencyPhone}
                      onChange={e => setEmergencyPhone(e.target.value)}
                      placeholder="+49 123 456789"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emergencyEmail">{tx('E-Mail (optional)')}</Label>
                  <Input
                    id="emergencyEmail"
                    type="email"
                    value={emergencyEmail}
                    onChange={e => setEmergencyEmail(e.target.value)}
                    placeholder={tx('kontakt@beispiel.de')}
                  />
                </div>
              </div>

              {/* Waiver */}
              <div className="rounded-2xl border p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {tx(
                    'Ich erkläre mich damit einverstanden, dass ich an der Veranstaltung auf eigenes Risiko teilnehme. Der Veranstalter haftet nicht für Schäden, die durch die Teilnahme entstehen.'
                  )}
                </p>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="waiver"
                    checked={waiverAccepted}
                    onCheckedChange={v => setWaiverAccepted(v === true)}
                  />
                  <Label htmlFor="waiver" className="cursor-pointer text-sm font-medium">
                    {tx('Ich akzeptiere die Teilnahmebedingungen')} <span className="text-destructive">*</span>
                  </Label>
                </div>
              </div>

              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={submitting}
                >
                  {tx('Zurück')}
                </Button>
                <Button
                  className="flex-1"
                  disabled={!step2Valid || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? tx('Wird gespeichert …') : tx('Anmeldung abschicken')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </IntentWizardShell>
  );
}
