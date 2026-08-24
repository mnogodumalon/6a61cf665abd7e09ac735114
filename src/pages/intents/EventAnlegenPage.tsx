/**
 * Event anlegen — 2-Schritt-Wizard für neue Skatepark-Events.
 * Steps: 1) Location wählen (aus SkateparksVeranstaltungsorte) → 2) Event-Details erfassen & anlegen.
 * Reads: skateparksVeranstaltungsorte. Writes: event_verwaltung (createEventVerwaltungEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { IconMapPin, IconCalendarEvent, IconCheck, IconPlus } from '@tabler/icons-react';
import { tx } from '@/i18n';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function EventAnlegenPage() {
  const { skateparksVeranstaltungsorte, loading, error, fetchAll } = useDashboardData();

  const [step, setStep] = useState(1);

  // Step 1 state
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationCity, setNewLocationCity] = useState('');
  const [newLocationDesc, setNewLocationDesc] = useState('');
  const [createLocationLoading, setCreateLocationLoading] = useState(false);

  // Step 2 state
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
  const [organizerNotes, setOrganizerNotes] = useState('');

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  const EVENT_CATEGORIES = LOOKUP_OPTIONS['event_verwaltung']?.['event_category'] ?? [];
  const SKILL_LEVELS = LOOKUP_OPTIONS['event_verwaltung']?.['skill_level'] ?? [];

  const selectedLocation = skateparksVeranstaltungsorte.find(l => l.record_id === selectedLocationId);

  const handleCreateLocation = async () => {
    if (!newLocationName || !newLocationCity) return;
    setCreateLocationLoading(true);
    try {
      const created = await LivingAppsService.createSkateparksVeranstaltungsorteEntry({
        location_name: newLocationName,
        city: newLocationCity,
        description: newLocationDesc || undefined,
      });
      await fetchAll();
      setShowCreateLocation(false);
      setNewLocationName('');
      setNewLocationCity('');
      setNewLocationDesc('');
      setSelectedLocationId(created.record_id);
      setStep(2);
    } finally {
      setCreateLocationLoading(false);
    }
  };

  const handleSubmitEvent = async () => {
    if (!selectedLocationId || !eventTitle || !eventCategoryKey || !eventDatetime || !skillLevelKey || !organizerFirstname || !organizerLastname || !organizerEmail) return;

    // Idempotency guard: if already created, don't duplicate
    if (createdEventId) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await LivingAppsService.createEventVerwaltungEntry({
        event_title: eventTitle,
        event_description: eventDescription || undefined,
        event_category: eventCategoryKey,
        event_datetime: eventDatetime, // already in yyyy-MM-dd'T'HH:mm from datetime-local input
        skill_level: skillLevelKey,
        max_participants: maxParticipants ? Number(maxParticipants) : undefined,
        entry_fee: entryFee ? Number(entryFee) : undefined,
        location: createRecordUrl(APP_IDS.SKATEPARKS_VERANSTALTUNGSORTE, selectedLocationId),
        organizer_firstname: organizerFirstname,
        organizer_lastname: organizerLastname,
        organizer_email: organizerEmail,
        organizer_phone: organizerPhone || undefined,
        organizer_notes: organizerNotes || undefined,
      });
      setCreatedEventId(created.record_id);
      await fetchAll();
    } catch (e) {
      setSubmitError(tx('Das Event konnte nicht angelegt werden. Bitte versuche es erneut.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedLocationId(null);
    setShowCreateLocation(false);
    setNewLocationName('');
    setNewLocationCity('');
    setNewLocationDesc('');
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
    setOrganizerNotes('');
    setSubmitError(null);
    setCreatedEventId(null);
  };

  const step2Valid =
    !!selectedLocationId &&
    !!eventTitle &&
    !!eventCategoryKey &&
    !!eventDatetime &&
    !!skillLevelKey &&
    !!organizerFirstname &&
    !!organizerLastname &&
    !!organizerEmail;

  return (
    <IntentWizardShell
      title={tx('Neues Event anlegen')}
      subtitle={tx('Skatepark-Event in 2 Schritten erstellen')}
      steps={[{ label: tx('Location') }, { label: tx('Event-Details') }]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── Step 1: Location wählen ── */}
      {step === 1 && (
        <EntitySelectStep
          items={skateparksVeranstaltungsorte.map(loc => ({
            id: loc.record_id,
            title: loc.fields.location_name ?? tx('Unbenannte Location'),
            subtitle: loc.fields.city ?? '',
            icon: <IconMapPin size={20} className="text-primary" />,
          }))}
          onSelect={(id) => {
            setSelectedLocationId(id);
            setStep(2);
          }}
          createLabel={tx('Neue Location anlegen')}
          onCreateNew={() => setShowCreateLocation(true)}
          searchPlaceholder={tx('Location suchen …')}
          emptyText={tx('Noch keine Locations vorhanden')}
          emptyIcon={<IconMapPin size={32} className="text-muted-foreground" />}
          createDialog={showCreateLocation && (
            <div className="rounded-2xl border bg-card p-4 space-y-3 mt-2">
              <p className="text-sm font-medium text-foreground">{tx('Neue Location anlegen')}</p>
              <div className="space-y-2">
                <Label htmlFor="new-loc-name">{tx('Name')} *</Label>
                <Input
                  id="new-loc-name"
                  value={newLocationName}
                  onChange={e => setNewLocationName(e.target.value)}
                  placeholder={tx('z. B. Skatepark Westpark')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-loc-city">{tx('Stadt')} *</Label>
                <Input
                  id="new-loc-city"
                  value={newLocationCity}
                  onChange={e => setNewLocationCity(e.target.value)}
                  placeholder={tx('z. B. München')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-loc-desc">{tx('Beschreibung')}</Label>
                <Textarea
                  id="new-loc-desc"
                  value={newLocationDesc}
                  onChange={e => setNewLocationDesc(e.target.value)}
                  placeholder={tx('Kurze Beschreibung der Location …')}
                  rows={2}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleCreateLocation}
                  disabled={!newLocationName || !newLocationCity || createLocationLoading}
                  size="sm"
                >
                  <IconPlus size={16} className="shrink-0 mr-1" />
                  {createLocationLoading ? tx('Anlegen …') : tx('Anlegen & weiter')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateLocation(false)}
                >
                  {tx('Abbrechen')}
                </Button>
              </div>
            </div>
          )}
        />
      )}

      {/* ── Step 2: Event-Details ── */}
      {step === 2 && (
        selectedLocationId ? (
          <div className="space-y-6">
            {/* Location-Kontext */}
            <div className="rounded-2xl border bg-secondary/40 px-4 py-3 flex items-center gap-3">
              <IconMapPin size={18} className="text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {selectedLocation?.fields.location_name ?? tx('Unbekannte Location')}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedLocation?.fields.city ?? ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto shrink-0"
                onClick={() => setStep(1)}
              >
                {tx('Ändern')}
              </Button>
            </div>

            {/* Erfolgsmeldung */}
            {createdEventId ? (
              <div className="rounded-2xl border bg-card p-6 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-emerald-100 p-3">
                    <IconCheck size={32} className="text-emerald-600" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{tx('Event wurde angelegt!')}</p>
                  <p className="text-sm text-muted-foreground">
                    {tx('Das Event ist jetzt in der Verwaltung sichtbar.')}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button onClick={handleReset}>
                    {tx('Neues Event anlegen')}
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="#/">{tx('Zurück zum Dashboard')}</a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Event-Informationen */}
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <IconCalendarEvent size={16} className="text-primary shrink-0" />
                    {tx('Event-Informationen')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event-title">{tx('Event-Titel')} *</Label>
                  <Input
                    id="event-title"
                    value={eventTitle}
                    onChange={e => setEventTitle(e.target.value)}
                    placeholder={tx('z. B. Sommerjam 2026')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event-desc">{tx('Beschreibung')}</Label>
                  <Textarea
                    id="event-desc"
                    value={eventDescription}
                    onChange={e => setEventDescription(e.target.value)}
                    placeholder={tx('Was erwartet die Teilnehmenden?')}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="event-category">{tx('Kategorie')} *</Label>
                    <Select value={eventCategoryKey} onValueChange={setEventCategoryKey}>
                      <SelectTrigger id="event-category">
                        <SelectValue placeholder={tx('Kategorie wählen')} />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_CATEGORIES.map(opt => (
                          <SelectItem key={opt.key} value={opt.key}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skill-level">{tx('Skill-Level')} *</Label>
                    <Select value={skillLevelKey} onValueChange={setSkillLevelKey}>
                      <SelectTrigger id="skill-level">
                        <SelectValue placeholder={tx('Level wählen')} />
                      </SelectTrigger>
                      <SelectContent>
                        {SKILL_LEVELS.map(opt => (
                          <SelectItem key={opt.key} value={opt.key}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event-datetime">{tx('Datum & Uhrzeit')} *</Label>
                  <Input
                    id="event-datetime"
                    type="datetime-local"
                    value={eventDatetime}
                    onChange={e => setEventDatetime(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-participants">{tx('Max. Teilnehmende')}</Label>
                    <Input
                      id="max-participants"
                      type="number"
                      min="1"
                      value={maxParticipants}
                      onChange={e => setMaxParticipants(e.target.value)}
                      placeholder="50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="entry-fee">{tx('Teilnahmegebühr (€)')}</Label>
                    <Input
                      id="entry-fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={entryFee}
                      onChange={e => setEntryFee(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Organisator */}
                <div className="space-y-1 pt-2">
                  <p className="text-sm font-semibold text-foreground">
                    {tx('Organisator')}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-firstname">{tx('Vorname')} *</Label>
                    <Input
                      id="org-firstname"
                      value={organizerFirstname}
                      onChange={e => setOrganizerFirstname(e.target.value)}
                      placeholder={tx('Vorname')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="org-lastname">{tx('Nachname')} *</Label>
                    <Input
                      id="org-lastname"
                      value={organizerLastname}
                      onChange={e => setOrganizerLastname(e.target.value)}
                      placeholder={tx('Nachname')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-email">{tx('E-Mail')} *</Label>
                  <Input
                    id="org-email"
                    type="email"
                    value={organizerEmail}
                    onChange={e => setOrganizerEmail(e.target.value)}
                    placeholder={tx('name@beispiel.de')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-phone">{tx('Telefon')}</Label>
                  <Input
                    id="org-phone"
                    type="tel"
                    value={organizerPhone}
                    onChange={e => setOrganizerPhone(e.target.value)}
                    placeholder="+49 …"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-notes">{tx('Interne Notizen')}</Label>
                  <Textarea
                    id="org-notes"
                    value={organizerNotes}
                    onChange={e => setOrganizerNotes(e.target.value)}
                    placeholder={tx('Besonderheiten, Anforderungen …')}
                    rows={2}
                  />
                </div>

                {submitError && (
                  <p className="text-sm text-destructive">{submitError}</p>
                )}

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    onClick={handleSubmitEvent}
                    disabled={!step2Valid || submitting}
                    className="w-full sm:w-auto"
                  >
                    <IconCalendarEvent size={16} className="shrink-0 mr-2" />
                    {submitting ? tx('Event wird angelegt …') : tx('Event anlegen')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="w-full sm:w-auto"
                  >
                    {tx('Zurück zur Location-Wahl')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">
              {tx('Dieser Schritt braucht eine Location aus Schritt 1.')}
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
