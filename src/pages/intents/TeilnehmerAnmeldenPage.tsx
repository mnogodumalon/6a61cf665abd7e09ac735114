/**
 * Teilnehmer anmelden — 3-Schritt-Wizard.
 * Steps: 1) Event wählen → 2) Teilnehmerdaten eingeben → 3) Waiver bestätigen & anlegen.
 * Reads: eventVerwaltung, skateparksVeranstaltungsorte. Writes: teilnehmerAnmeldung (createTeilnehmerAnmeldungEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */
import { useState } from 'react';
import { format } from 'date-fns';
import {
  IconCalendarEvent,
  IconUser,
  IconShieldCheck,
  IconCheck,
} from '@tabler/icons-react';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichEventVerwaltung } from '@/lib/enrich';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { LOOKUP_OPTIONS } from '@/types/app';
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
import { Checkbox } from '@/components/ui/checkbox';

const EVENT_APP_ID = '6a61cf4d2c69a785bf2f447f';

const SKILL_LEVEL_OPTIONS = LOOKUP_OPTIONS['teilnehmer_anmeldung']?.['participant_skill_level'] ?? [];
const TSHIRT_OPTIONS = LOOKUP_OPTIONS['teilnehmer_anmeldung']?.['tshirt_size'] ?? [];

export default function TeilnehmerAnmeldenPage() {
  const data = useDashboardData();
  const { eventVerwaltung, skateparksVeranstaltungsorteMap, loading, error, fetchAll } = data;

  const [step, setStep] = useState(1);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Step 2 form state
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [skillLevelKey, setSkillLevelKey] = useState('');
  const [tshirtKey, setTshirtKey] = useState('none');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyEmail, setEmergencyEmail] = useState('');

  // Step 3 state
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const enrichedEvents = enrichEventVerwaltung(eventVerwaltung, { skateparksVeranstaltungsorteMap });

  const selectedEvent = selectedEventId
    ? enrichedEvents.find(e => e.record_id === selectedEventId) ?? null
    : null;

  const step2Valid =
    firstname.trim() &&
    lastname.trim() &&
    email.trim() &&
    dateOfBirth &&
    skillLevelKey &&
    emergencyName.trim() &&
    emergencyPhone.trim();

  const handleSubmit = async () => {
    if (!selectedEventId || !waiverAccepted) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: Record<string, unknown> = {
        participant_firstname: firstname.trim(),
        participant_lastname: lastname.trim(),
        participant_email: email.trim(),
        date_of_birth: dateOfBirth,
        participant_skill_level: skillLevelKey,
        emergency_contact_name: emergencyName.trim(),
        emergency_contact_phone: emergencyPhone.trim(),
        waiver_accepted: true,
        event: createRecordUrl(EVENT_APP_ID, selectedEventId),
      };
      if (phone.trim()) payload.participant_phone = phone.trim();
      if (tshirtKey && tshirtKey !== 'none') payload.tshirt_size = tshirtKey;
      if (emergencyEmail.trim()) payload.emergency_contact_email = emergencyEmail.trim();

      await LivingAppsService.createTeilnehmerAnmeldungEntry(payload as Parameters<typeof LivingAppsService.createTeilnehmerAnmeldungEntry>[0]);
      await fetchAll();
      setSuccess(true);
    } catch {
      setSubmitError(tx('Anmeldung fehlgeschlagen. Bitte versuche es erneut.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedEventId(null);
    setFirstname('');
    setLastname('');
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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl shadow-lg p-10 max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <IconCheck size={32} className="text-emerald-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-foreground">{tx('Anmeldung erfolgreich!')}</h2>
          <p className="text-sm text-muted-foreground">
            {tx('Die Anmeldung wurde gespeichert.')}
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={handleReset} variant="outline">{tx('Weitere Anmeldung')}</Button>
            <a href="#/" className="text-sm text-primary underline underline-offset-2">{tx('Zurück zum Dashboard')}</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <IntentWizardShell
      title={tx('Teilnehmer anmelden')}
      subtitle={tx('Event wählen, Daten eingeben, Waiver bestätigen')}
      steps={[
        { label: tx('Event') },
        { label: tx('Teilnehmerdaten') },
        { label: tx('Waiver') },
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
          items={enrichedEvents.map(e => ({
            id: e.record_id,
            title: e.fields.event_title ?? tx('Unbenanntes Event'),
            subtitle: [
              e.fields.event_datetime
                ? format(new Date(e.fields.event_datetime), 'dd.MM.yyyy HH:mm')
                : null,
              e.locationName || null,
            ]
              .filter(Boolean)
              .join(' · '),
            icon: <IconCalendarEvent size={20} className="text-primary" />,
          }))}
          onSelect={(id) => {
            setSelectedEventId(id);
            setStep(2);
          }}
          searchPlaceholder={tx('Event suchen …')}
          emptyText={tx('Keine Events gefunden')}
        />
      )}

      {/* ── Step 2: Teilnehmerdaten ── */}
      {step === 2 && (
        selectedEventId ? (
          <div className="space-y-6">
            {/* Event-Kontext */}
            {selectedEvent && (
              <div className="rounded-xl border bg-secondary/40 p-4 flex items-center gap-3">
                <IconCalendarEvent size={20} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{selectedEvent.fields.event_title}</p>
                  {selectedEvent.fields.event_datetime && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(selectedEvent.fields.event_datetime), 'dd.MM.yyyy HH:mm')}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <IconUser size={18} className="text-primary shrink-0" />
                <h3 className="font-semibold text-foreground">{tx('Persönliche Daten')}</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstname">{tx('Vorname')} *</Label>
                  <Input
                    id="firstname"
                    value={firstname}
                    onChange={e => setFirstname(e.target.value)}
                    placeholder={tx('Vorname')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastname">{tx('Nachname')} *</Label>
                  <Input
                    id="lastname"
                    value={lastname}
                    onChange={e => setLastname(e.target.value)}
                    placeholder={tx('Nachname')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">{tx('E-Mail')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={tx('name@beispiel.de')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">{tx('Telefon')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+49 …"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="dob">{tx('Geburtsdatum')} *</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="skill">{tx('Skill-Level')} *</Label>
                  <Select value={skillLevelKey} onValueChange={setSkillLevelKey}>
                    <SelectTrigger id="skill">
                      <SelectValue placeholder={tx('Bitte wählen')} />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_LEVEL_OPTIONS.map(o => (
                        <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tshirt">{tx('T-Shirt-Größe')}</Label>
                <Select value={tshirtKey} onValueChange={setTshirtKey}>
                  <SelectTrigger id="tshirt">
                    <SelectValue placeholder={tx('Keine Angabe')} />
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

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2 mb-1">
                <IconShieldCheck size={18} className="text-primary shrink-0" />
                <h3 className="font-semibold text-foreground">{tx('Notfallkontakt')}</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ename">{tx('Name')} *</Label>
                  <Input
                    id="ename"
                    value={emergencyName}
                    onChange={e => setEmergencyName(e.target.value)}
                    placeholder={tx('Vor- und Nachname')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ephone">{tx('Telefon')} *</Label>
                  <Input
                    id="ephone"
                    type="tel"
                    value={emergencyPhone}
                    onChange={e => setEmergencyPhone(e.target.value)}
                    placeholder="+49 …"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="eemail">{tx('E-Mail Notfallkontakt')}</Label>
                <Input
                  id="eemail"
                  type="email"
                  value={emergencyEmail}
                  onChange={e => setEmergencyEmail(e.target.value)}
                  placeholder={tx('kontakt@beispiel.de')}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>{tx('Zurück')}</Button>
              <Button
                disabled={!step2Valid}
                onClick={() => setStep(3)}
                className="flex-1 sm:flex-none"
              >
                {tx('Weiter zu Schritt 3')}
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

      {/* ── Step 3: Waiver ── */}
      {step === 3 && (
        selectedEventId && firstname ? (
          <div className="space-y-6">
            {/* Zusammenfassung */}
            <div className="rounded-xl border bg-secondary/40 p-4 space-y-3">
              <h3 className="font-semibold text-foreground">{tx('Zusammenfassung')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <div>
                  <span className="text-muted-foreground">{tx('Name')}: </span>
                  <span className="font-medium">{firstname} {lastname}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{tx('E-Mail')}: </span>
                  <span className="font-medium">{email}</span>
                </div>
                {phone && (
                  <div>
                    <span className="text-muted-foreground">{tx('Telefon')}: </span>
                    <span className="font-medium">{phone}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">{tx('Geburtsdatum')}: </span>
                  <span className="font-medium">
                    {dateOfBirth ? format(new Date(dateOfBirth + 'T12:00'), 'dd.MM.yyyy') : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">{tx('Skill-Level')}: </span>
                  <span className="font-medium">
                    {SKILL_LEVEL_OPTIONS.find(o => o.key === skillLevelKey)?.label ?? skillLevelKey}
                  </span>
                </div>
                {tshirtKey && tshirtKey !== 'none' && (
                  <div>
                    <span className="text-muted-foreground">{tx('T-Shirt')}: </span>
                    <span className="font-medium">
                      {TSHIRT_OPTIONS.find(o => o.key === tshirtKey)?.label ?? tshirtKey}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">{tx('Notfallkontakt')}: </span>
                  <span className="font-medium">{emergencyName} · {emergencyPhone}</span>
                </div>
                {selectedEvent && (
                  <div className="col-span-full">
                    <span className="text-muted-foreground">{tx('Event')}: </span>
                    <span className="font-medium">{selectedEvent.fields.event_title}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Waiver */}
            <div className="rounded-xl border p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="waiver"
                  checked={waiverAccepted}
                  onCheckedChange={v => setWaiverAccepted(v === true)}
                  className="mt-0.5 shrink-0"
                />
                <Label htmlFor="waiver" className="text-sm leading-relaxed cursor-pointer">
                  {tx('Ich bestätige, dass alle angegebenen Informationen korrekt sind und stimme den Teilnahmebedingungen sowie dem Haftungsausschluss zu. Mir ist bekannt, dass die Teilnahme auf eigenes Risiko erfolgt.')}
                </Label>
              </div>
            </div>

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>{tx('Zurück')}</Button>
              <Button
                disabled={!waiverAccepted || submitting}
                onClick={handleSubmit}
                className="flex-1 sm:flex-none"
              >
                {submitting ? tx('Wird gespeichert …') : tx('Anmeldung abschicken')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">{tx('Dieser Schritt braucht die Daten aus den vorherigen Schritten.')}</p>
            <Button variant="outline" onClick={() => setStep(1)}>{tx('Neu starten')}</Button>
          </div>
        )
      )}
    </IntentWizardShell>
  );
}
