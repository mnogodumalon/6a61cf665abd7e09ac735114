/**
 * Teilnehmer Anmelden — 2-Schritt-Wizard.
 * Steps: 1) Event auswählen (nur zukünftige Events) → 2) Teilnehmerdaten & Notfallkontakt eingeben → Bestätigt.
 * Reads: eventVerwaltung, skateparksVeranstaltungsorte. Writes: teilnehmerAnmeldung (createTeilnehmerAnmeldungEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { IconCalendarEvent, IconUser, IconCheck, IconShield } from '@tabler/icons-react';
import { tx } from '@/i18n';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichEventVerwaltung } from '@/lib/enrich';
import type { EnrichedEventVerwaltung } from '@/types/enriched';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const SKILL_LEVEL_OPTIONS = LOOKUP_OPTIONS['teilnehmer_anmeldung']?.['participant_skill_level'] ?? [];
const TSHIRT_OPTIONS = LOOKUP_OPTIONS['teilnehmer_anmeldung']?.['tshirt_size'] ?? [];

export default function TeilnehmerAnmeldenPage() {
  const data = useDashboardData();
  const { eventVerwaltung, skateparksVeranstaltungsorteMap, loading, error, fetchAll } = data;

  // Step state
  const [step, setStep] = useState(1);

  // Step 1 — selected event
  const [selectedEvent, setSelectedEvent] = useState<EnrichedEventVerwaltung | null>(null);

  // Step 2 — participant fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [tshirtSize, setTshirtSize] = useState('none');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyEmail, setEmergencyEmail] = useState('');
  const [waiverAccepted, setWaiverAccepted] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  // Filter: only future events
  const nowStr = format(new Date(), "yyyy-MM-dd'T'HH:mm");
  const enrichedEvents = enrichEventVerwaltung(eventVerwaltung, { skateparksVeranstaltungsorteMap });
  const futureEvents = enrichedEvents.filter(
    e => !!e.fields.event_datetime && e.fields.event_datetime > nowStr
  );

  const handleSelectEvent = (id: string) => {
    const ev = enrichedEvents.find(e => e.record_id === id) ?? null;
    setSelectedEvent(ev);
    setStep(2);
  };

  const canSubmit =
    !!selectedEvent &&
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    email.trim() !== '' &&
    dateOfBirth !== '' &&
    skillLevel !== '' &&
    emergencyName.trim() !== '' &&
    emergencyPhone.trim() !== '' &&
    waiverAccepted;

  const handleSubmit = async () => {
    if (!selectedEvent || !canSubmit) return;
    // idempotency guard — prevent double-create on retry
    if (createdId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await LivingAppsService.createTeilnehmerAnmeldungEntry({
        event: createRecordUrl(APP_IDS.EVENT_VERWALTUNG, selectedEvent.record_id),
        participant_firstname: firstName.trim(),
        participant_lastname: lastName.trim(),
        participant_email: email.trim(),
        participant_phone: phone.trim() || undefined,
        date_of_birth: dateOfBirth,
        participant_skill_level: skillLevel,
        tshirt_size: tshirtSize !== 'none' ? tshirtSize : undefined,
        emergency_contact_name: emergencyName.trim(),
        emergency_contact_phone: emergencyPhone.trim(),
        emergency_contact_email: emergencyEmail.trim() || undefined,
        waiver_accepted: true,
      });
      setCreatedId(result.record_id);
      await fetchAll();
      setStep(3);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : tx('Fehler beim Speichern'));
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
    setSkillLevel('');
    setTshirtSize('none');
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
      subtitle={tx('Event auswählen und Anmeldedaten eintragen')}
      steps={[
        { label: tx('Event') },
        { label: tx('Teilnehmer') },
        { label: tx('Fertig') },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1 — Event auswählen */}
      {step === 1 && (
        <EntitySelectStep
          items={futureEvents.map(e => ({
            id: e.record_id,
            title: e.fields.event_title ?? '',
            subtitle: [
              e.fields.event_datetime ? formatDate(e.fields.event_datetime) : '',
              e.locationName,
            ].filter(Boolean).join(' · '),
            status: e.fields.event_category
              ? { key: e.fields.event_category.key, label: e.fields.event_category.label }
              : undefined,
            stats: e.fields.max_participants
              ? [{ label: tx('Max. Teilnehmer'), value: String(e.fields.max_participants) }]
              : undefined,
            icon: <IconCalendarEvent size={20} className="text-primary" />,
          }))}
          onSelect={handleSelectEvent}
          searchPlaceholder={tx('Event suchen …')}
          emptyText={tx('Keine zukünftigen Events gefunden')}
          emptyIcon={<IconCalendarEvent size={48} className="text-muted-foreground" />}
        />
      )}

      {/* Step 2 — Teilnehmerdaten */}
      {step === 2 && (
        selectedEvent ? (
          <div className="space-y-6">
            {/* Selected event summary */}
            <div className="rounded-2xl border bg-secondary/40 p-4 flex gap-3 items-start">
              <IconCalendarEvent size={20} className="text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{selectedEvent.fields.event_title}</p>
                <p className="text-sm text-muted-foreground">
                  {[
                    selectedEvent.fields.event_datetime ? formatDate(selectedEvent.fields.event_datetime) : '',
                    selectedEvent.locationName,
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>

            {/* Participant data */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <IconUser size={16} className="shrink-0" />
                {tx('Persönliche Daten')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">{tx('Vorname')} *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder={tx('Vorname')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">{tx('Nachname')} *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder={tx('Nachname')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">{tx('E-Mail')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={tx('E-Mail-Adresse')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">{tx('Telefon')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder={tx('Telefonnummer')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dateOfBirth">{tx('Geburtsdatum')} *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="skillLevel">{tx('Fahrkönnen')} *</Label>
                  <Select value={skillLevel} onValueChange={setSkillLevel}>
                    <SelectTrigger id="skillLevel">
                      <SelectValue placeholder={tx('Niveau wählen')} />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_LEVEL_OPTIONS.map(o => (
                        <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5 sm:max-w-[200px]">
                <Label htmlFor="tshirtSize">{tx('T-Shirt-Größe')}</Label>
                <Select value={tshirtSize} onValueChange={setTshirtSize}>
                  <SelectTrigger id="tshirtSize">
                    <SelectValue placeholder={tx('Größe wählen')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tx('Keine Angabe')}</SelectItem>
                    {TSHIRT_OPTIONS.map(o => (
                      <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Emergency contact */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <IconShield size={16} className="shrink-0" />
                {tx('Notfallkontakt')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emergencyName">{tx('Name')} *</Label>
                  <Input
                    id="emergencyName"
                    value={emergencyName}
                    onChange={e => setEmergencyName(e.target.value)}
                    placeholder={tx('Vollständiger Name')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emergencyPhone">{tx('Telefon')} *</Label>
                  <Input
                    id="emergencyPhone"
                    type="tel"
                    value={emergencyPhone}
                    onChange={e => setEmergencyPhone(e.target.value)}
                    placeholder={tx('Telefonnummer')}
                  />
                </div>
              </div>
              <div className="space-y-1.5 sm:max-w-xs">
                <Label htmlFor="emergencyEmail">{tx('E-Mail')}</Label>
                <Input
                  id="emergencyEmail"
                  type="email"
                  value={emergencyEmail}
                  onChange={e => setEmergencyEmail(e.target.value)}
                  placeholder={tx('E-Mail-Adresse')}
                />
              </div>
            </div>

            {/* Waiver */}
            <div className="rounded-2xl border bg-secondary/30 p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="waiver"
                  checked={waiverAccepted}
                  onCheckedChange={val => setWaiverAccepted(val === true)}
                  className="mt-0.5 shrink-0"
                />
                <Label htmlFor="waiver" className="text-sm leading-snug cursor-pointer">
                  {tx('Ich habe die Teilnahmebedingungen und Haftungsausschluss gelesen und stimme diesen zu.')} *
                </Label>
              </div>
            </div>

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={submitting}
              >
                {tx('Zurück')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
              >
                {submitting ? tx('Wird gespeichert …') : tx('Anmeldung abschicken')}
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

      {/* Step 3 — Fertig */}
      {step === 3 && (
        createdId ? (
          <div className="flex flex-col items-center text-center py-10 space-y-5">
            <div className="rounded-full bg-emerald-500/15 p-4">
              <IconCheck size={40} className="text-emerald-600" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-foreground">{tx('Anmeldung erfolgreich!')}</h2>
              <p className="text-muted-foreground">
                {tx('Die Anmeldung von')} <span className="font-medium text-foreground">{firstName} {lastName}</span> {tx('für')} <span className="font-medium text-foreground">{selectedEvent?.fields.event_title ?? ''}</span> {tx('wurde gespeichert.')}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Button onClick={handleReset}>
                {tx('Weitere Anmeldung')}
              </Button>
              <a href="#/">
                <Button variant="outline">{tx('Zurück zum Dashboard')}</Button>
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">{tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}</p>
            <Button variant="outline" onClick={() => setStep(1)}>{tx('Neu starten')}</Button>
          </div>
        )
      )}
    </IntentWizardShell>
  );
}
