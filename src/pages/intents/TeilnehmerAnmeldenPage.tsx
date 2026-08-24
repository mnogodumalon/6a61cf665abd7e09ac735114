/**
 * Teilnehmer anmelden — 3-Schritt-Wizard.
 * Steps: 1) Event wählen (nur zukünftige Events) → 2) Teilnehmerdaten eintragen → 3) Bestätigung.
 * Reads: eventVerwaltung, skateparksVeranstaltungsorte. Writes: teilnehmerAnmeldung (createTeilnehmerAnmeldungEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */
import { useState } from 'react';
import { format, isAfter, parseISO } from 'date-fns';
import {
  IconCalendarEvent,
  IconUser,
  IconShieldCheck,
  IconCircleCheck,
} from '@tabler/icons-react';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichEventVerwaltung } from '@/lib/enrich';
import type { EnrichedEventVerwaltung } from '@/types/enriched';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { tx, dateFnsLocale } from '@/i18n';
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

const SKILL_LEVEL_OPTIONS = LOOKUP_OPTIONS['teilnehmer_anmeldung']?.['participant_skill_level'] ?? [];
const TSHIRT_OPTIONS = LOOKUP_OPTIONS['teilnehmer_anmeldung']?.['tshirt_size'] ?? [];

export default function TeilnehmerAnmeldenPage() {
  const data = useDashboardData();
  const { eventVerwaltung, skateparksVeranstaltungsorteMap, loading, error, fetchAll } = data;

  // Step state
  const [step, setStep] = useState(1);

  // Step 1: selected event
  const [selectedEvent, setSelectedEvent] = useState<EnrichedEventVerwaltung | null>(null);

  // Step 2: participant form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [skillLevelKey, setSkillLevelKey] = useState(SKILL_LEVEL_OPTIONS[0]?.key ?? '');
  const [tshirtKey, setTshirtKey] = useState('none');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyEmail, setEmergencyEmail] = useState('');
  const [waiverAccepted, setWaiverAccepted] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  // Enrich events
  const enrichedEvents = enrichEventVerwaltung(eventVerwaltung, { skateparksVeranstaltungsorteMap });

  // Filter: only future events
  const now = new Date();
  const futureEvents = enrichedEvents.filter(e => {
    if (!e.fields.event_datetime) return false;
    try {
      return isAfter(parseISO(e.fields.event_datetime), now);
    } catch {
      return false;
    }
  });

  const handleSelectEvent = (id: string) => {
    const ev = futureEvents.find(e => e.record_id === id) ?? null;
    setSelectedEvent(ev);
    setStep(2);
  };

  const step2Valid =
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    email.trim() !== '' &&
    dateOfBirth !== '' &&
    skillLevelKey !== '' &&
    emergencyName.trim() !== '' &&
    emergencyPhone.trim() !== '' &&
    waiverAccepted;

  const handleSubmit = async () => {
    if (!selectedEvent || !step2Valid) return;
    // Idempotency guard: if already created, skip straight to confirmation
    if (createdId) {
      setStep(3);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await LivingAppsService.createTeilnehmerAnmeldungEntry({
        participant_firstname: firstName,
        participant_lastname: lastName,
        participant_email: email,
        participant_phone: phone || undefined,
        date_of_birth: dateOfBirth,
        participant_skill_level: skillLevelKey,
        tshirt_size: tshirtKey !== 'none' ? tshirtKey : undefined,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        emergency_contact_email: emergencyEmail || undefined,
        waiver_accepted: waiverAccepted,
        event: createRecordUrl(APP_IDS.EVENT_VERWALTUNG, selectedEvent.record_id),
      });
      setCreatedId(result.record_id);
      await fetchAll();
      setStep(3);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : tx('Anmeldung fehlgeschlagen. Bitte erneut versuchen.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedEvent(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setDateOfBirth('');
    setSkillLevelKey(SKILL_LEVEL_OPTIONS[0]?.key ?? '');
    setTshirtKey('none');
    setEmergencyName('');
    setEmergencyPhone('');
    setEmergencyEmail('');
    setWaiverAccepted(false);
    setSubmitError(null);
    setCreatedId(null);
  };

  return (
    <IntentWizardShell
      title={tx('Teilnehmer anmelden')}
      subtitle={tx('Event wählen, Daten eintragen und Anmeldung abschicken')}
      steps={[
        { label: tx('Event') },
        { label: tx('Teilnehmer') },
        { label: tx('Bestätigung') },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── Step 1: Event wählen ── */}
      {step === 1 && (
        <EntitySelectStep
          items={futureEvents.map(e => ({
            id: e.record_id,
            title: e.fields.event_title ?? '',
            subtitle: [
              e.fields.event_datetime
                ? format(parseISO(e.fields.event_datetime), 'dd. MMM yyyy, HH:mm', { locale: dateFnsLocale() })
                : '',
              e.fields.skill_level?.label ?? '',
              e.locationName,
            ]
              .filter(Boolean)
              .join(' · '),
            status: e.fields.skill_level
              ? { key: e.fields.skill_level.key, label: e.fields.skill_level.label }
              : undefined,
            icon: <IconCalendarEvent size={20} className="text-primary" />,
          }))}
          onSelect={handleSelectEvent}
          searchPlaceholder={tx('Event suchen …')}
          emptyText={tx('Keine zukünftigen Events gefunden')}
          emptyIcon={<IconCalendarEvent size={40} className="text-muted-foreground" />}
        />
      )}

      {/* ── Step 2: Teilnehmerdaten ── */}
      {step === 2 && (
        selectedEvent ? (
          <div className="space-y-6">
            {/* Event summary */}
            <div className="rounded-2xl border bg-secondary/40 p-4 flex items-start gap-3">
              <IconCalendarEvent size={20} className="text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{selectedEvent.fields.event_title}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedEvent.fields.event_datetime
                    ? format(parseISO(selectedEvent.fields.event_datetime), 'dd. MMM yyyy, HH:mm', { locale: dateFnsLocale() })
                    : ''}
                  {selectedEvent.locationName ? ` · ${selectedEvent.locationName}` : ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto shrink-0 text-xs"
                onClick={() => setStep(1)}
              >
                {tx('Ändern')}
              </Button>
            </div>

            {/* Persönliche Daten */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <IconUser size={16} className="text-primary shrink-0" />
                <h3 className="font-semibold text-sm">{tx('Persönliche Daten')}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="firstName" className="text-xs">{tx('Vorname')} *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder={tx('Vorname')}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lastName" className="text-xs">{tx('Nachname')} *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder={tx('Nachname')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs">{tx('E-Mail')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@beispiel.de" /* i18n-exempt */
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-xs">{tx('Telefon')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+49 …" /* i18n-exempt */
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="dateOfBirth" className="text-xs">{tx('Geburtsdatum')} *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="skillLevel" className="text-xs">{tx('Skill-Level')} *</Label>
                  <Select value={skillLevelKey} onValueChange={setSkillLevelKey}>
                    <SelectTrigger id="skillLevel">
                      <SelectValue placeholder={tx('Skill-Level wählen')} />
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
              <div className="space-y-1 max-w-xs">
                <Label htmlFor="tshirtSize" className="text-xs">{tx('T-Shirt Größe')}</Label>
                <Select value={tshirtKey} onValueChange={setTshirtKey}>
                  <SelectTrigger id="tshirtSize">
                    <SelectValue placeholder={tx('Größe wählen (optional)')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tx('Keine Angabe')}</SelectItem>
                    {TSHIRT_OPTIONS.map(opt => (
                      <SelectItem key={opt.key} value={opt.key}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notfallkontakt */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <IconShieldCheck size={16} className="text-primary shrink-0" />
                <h3 className="font-semibold text-sm">{tx('Notfallkontakt')}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="emergencyName" className="text-xs">{tx('Name')} *</Label>
                  <Input
                    id="emergencyName"
                    value={emergencyName}
                    onChange={e => setEmergencyName(e.target.value)}
                    placeholder={tx('Vor- und Nachname')}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="emergencyPhone" className="text-xs">{tx('Telefon')} *</Label>
                  <Input
                    id="emergencyPhone"
                    type="tel"
                    value={emergencyPhone}
                    onChange={e => setEmergencyPhone(e.target.value)}
                    placeholder="+49 …" /* i18n-exempt */
                  />
                </div>
              </div>
              <div className="space-y-1 max-w-sm">
                <Label htmlFor="emergencyEmail" className="text-xs">{tx('E-Mail')}</Label>
                <Input
                  id="emergencyEmail"
                  type="email"
                  value={emergencyEmail}
                  onChange={e => setEmergencyEmail(e.target.value)}
                  placeholder="notfall@beispiel.de" /* i18n-exempt */
                />
              </div>
            </div>

            {/* Einverständniserklärung */}
            <div className="rounded-2xl border bg-secondary/20 p-4 space-y-3">
              <h3 className="font-semibold text-sm">{tx('Einverständniserklärung')}</h3>
              <p className="text-xs text-muted-foreground">
                {tx('Mit der Teilnahme erkenne ich die Veranstaltungsbedingungen an und nehme an den Aktivitäten auf eigene Gefahr teil.')}
              </p>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="waiver"
                  checked={waiverAccepted}
                  onCheckedChange={v => setWaiverAccepted(v === true)}
                />
                <Label htmlFor="waiver" className="text-sm cursor-pointer">
                  {tx('Ich akzeptiere die Teilnahmebedingungen')} *
                </Label>
              </div>
            </div>

            {submitError && (
              <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2">
                {submitError}
              </p>
            )}

            <div className="flex justify-end">
              <Button
                disabled={!step2Valid || submitting}
                onClick={handleSubmit}
                className="w-full sm:w-auto"
              >
                {submitting ? tx('Wird angemeldet …') : tx('Anmeldung abschicken')}
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

      {/* ── Step 3: Bestätigung ── */}
      {step === 3 && (
        createdId && selectedEvent ? (
          <div className="space-y-6 text-center">
            <div className="flex flex-col items-center gap-3 py-4">
              <IconCircleCheck size={56} className="text-emerald-500" stroke={1.5} />
              <h2 className="text-xl font-bold">{tx('Anmeldung erfolgreich!')}</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                {tx('Die Anmeldung wurde erfolgreich gespeichert.')}
              </p>
            </div>

            <div className="rounded-2xl border bg-secondary/30 p-5 text-left space-y-3 max-w-md mx-auto">
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs text-muted-foreground">{tx('Teilnehmer')}</span>
                <span className="text-sm font-semibold text-right">{firstName} {lastName}</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs text-muted-foreground">{tx('E-Mail')}</span>
                <span className="text-sm truncate">{email}</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-start gap-2">
                <span className="text-xs text-muted-foreground">{tx('Event')}</span>
                <span className="text-sm font-semibold text-right">{selectedEvent.fields.event_title}</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs text-muted-foreground">{tx('Datum')}</span>
                <span className="text-sm">
                  {selectedEvent.fields.event_datetime
                    ? format(parseISO(selectedEvent.fields.event_datetime), 'dd. MMM yyyy, HH:mm', { locale: dateFnsLocale() })
                    : '—'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button onClick={handleReset} variant="outline">
                {tx('Weitere Anmeldung')}
              </Button>
              <Button asChild>
                <a href="#/">{tx('Zurück zum Dashboard')}</a>
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
