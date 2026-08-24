/**
 * Teilnehmer Anmelden — 3-Schritt-Wizard.
 * Steps: 1) Event auswählen (nur zukünftige) → 2) Teilnehmerdaten eingeben →
 *         3) Haftungserklärung bestätigen & speichern.
 * Reads: eventVerwaltung. Writes: teilnehmerAnmeldung (createTeilnehmerAnmeldungEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */

import { useState } from 'react';
import { format, parseISO, isAfter, startOfDay } from 'date-fns';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { tx } from '@/i18n';
import { formatDate } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconCalendarEvent, IconUser, IconShield, IconCheck } from '@tabler/icons-react';

export default function TeilnehmerAnmeldenPage() {
  const data = useDashboardData();
  const { eventVerwaltung, loading, error, fetchAll } = data;

  const [step, setStep] = useState(1);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

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

  // Step 3 — waiver
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const today = startOfDay(new Date());

  // Filter: only future / ongoing events
  const futureEvents = eventVerwaltung.filter(e => {
    if (!e.fields.event_datetime) return false;
    return isAfter(parseISO(e.fields.event_datetime), today) ||
      format(parseISO(e.fields.event_datetime), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
  });

  const selectedEvent = selectedEventId
    ? eventVerwaltung.find(e => e.record_id === selectedEventId) ?? null
    : null;

  const SKILL_LEVEL_OPTIONS = LOOKUP_OPTIONS['teilnehmer_anmeldung']?.['participant_skill_level'] ?? [];
  const TSHIRT_OPTIONS = LOOKUP_OPTIONS['teilnehmer_anmeldung']?.['tshirt_size'] ?? [];

  const step2Valid =
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    email.trim() !== '' &&
    dateOfBirth !== '' &&
    skillLevel !== '' &&
    emergencyName.trim() !== '' &&
    emergencyPhone.trim() !== '';

  const handleSave = async () => {
    if (!selectedEventId || !waiverAccepted) return;
    setSaving(true);
    setSaveError(null);
    try {
      await LivingAppsService.createTeilnehmerAnmeldungEntry({
        participant_firstname: firstName,
        participant_lastname: lastName,
        participant_email: email,
        participant_phone: phone || undefined,
        date_of_birth: dateOfBirth,
        participant_skill_level: skillLevel,
        tshirt_size: tshirtSize !== 'none' ? tshirtSize : undefined,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        emergency_contact_email: emergencyEmail || undefined,
        waiver_accepted: true,
        event: createRecordUrl(APP_IDS.EVENT_VERWALTUNG, selectedEventId),
      });
      await fetchAll();
      setDone(true);
    } catch (e) {
      setSaveError(tx('Speichern fehlgeschlagen. Bitte erneut versuchen.'));
    } finally {
      setSaving(false);
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
    setSkillLevel('');
    setTshirtSize('none');
    setEmergencyName('');
    setEmergencyPhone('');
    setEmergencyEmail('');
    setWaiverAccepted(false);
    setSaveError(null);
    setDone(false);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border bg-card shadow-lg p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-emerald-100 p-4">
              <IconCheck size={40} className="text-emerald-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-foreground">{tx('Anmeldung erfolgreich!')}</h2>
          <p className="text-sm text-muted-foreground">
            {tx('Die Anmeldung für')} <strong>{selectedEvent?.fields.event_title ?? ''}</strong> {tx('wurde gespeichert.')}
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <Button onClick={handleReset} className="w-full">
              {tx('Weiteren Teilnehmer anmelden')}
            </Button>
            <a href="#/" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
              {tx('Zurück zum Dashboard')}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <IntentWizardShell
      title={tx('Teilnehmer anmelden')}
      subtitle={tx('Schritt für Schritt zur vollständigen Eventanmeldung')}
      steps={[
        { label: tx('Event wählen') },
        { label: tx('Teilnehmerdaten') },
        { label: tx('Haftungserklärung') },
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
              e.fields.event_datetime ? formatDate(e.fields.event_datetime) : null,
              e.fields.event_category?.label,
              e.fields.skill_level?.label,
            ].filter(Boolean).join(' · '),
            icon: <IconCalendarEvent size={20} className="text-primary" />,
          }))}
          onSelect={(id) => {
            setSelectedEventId(id);
            setStep(2);
          }}
          emptyText={tx('Keine zukünftigen Events gefunden')}
          emptyIcon={<IconCalendarEvent size={40} className="text-muted-foreground" />}
        />
      )}

      {/* Step 2 — Teilnehmerdaten */}
      {step === 2 && (
        selectedEventId ? (
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Event summary */}
            <div className="rounded-2xl border bg-secondary/40 p-4 flex items-center gap-3">
              <IconCalendarEvent size={20} className="text-primary shrink-0" />
              <div className="min-w-0">
                <p className="font-medium truncate">{selectedEvent?.fields.event_title}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedEvent?.fields.event_datetime ? formatDate(selectedEvent.fields.event_datetime) : ''}
                  {selectedEvent?.fields.event_category?.label ? ` · ${selectedEvent.fields.event_category.label}` : ''}
                </p>
              </div>
            </div>

            {/* Persönliche Daten */}
            <div className="rounded-2xl border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <IconUser size={18} className="text-primary shrink-0" />
                <h3 className="font-semibold text-foreground">{tx('Persönliche Daten')}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <Label htmlFor="dateOfBirth">{tx('Geburtsdatum')} *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="skillLevel">{tx('Fahrniveau')} *</Label>
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
              <div className="space-y-1.5">
                <Label htmlFor="tshirtSize">{tx('T-Shirt-Größe')}</Label>
                <Select value={tshirtSize} onValueChange={setTshirtSize}>
                  <SelectTrigger id="tshirtSize">
                    <SelectValue placeholder={tx('Größe wählen (optional)')} />
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

            {/* Notfallkontakt */}
            <div className="rounded-2xl border bg-card p-5 space-y-4">
              <h3 className="font-semibold text-foreground">{tx('Notfallkontakt')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="emergencyName">{tx('Name')} *</Label>
                  <Input
                    id="emergencyName"
                    value={emergencyName}
                    onChange={e => setEmergencyName(e.target.value)}
                    placeholder={tx('Vor- und Nachname')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emergencyPhone">{tx('Telefon')} *</Label>
                  <Input
                    id="emergencyPhone"
                    type="tel"
                    value={emergencyPhone}
                    onChange={e => setEmergencyPhone(e.target.value)}
                    placeholder="+49 …"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emergencyEmail">{tx('E-Mail')}</Label>
                <Input
                  id="emergencyEmail"
                  type="email"
                  value={emergencyEmail}
                  onChange={e => setEmergencyEmail(e.target.value)}
                  placeholder={tx('notfall@beispiel.de')}
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="w-full sm:w-auto"
              >
                {tx('Zurück')}
              </Button>
              <Button
                disabled={!step2Valid}
                onClick={() => setStep(3)}
                className="w-full sm:w-auto sm:ml-auto"
              >
                {tx('Weiter zur Haftungserklärung')}
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

      {/* Step 3 — Haftungserklärung */}
      {step === 3 && (
        selectedEventId && step2Valid ? (
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Zusammenfassung */}
            <div className="rounded-2xl border bg-secondary/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <IconUser size={18} className="text-primary shrink-0" />
                <span className="font-medium">{firstName} {lastName}</span>
              </div>
              <p className="text-sm text-muted-foreground pl-7">
                {selectedEvent?.fields.event_title}
                {selectedEvent?.fields.event_datetime ? ` · ${formatDate(selectedEvent.fields.event_datetime)}` : ''}
              </p>
            </div>

            {/* Waiver-Text */}
            <div className="rounded-2xl border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <IconShield size={18} className="text-amber-600 shrink-0" />
                <h3 className="font-semibold text-foreground">{tx('Haftungserklärung')}</h3>
              </div>
              <div className="text-sm text-muted-foreground space-y-3 leading-relaxed max-h-64 overflow-y-auto pr-1">
                <p>
                  {tx('Ich nehme freiwillig an diesem Skateboard-Event teil und erkenne die damit verbundenen Risiken an. Skateboarden ist eine Extremsportart, bei der Verletzungen nicht ausgeschlossen werden können.')}
                </p>
                <p>
                  {tx('Ich bestätige, dass ich körperlich in der Lage bin, an diesem Event teilzunehmen. Ich trage die volle Verantwortung für meine Sicherheit und stimme zu, geeignete Schutzausrüstung (Helm, Knieschoner, Ellbogenschoner) zu tragen.')}
                </p>
                <p>
                  {tx('Der Veranstalter und die beteiligten Personen haften nicht für Verletzungen, Schäden oder Verluste, die sich aus meiner Teilnahme an diesem Event ergeben, soweit dies gesetzlich zulässig ist.')}
                </p>
                <p>
                  {tx('Ich erkläre mich damit einverstanden, dass Fotos und Videos, die während des Events aufgenommen werden, zu Dokumentations- und Werbezwecken verwendet werden dürfen.')}
                </p>
                <p>
                  {tx('Für Minderjährige: Die Zustimmung der Erziehungsberechtigten liegt vor. Der/die Erziehungsberechtigte übernimmt die elterliche Haftungsverantwortung.')}
                </p>
              </div>

              <div className="flex items-start gap-3 pt-2 border-t">
                <Checkbox
                  id="waiver"
                  checked={waiverAccepted}
                  onCheckedChange={(checked) => setWaiverAccepted(checked === true)}
                  className="mt-0.5 shrink-0"
                />
                <Label htmlFor="waiver" className="text-sm leading-relaxed cursor-pointer">
                  {tx('Ich habe die Haftungserklärung gelesen, verstanden und stimme ihr vollständig zu. *')}
                </Label>
              </div>
            </div>

            {saveError && (
              <p className="text-sm text-destructive rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3">
                {saveError}
              </p>
            )}

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                disabled={saving}
                className="w-full sm:w-auto"
              >
                {tx('Zurück')}
              </Button>
              <Button
                disabled={!waiverAccepted || saving}
                onClick={handleSave}
                className="w-full sm:w-auto sm:ml-auto"
              >
                {saving ? tx('Wird gespeichert …') : tx('Anmeldung abschicken')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">{tx('Dieser Schritt braucht die Angaben aus den vorherigen Schritten.')}</p>
            <Button variant="outline" onClick={() => setStep(1)}>{tx('Neu starten')}</Button>
          </div>
        )
      )}
    </IntentWizardShell>
  );
}
