/**
 * Teilnehmer anmelden — 2-Schritt-Wizard.
 * Steps: 1) Event wählen → 2) Teilnehmer-Daten erfassen & Anmeldung anlegen.
 * Reads: eventVerwaltung. Writes: teilnehmerAnmeldung (createTeilnehmerAnmeldungEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { IconUser, IconShieldCheck } from '@tabler/icons-react';
import { tx } from '@/i18n';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { LOOKUP_OPTIONS } from '@/types/app';
import { formatDate } from '@/lib/formatters';
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

const SKILL_LEVELS = LOOKUP_OPTIONS['teilnehmer_anmeldung']?.['participant_skill_level'] ?? [];
const TSHIRT_SIZES = LOOKUP_OPTIONS['teilnehmer_anmeldung']?.['tshirt_size'] ?? [];
const EVENT_APP_ID = '6a61cf4d2c69a785bf2f447f';

export default function TeilnehmerAnmeldenPage() {
  const data = useDashboardData();
  const { eventVerwaltung, loading, error, fetchAll } = data;

  const [step, setStep] = useState(1);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Step 2 form state
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [skillLevelKey, setSkillLevelKey] = useState('');
  const [tshirtSizeKey, setTshirtSizeKey] = useState('none');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyEmail, setEmergencyEmail] = useState('');
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedEvent = eventVerwaltung.find(e => e.record_id === selectedEventId) ?? null;

  const step2Valid =
    firstname.trim() !== '' &&
    lastname.trim() !== '' &&
    email.trim() !== '' &&
    dateOfBirth !== '' &&
    skillLevelKey !== '' &&
    emergencyName.trim() !== '' &&
    emergencyPhone.trim() !== '' &&
    waiverAccepted;

  const handleSubmit = async () => {
    if (!selectedEventId || !step2Valid) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await LivingAppsService.createTeilnehmerAnmeldungEntry({
        participant_firstname: firstname,
        participant_lastname: lastname,
        participant_email: email,
        participant_phone: phone || undefined,
        date_of_birth: dateOfBirth,
        participant_skill_level: skillLevelKey,
        tshirt_size: tshirtSizeKey !== 'none' ? tshirtSizeKey : undefined,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        emergency_contact_email: emergencyEmail || undefined,
        waiver_accepted: waiverAccepted,
        event: createRecordUrl(EVENT_APP_ID, selectedEventId),
      });
      await fetchAll();
      window.location.hash = '/';
    } catch {
      setSubmitError(tx('Anmeldung fehlgeschlagen. Bitte versuche es erneut.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IntentWizardShell
      title={tx('Teilnehmer anmelden')}
      subtitle={tx('Event auswählen und Teilnehmer-Daten erfassen')}
      steps={[{ label: tx('Event wählen') }, { label: tx('Teilnehmer-Daten') }]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Event wählen */}
      {step === 1 && (
        <EntitySelectStep
          items={eventVerwaltung.map(e => ({
            id: e.record_id,
            title: e.fields.event_title ?? '',
            subtitle: [
              e.fields.event_datetime ? formatDate(e.fields.event_datetime) : null,
              e.fields.event_category?.label ?? null,
            ]
              .filter(Boolean)
              .join(' · '),
            status: e.fields.skill_level
              ? { key: e.fields.skill_level.key, label: e.fields.skill_level.label }
              : undefined,
          }))}
          onSelect={(id) => {
            setSelectedEventId(id);
            setStep(2);
          }}
          searchPlaceholder={tx('Event suchen …')}
          emptyText={tx('Keine Events gefunden')}
        />
      )}

      {/* Step 2: Teilnehmer-Daten erfassen */}
      {step === 2 && (
        selectedEventId ? (
          <div className="space-y-6">
            {/* Event-Kontext */}
            {selectedEvent && (
              <div className="rounded-xl border bg-secondary/40 px-4 py-3 flex items-center gap-3">
                <IconUser size={20} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{selectedEvent.fields.event_title}</p>
                  {selectedEvent.fields.event_datetime && (
                    <p className="text-xs text-muted-foreground">
                      {formatDate(selectedEvent.fields.event_datetime)}
                      {selectedEvent.fields.event_category && ` · ${selectedEvent.fields.event_category.label}`}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Persönliche Daten */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {tx('Persönliche Daten')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="firstname">{tx('Vorname')} *</Label>
                  <Input
                    id="firstname"
                    value={firstname}
                    onChange={e => setFirstname(e.target.value)}
                    placeholder={tx('Vorname')}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lastname">{tx('Nachname')} *</Label>
                  <Input
                    id="lastname"
                    value={lastname}
                    onChange={e => setLastname(e.target.value)}
                    placeholder={tx('Nachname')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="email">{tx('E-Mail')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={tx('mail@example.com')}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">{tx('Telefon')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder={tx('+49 …')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="dob">{tx('Geburtsdatum')} *</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="skill">{tx('Skill-Level')} *</Label>
                  <Select value={skillLevelKey} onValueChange={setSkillLevelKey}>
                    <SelectTrigger id="skill">
                      <SelectValue placeholder={tx('Level wählen')} />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_LEVELS.map(opt => (
                        <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1 max-w-xs">
                <Label htmlFor="tshirt">{tx('T-Shirt-Größe')}</Label>
                <Select value={tshirtSizeKey} onValueChange={setTshirtSizeKey}>
                  <SelectTrigger id="tshirt">
                    <SelectValue placeholder={tx('Größe wählen')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tx('Keine Angabe')}</SelectItem>
                    {TSHIRT_SIZES.map(opt => (
                      <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notfallkontakt */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {tx('Notfallkontakt')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="emergencyName">{tx('Name')} *</Label>
                  <Input
                    id="emergencyName"
                    value={emergencyName}
                    onChange={e => setEmergencyName(e.target.value)}
                    placeholder={tx('Vor- und Nachname')}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="emergencyPhone">{tx('Telefon')} *</Label>
                  <Input
                    id="emergencyPhone"
                    type="tel"
                    value={emergencyPhone}
                    onChange={e => setEmergencyPhone(e.target.value)}
                    placeholder={tx('+49 …')}
                  />
                </div>
              </div>
              <div className="space-y-1 max-w-sm">
                <Label htmlFor="emergencyEmail">{tx('E-Mail')}</Label>
                <Input
                  id="emergencyEmail"
                  type="email"
                  value={emergencyEmail}
                  onChange={e => setEmergencyEmail(e.target.value)}
                  placeholder={tx('mail@example.com')}
                />
              </div>
            </div>

            {/* Haftungsausschluss */}
            <div className="rounded-xl border bg-secondary/30 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <IconShieldCheck size={20} className="text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tx('Ich erkläre mich einverstanden, dass meine Daten für die Anmeldung gespeichert werden. Ich nehme auf eigene Verantwortung teil und entbinde den Veranstalter von jeglicher Haftung.')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="waiver"
                  checked={waiverAccepted}
                  onCheckedChange={(checked) => setWaiverAccepted(checked === true)}
                />
                <Label htmlFor="waiver" className="text-sm font-medium cursor-pointer">
                  {tx('Haftungsausschluss akzeptieren')} *
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
              >
                {tx('Zurück')}
              </Button>
              <Button
                disabled={!step2Valid || submitting}
                onClick={handleSubmit}
              >
                {submitting ? tx('Wird gespeichert …') : tx('Anmeldung abschließen')}
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
