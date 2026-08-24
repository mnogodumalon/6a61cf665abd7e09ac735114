/**
 * Teilnehmer anmelden — 3-Schritt-Wizard.
 * Steps: 1) Event wählen (nur zukünftige Events mit freier Kapazität)
 *        → 2) Teilnehmer-Daten erfassen (persönliche Daten + Waiver)
 *        → 3) Notfallkontakt eingeben & anlegen.
 * Reads: eventVerwaltung, teilnehmerAnmeldung, skateparksVeranstaltungsorte.
 * Writes: teilnehmerAnmeldung (createTeilnehmerAnmeldungEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */

import { useState, useMemo } from 'react';
import { isAfter, parseISO, format } from 'date-fns';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { useDashboardData } from '@/hooks/useDashboardData';
import { tx, dateFnsLocale } from '@/i18n';
import { LOOKUP_OPTIONS, APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichEventVerwaltung } from '@/lib/enrich';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconCalendarEvent, IconUser, IconShield, IconCircleCheck } from '@tabler/icons-react';

export default function TeilnehmerAnmeldenPage() {
  const data = useDashboardData();
  const { eventVerwaltung, teilnehmerAnmeldung, skateparksVeranstaltungsorteMap, loading, error, fetchAll } = data;

  // --- wizard state ---
  const [step, setStep] = useState(1);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Schritt 2: Teilnehmer-Daten
  const [participantFirstname, setParticipantFirstname] = useState('');
  const [participantLastname, setParticipantLastname] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [participantPhone, setParticipantPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [skillLevelKey, setSkillLevelKey] = useState('');
  const [tshirtSizeKey, setTshirtSizeKey] = useState('');
  const [waiverAccepted, setWaiverAccepted] = useState(false);

  // Schritt 3: Notfallkontakt
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyEmail, setEmergencyEmail] = useState('');

  // Submit-State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // --- derived data ---
  const enrichedEvents = useMemo(
    () => enrichEventVerwaltung(eventVerwaltung, { skateparksVeranstaltungsorteMap }),
    [eventVerwaltung, skateparksVeranstaltungsorteMap]
  );

  const now = new Date();

  // Zähle aktuelle Teilnehmer pro Event
  const participantCountMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const reg of teilnehmerAnmeldung) {
      const url = reg.fields.event;
      if (!url) continue;
      const match = url.match(/([a-f0-9]{24})$/i);
      const id = match ? match[1] : null;
      if (id) m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  }, [teilnehmerAnmeldung]);

  // Nur zukünftige Events mit freier Kapazität
  const availableEvents = useMemo(() => {
    return enrichedEvents.filter(ev => {
      const dt = ev.fields.event_datetime;
      if (!dt) return false;
      if (!isAfter(parseISO(dt), now)) return false;
      const max = ev.fields.max_participants;
      if (max != null) {
        const current = participantCountMap.get(ev.record_id) ?? 0;
        if (current >= max) return false;
      }
      return true;
    });
  }, [enrichedEvents, participantCountMap, now]);

  const SKILL_LEVELS = LOOKUP_OPTIONS['teilnehmer_anmeldung']?.['participant_skill_level'] ?? [];
  const TSHIRT_SIZES = LOOKUP_OPTIONS['teilnehmer_anmeldung']?.['tshirt_size'] ?? [];

  const selectedEvent = enrichedEvents.find(e => e.record_id === selectedEventId);

  // Schritt 2: Pflichtfelder prüfen
  const step2Valid =
    participantFirstname.trim() !== '' &&
    participantLastname.trim() !== '' &&
    participantEmail.trim() !== '' &&
    dateOfBirth !== '' &&
    skillLevelKey !== '' &&
    waiverAccepted;

  // Schritt 3: Pflichtfelder prüfen
  const step3Valid = emergencyName.trim() !== '' && emergencyPhone.trim() !== '';

  const handleSubmit = async () => {
    if (!selectedEventId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await LivingAppsService.createTeilnehmerAnmeldungEntry({
        event: createRecordUrl(APP_IDS.EVENT_VERWALTUNG, selectedEventId),
        participant_firstname: participantFirstname,
        participant_lastname: participantLastname,
        participant_email: participantEmail,
        participant_phone: participantPhone || undefined,
        date_of_birth: dateOfBirth,
        participant_skill_level: skillLevelKey,
        tshirt_size: tshirtSizeKey !== 'none' && tshirtSizeKey !== '' ? tshirtSizeKey : undefined,
        waiver_accepted: waiverAccepted,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        emergency_contact_email: emergencyEmail || undefined,
      });
      await fetchAll();
      setSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : tx('Fehler beim Speichern'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedEventId(null);
    setParticipantFirstname('');
    setParticipantLastname('');
    setParticipantEmail('');
    setParticipantPhone('');
    setDateOfBirth('');
    setSkillLevelKey('');
    setTshirtSizeKey('');
    setWaiverAccepted(false);
    setEmergencyName('');
    setEmergencyPhone('');
    setEmergencyEmail('');
    setSubmitError(null);
    setSuccess(false);
  };

  // --- success state ---
  if (success) {
    return (
      <IntentWizardShell
        title={tx('Teilnehmer anmelden')}
        subtitle={tx('Anmeldung erfolgreich abgeschlossen')}
        steps={[
          { label: tx('Event wählen') },
          { label: tx('Teilnehmer-Daten') },
          { label: tx('Notfallkontakt') },
        ]}
        currentStep={3}
        onStepChange={setStep}
        loading={loading}
        error={error}
        onRetry={fetchAll}
      >
        <div className="flex flex-col items-center gap-6 py-16 text-center">
          <IconCircleCheck size={64} className="text-emerald-500" stroke={1.5} />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {tx('Anmeldung erfolgreich!')}
            </h2>
            <p className="text-muted-foreground max-w-sm">
              {tx('Die Anmeldung wurde gespeichert.')}{' '}
              {selectedEvent?.fields.event_title && (
                <span className="font-medium text-foreground">{selectedEvent.fields.event_title}</span>
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleReset} variant="default">
              {tx('Weitere Anmeldung')}
            </Button>
            <a href="#/">
              <Button variant="outline">{tx('Zurück zum Dashboard')}</Button>
            </a>
          </div>
        </div>
      </IntentWizardShell>
    );
  }

  return (
    <IntentWizardShell
      title={tx('Teilnehmer anmelden')}
      subtitle={tx('Schritt für Schritt zur Anmeldung')}
      steps={[
        { label: tx('Event wählen') },
        { label: tx('Teilnehmer-Daten') },
        { label: tx('Notfallkontakt') },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── Schritt 1: Event wählen ─────────────────────────────────────── */}
      {step === 1 && (
        <EntitySelectStep
          items={availableEvents.map(ev => {
            const dt = ev.fields.event_datetime;
            const dateStr = dt
              ? format(parseISO(dt), 'dd. MMM yyyy, HH:mm', { locale: dateFnsLocale() })
              : '';
            const current = participantCountMap.get(ev.record_id) ?? 0;
            const max = ev.fields.max_participants;
            const stats = max != null
              ? [{ label: tx('Teilnehmer'), value: `${current} / ${max}` }]
              : [{ label: tx('Teilnehmer'), value: `${current}` }];
            return {
              id: ev.record_id,
              title: ev.fields.event_title ?? ev.record_id,
              subtitle: [dateStr, ev.locationName].filter(Boolean).join(' · '),
              status: ev.fields.event_category
                ? { key: ev.fields.event_category.key, label: ev.fields.event_category.label }
                : undefined,
              stats,
              icon: <IconCalendarEvent size={20} className="text-primary" stroke={1.5} />,
            };
          })}
          onSelect={(id) => {
            setSelectedEventId(id);
            setStep(2);
          }}
          searchPlaceholder={tx('Event suchen …')}
          emptyText={tx('Keine offenen Events gefunden')}
          emptyIcon={<IconCalendarEvent size={48} className="text-muted-foreground" stroke={1.5} />}
        />
      )}

      {/* ── Schritt 2: Teilnehmer-Daten ─────────────────────────────────── */}
      {step === 2 && (
        selectedEventId ? (
          <div className="space-y-6 max-w-lg mx-auto">
            {selectedEvent && (
              <div className="rounded-2xl border bg-secondary/40 p-4 flex items-start gap-3">
                <IconCalendarEvent size={20} className="text-primary shrink-0 mt-0.5" stroke={1.5} />
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{selectedEvent.fields.event_title}</p>
                  {selectedEvent.fields.event_datetime && (
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(selectedEvent.fields.event_datetime), 'dd. MMMM yyyy, HH:mm', { locale: dateFnsLocale() })}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstname">{tx('Vorname')} *</Label>
                  <Input
                    id="firstname"
                    value={participantFirstname}
                    onChange={e => setParticipantFirstname(e.target.value)}
                    placeholder={tx('Vorname')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastname">{tx('Nachname')} *</Label>
                  <Input
                    id="lastname"
                    value={participantLastname}
                    onChange={e => setParticipantLastname(e.target.value)}
                    placeholder={tx('Nachname')}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">{tx('E-Mail')} *</Label>
                <Input
                  id="email"
                  type="email"
                  value={participantEmail}
                  onChange={e => setParticipantEmail(e.target.value)}
                  placeholder={tx('name@beispiel.de')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">{tx('Telefon')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={participantPhone}
                  onChange={e => setParticipantPhone(e.target.value)}
                  placeholder={tx('+49 …')}
                />
              </div>

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
                <Label htmlFor="skill_level">{tx('Skill-Level')} *</Label>
                <Select value={skillLevelKey} onValueChange={setSkillLevelKey}>
                  <SelectTrigger id="skill_level">
                    <SelectValue placeholder={tx('Level wählen …')} />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_LEVELS.map(opt => (
                      <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tshirt_size">{tx('T-Shirt-Größe')}</Label>
                <Select value={tshirtSizeKey || 'none'} onValueChange={v => setTshirtSizeKey(v === 'none' ? '' : v)}>
                  <SelectTrigger id="tshirt_size">
                    <SelectValue placeholder={tx('Größe wählen …')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tx('Keine Angabe')}</SelectItem>
                    {TSHIRT_SIZES.map(opt => (
                      <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start gap-3 rounded-xl border p-4">
                <Checkbox
                  id="waiver"
                  checked={waiverAccepted}
                  onCheckedChange={v => setWaiverAccepted(v === true)}
                  className="mt-0.5 shrink-0"
                />
                <label htmlFor="waiver" className="text-sm text-foreground leading-relaxed cursor-pointer">
                  {tx('Ich akzeptiere die Teilnahmebedingungen und bestätige, dass alle Angaben korrekt sind.')} *
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="w-full sm:w-auto">
                {tx('Zurück')}
              </Button>
              <Button
                disabled={!step2Valid}
                onClick={() => setStep(3)}
                className="w-full sm:w-auto"
              >
                {tx('Weiter zum Notfallkontakt')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">{tx('Bitte wähle zuerst ein Event aus.')}</p>
            <Button variant="outline" onClick={() => setStep(1)}>{tx('Neu starten')}</Button>
          </div>
        )
      )}

      {/* ── Schritt 3: Notfallkontakt ───────────────────────────────────── */}
      {step === 3 && (
        selectedEventId && participantFirstname ? (
          <div className="space-y-6 max-w-lg mx-auto">
            <div className="rounded-2xl border bg-secondary/40 p-4 flex items-start gap-3">
              <IconUser size={20} className="text-primary shrink-0 mt-0.5" stroke={1.5} />
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">
                  {participantFirstname} {participantLastname}
                </p>
                <p className="text-sm text-muted-foreground truncate">{participantEmail}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <IconShield size={16} className="shrink-0" stroke={1.5} />
                <span className="text-sm">{tx('Kontaktperson im Notfall')}</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emg_name">{tx('Name')} *</Label>
                <Input
                  id="emg_name"
                  value={emergencyName}
                  onChange={e => setEmergencyName(e.target.value)}
                  placeholder={tx('Vor- und Nachname')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emg_phone">{tx('Telefon')} *</Label>
                <Input
                  id="emg_phone"
                  type="tel"
                  value={emergencyPhone}
                  onChange={e => setEmergencyPhone(e.target.value)}
                  placeholder={tx('+49 …')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emg_email">{tx('E-Mail')}</Label>
                <Input
                  id="emg_email"
                  type="email"
                  value={emergencyEmail}
                  onChange={e => setEmergencyEmail(e.target.value)}
                  placeholder={tx('name@beispiel.de')}
                />
              </div>
            </div>

            {submitError && (
              <p className="text-sm text-destructive rounded-xl border border-destructive/20 bg-destructive/10 p-3">
                {submitError}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(2)} className="w-full sm:w-auto" disabled={submitting}>
                {tx('Zurück')}
              </Button>
              <Button
                disabled={!step3Valid || submitting}
                onClick={handleSubmit}
                className="w-full sm:w-auto"
              >
                {submitting ? tx('Wird gespeichert …') : tx('Anmeldung abschließen')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">{tx('Dieser Schritt braucht die Daten aus Schritt 1 und 2.')}</p>
            <Button variant="outline" onClick={() => setStep(1)}>{tx('Neu starten')}</Button>
          </div>
        )
      )}
    </IntentWizardShell>
  );
}
