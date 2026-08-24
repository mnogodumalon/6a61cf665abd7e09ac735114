/**
 * Teilnehmer Anmelden — 3-Schritt-Wizard.
 * Steps: 1) Event auswählen (nur zukünftige, Kapazität geprüft) →
 *         2) Teilnehmerdaten erfassen →
 *         3) Haftungsausschluss bestätigen & Anmeldung anlegen.
 * Reads: eventVerwaltung, teilnehmerAnmeldung.
 * Writes: teilnehmerAnmeldung (createTeilnehmerAnmeldungEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */
import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isAfter, parseISO, format } from 'date-fns';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { EventVerwaltung } from '@/types/app';
import { formatDate } from '@/lib/formatters';
import { tx, dateFnsLocale } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  IconCalendarEvent,
  IconUser,
  IconShieldCheck,
  IconCircleCheck,
  IconAlertCircle,
} from '@tabler/icons-react';

export default function TeilnehmerAnmeldenPage() {
  const WIZARD_STEPS = [
  { label: tx('Event') },
  { label: tx('Teilnehmerdaten') },
  { label: tx('Bestätigung') },
];

  const [searchParams] = useSearchParams();
  const initialStep = Math.min(3, Math.max(1, parseInt(searchParams.get('step') ?? '1', 10)));

  const { eventVerwaltung, teilnehmerAnmeldung, loading, error, fetchAll } = useDashboardData();

  // Step navigation
  const [step, setStep] = useState(initialStep);

  // Step 1: Event selection
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Step 2: Participant data
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [skillLevelKey, setSkillLevelKey] = useState('');
  const [tshirtSizeKey, setTshirtSizeKey] = useState('none');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyEmail, setEmergencyEmail] = useState('');

  // Step 3: Waiver + submission
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  // Lookup options (inside component body — locale-aware)
  const SKILL_OPTIONS = LOOKUP_OPTIONS['teilnehmer_anmeldung']?.['participant_skill_level'] ?? [];
  const TSHIRT_OPTIONS = LOOKUP_OPTIONS['teilnehmer_anmeldung']?.['tshirt_size'] ?? [];

  // Count existing registrations per event
  const registrationsPerEvent = useMemo(() => {
    const counts = new Map<string, number>();
    teilnehmerAnmeldung.forEach(r => {
      const eventUrl = r.fields.event;
      if (!eventUrl) return;
      // extract record id from URL
      const parts = eventUrl.split('/');
      const id = parts[parts.length - 1];
      counts.set(id, (counts.get(id) ?? 0) + 1);
    });
    return counts;
  }, [teilnehmerAnmeldung]);

  // Filter: only future events, not over capacity
  const eligibleEvents = useMemo(() => {
    const now = new Date();
    return eventVerwaltung.filter(ev => {
      const dt = ev.fields.event_datetime;
      if (!dt) return false;
      if (!isAfter(parseISO(dt), now)) return false;
      const max = ev.fields.max_participants;
      if (max != null) {
        const booked = registrationsPerEvent.get(ev.record_id) ?? 0;
        if (booked >= max) return false;
      }
      return true;
    });
  }, [eventVerwaltung, registrationsPerEvent]);

  const selectedEvent: EventVerwaltung | undefined = eventVerwaltung.find(
    e => e.record_id === selectedEventId
  );

  const step2Valid =
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    email.trim() !== '' &&
    dateOfBirth !== '' &&
    skillLevelKey !== '' &&
    emergencyName.trim() !== '' &&
    emergencyPhone.trim() !== '';

  const handleSubmit = async () => {
    if (!selectedEventId || !waiverAccepted) return;
    // idempotency guard
    if (createdId) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await LivingAppsService.createTeilnehmerAnmeldungEntry({
        event: createRecordUrl(APP_IDS.EVENT_VERWALTUNG, selectedEventId),
        participant_firstname: firstName.trim(),
        participant_lastname: lastName.trim(),
        participant_email: email.trim(),
        participant_phone: phone.trim() || undefined,
        date_of_birth: dateOfBirth,
        participant_skill_level: skillLevelKey,
        tshirt_size: tshirtSizeKey !== 'none' ? tshirtSizeKey : undefined,
        emergency_contact_name: emergencyName.trim(),
        emergency_contact_phone: emergencyPhone.trim(),
        emergency_contact_email: emergencyEmail.trim() || undefined,
        waiver_accepted: true,
      });
      setCreatedId(result.record_id);
      await fetchAll();
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : tx('Anmeldung fehlgeschlagen. Bitte erneut versuchen.'));
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
    setTshirtSizeKey('none');
    setEmergencyName('');
    setEmergencyPhone('');
    setEmergencyEmail('');
    setWaiverAccepted(false);
    setSubmitError(null);
    setCreatedId(null);
  };

  const formatEventDateTime = (dt?: string) => {
    if (!dt) return '';
    try {
      return format(parseISO(dt), "EEEE, d. MMMM yyyy 'um' HH:mm 'Uhr'", { locale: dateFnsLocale() });
    } catch {
      return formatDate(dt);
    }
  };

  const spotsLeft = (ev: EventVerwaltung) => {
    const max = ev.fields.max_participants;
    if (max == null) return null;
    const booked = registrationsPerEvent.get(ev.record_id) ?? 0;
    return max - booked;
  };

  return (
    <IntentWizardShell
      title={tx('Teilnehmer anmelden')}
      subtitle={tx('In 3 Schritten zur fertigen Anmeldung')}
      steps={WIZARD_STEPS}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── Step 1: Event auswählen ── */}
      {step === 1 && (
        <EntitySelectStep
          items={eligibleEvents.map(ev => {
            const left = spotsLeft(ev);
            return {
              id: ev.record_id,
              title: ev.fields.event_title ?? tx('Unbenanntes Event'),
              subtitle: formatEventDateTime(ev.fields.event_datetime),
              status: ev.fields.event_category
                ? { key: ev.fields.event_category.key, label: ev.fields.event_category.label }
                : undefined,
              stats: [
                ...(ev.fields.skill_level
                  ? [{ label: tx('Level'), value: ev.fields.skill_level.label }]
                  : []),
                ...(left != null
                  ? [{ label: tx('Freie Plätze'), value: String(left) }]
                  : []),
              ],
              icon: <IconCalendarEvent size={20} className="text-primary shrink-0" />,
            };
          })}
          onSelect={(id) => {
            setSelectedEventId(id);
            setStep(2);
          }}
          searchPlaceholder={tx('Event suchen …')}
          emptyText={tx('Keine Events mit freien Plätzen verfügbar.')}
          emptyIcon={<IconCalendarEvent size={40} className="text-muted-foreground" />}
        />
      )}

      {/* ── Step 2: Teilnehmerdaten ── */}
      {step === 2 && (
        selectedEventId ? (
          <div className="space-y-6">
            {/* Event-Kontext */}
            <div className="rounded-2xl border bg-secondary/40 px-4 py-3 flex items-center gap-3">
              <IconCalendarEvent size={20} className="text-primary shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">
                  {selectedEvent?.fields.event_title ?? tx('Event')}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {formatEventDateTime(selectedEvent?.fields.event_datetime)}
                </p>
              </div>
            </div>

            {/* Persönliche Daten */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <IconUser size={16} className="text-primary shrink-0" />
                {tx('Persönliche Daten')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="p-firstname">{tx('Vorname')} *</Label>
                  <Input
                    id="p-firstname"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder={tx('Vorname')}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="p-lastname">{tx('Nachname')} *</Label>
                  <Input
                    id="p-lastname"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder={tx('Nachname')}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="p-email">{tx('E-Mail')} *</Label>
                  <Input
                    id="p-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@beispiel.de" /* i18n-exempt */
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="p-phone">{tx('Telefon')}</Label>
                  <Input
                    id="p-phone"
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+49 …" /* i18n-exempt */
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="p-dob">{tx('Geburtsdatum')} *</Label>
                  <Input
                    id="p-dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="p-skill">{tx('Skill-Level')} *</Label>
                  <Select value={skillLevelKey} onValueChange={setSkillLevelKey}>
                    <SelectTrigger id="p-skill">
                      <SelectValue placeholder={tx('Level wählen …')} />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_OPTIONS.map(o => (
                        <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="p-tshirt">{tx('T-Shirt-Größe')}</Label>
                  <Select value={tshirtSizeKey} onValueChange={setTshirtSizeKey}>
                    <SelectTrigger id="p-tshirt">
                      <SelectValue placeholder={tx('Größe wählen …')} />
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
            </div>

            {/* Notfallkontakt */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <IconAlertCircle size={16} className="text-amber-500 shrink-0" />
                {tx('Notfallkontakt')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="ec-name">{tx('Name')} *</Label>
                  <Input
                    id="ec-name"
                    value={emergencyName}
                    onChange={e => setEmergencyName(e.target.value)}
                    placeholder={tx('Vollständiger Name')}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ec-phone">{tx('Telefon')} *</Label>
                  <Input
                    id="ec-phone"
                    type="tel"
                    value={emergencyPhone}
                    onChange={e => setEmergencyPhone(e.target.value)}
                    placeholder="+49 …" /* i18n-exempt */
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="ec-email">{tx('E-Mail')}</Label>
                  <Input
                    id="ec-email"
                    type="email"
                    value={emergencyEmail}
                    onChange={e => setEmergencyEmail(e.target.value)}
                    placeholder="notfall@beispiel.de" /* i18n-exempt */
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                {tx('Zurück')}
              </Button>
              <Button disabled={!step2Valid} onClick={() => setStep(3)}>
                {tx('Weiter zu Schritt 3')}
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

      {/* ── Step 3: Haftungsausschluss & Bestätigung ── */}
      {step === 3 && (
        selectedEventId && firstName ? (
          createdId ? (
            /* Erfolgs-State */
            <div className="space-y-6 text-center py-8">
              <div className="flex justify-center">
                <IconCircleCheck size={56} className="text-emerald-500" stroke={1.5} />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold">{tx('Anmeldung erfolgreich!')}</h2>
                <p className="text-muted-foreground">
                  {tx('Wir freuen uns auf deine Teilnahme!')}
                </p>
              </div>
              <div className="rounded-2xl border bg-secondary/40 p-4 text-left space-y-2 max-w-sm mx-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{tx('Event')}</span>
                  <span className="font-medium text-right">{selectedEvent?.fields.event_title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{tx('Teilnehmer')}</span>
                  <span className="font-medium">{firstName} {lastName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{tx('Skill-Level')}</span>
                  <span className="font-medium">
                    {SKILL_OPTIONS.find(o => o.key === skillLevelKey)?.label ?? skillLevelKey}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={handleReset}>{tx('Neue Anmeldung')}</Button>
                <a href="#/">
                  <Button variant="outline">{tx('Zurück zum Dashboard')}</Button>
                </a>
              </div>
            </div>
          ) : (
            /* Zusammenfassung + Waiver */
            <div className="space-y-6">
              {/* Zusammenfassung */}
              <div className="rounded-2xl border bg-secondary/40 p-4 space-y-3">
                <h3 className="font-semibold text-sm">{tx('Zusammenfassung')}</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tx('Event')}</span>
                    <span className="font-medium text-right max-w-[60%] truncate">
                      {selectedEvent?.fields.event_title}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tx('Datum')}</span>
                    <span className="font-medium">
                      {formatEventDateTime(selectedEvent?.fields.event_datetime)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tx('Teilnehmer')}</span>
                    <span className="font-medium">{firstName} {lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tx('Skill-Level')}</span>
                    <span className="font-medium">
                      {SKILL_OPTIONS.find(o => o.key === skillLevelKey)?.label ?? skillLevelKey}
                    </span>
                  </div>
                  {tshirtSizeKey !== 'none' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{tx('T-Shirt')}</span>
                      <span className="font-medium">
                        {TSHIRT_OPTIONS.find(o => o.key === tshirtSizeKey)?.label ?? tshirtSizeKey}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Haftungsausschluss */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <IconShieldCheck size={18} className="text-amber-600 shrink-0" />
                  <h3 className="font-semibold text-sm text-amber-800">{tx('Haftungsausschluss')}</h3>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  {tx('Die Teilnahme an dieser Veranstaltung erfolgt auf eigenes Risiko. Der Veranstalter übernimmt keine Haftung für Schäden, Verletzungen oder Unfälle, die im Zusammenhang mit der Veranstaltung entstehen. Mit der Anmeldung bestätige ich, dass ich die Risiken kenne und akzeptiere. Ich bin gesundheitlich in der Lage, an der Veranstaltung teilzunehmen, und habe keine medizinischen Einschränkungen, die meine Teilnahme gefährden könnten. Der Veranstalter behält sich das Recht vor, Teilnehmer aus Sicherheitsgründen von der Veranstaltung auszuschließen.')}
                </p>
              </div>

              {/* Waiver Checkbox */}
              <div className="flex items-start gap-3 rounded-2xl border p-4">
                <Checkbox
                  id="waiver"
                  checked={waiverAccepted}
                  onCheckedChange={checked => setWaiverAccepted(checked === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="waiver" className="text-sm leading-relaxed cursor-pointer">
                  {tx('Ich habe den Haftungsausschluss gelesen und stimme ihm zu. Ich melde mich verbindlich für das Event an.')}
                </Label>
              </div>

              {submitError && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {submitError}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => setStep(2)} disabled={submitting}>
                  {tx('Zurück')}
                </Button>
                <Button
                  disabled={!waiverAccepted || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? tx('Wird angemeldet …') : tx('Jetzt anmelden')}
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
