import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/DatePicker';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a61cf4f03b573eb0707b89e';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormTeilnehmerAnmeldung() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Teilnehmer-Anmeldung — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="participant_firstname">Vorname *</Label>
            <Input
              id="participant_firstname"
              placeholder=""
              value={fields.participant_firstname ?? ''}
              onChange={e => setFields(f => ({ ...f, participant_firstname: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="participant_lastname">Nachname *</Label>
            <Input
              id="participant_lastname"
              placeholder=""
              value={fields.participant_lastname ?? ''}
              onChange={e => setFields(f => ({ ...f, participant_lastname: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="participant_email">E-Mail-Adresse *</Label>
            <Input
              id="participant_email"
              type="email"
              placeholder=""
              value={fields.participant_email ?? ''}
              onChange={e => setFields(f => ({ ...f, participant_email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="participant_phone">Telefonnummer</Label>
            <Input
              id="participant_phone"
              value={fields.participant_phone ?? ''}
              onChange={e => setFields(f => ({ ...f, participant_phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date_of_birth">Geburtsdatum *</Label>
            <DatePicker
              id="date_of_birth"
              placeholder=""
              mode="date"
              value={fields.date_of_birth ?? null}
              onChange={v => setFields(f => ({ ...f, date_of_birth: v ?? undefined }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="participant_skill_level">Eigener Schwierigkeitsgrad *</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.participant_skill_level) === 'intermediate'}
                onClick={() => setFields(f => ({ ...f, participant_skill_level: (lookupKey(f.participant_skill_level) === 'intermediate' ? undefined : 'intermediate') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.participant_skill_level) === 'intermediate'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Fortgeschrittene
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.participant_skill_level) === 'advanced'}
                onClick={() => setFields(f => ({ ...f, participant_skill_level: (lookupKey(f.participant_skill_level) === 'advanced' ? undefined : 'advanced') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.participant_skill_level) === 'advanced'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Profi
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.participant_skill_level) === 'beginner'}
                onClick={() => setFields(f => ({ ...f, participant_skill_level: (lookupKey(f.participant_skill_level) === 'beginner' ? undefined : 'beginner') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.participant_skill_level) === 'beginner'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Anfänger
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_name">Name des Notfallkontakts *</Label>
            <Input
              id="emergency_contact_name"
              placeholder=""
              value={fields.emergency_contact_name ?? ''}
              onChange={e => setFields(f => ({ ...f, emergency_contact_name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_phone">Telefonnummer des Notfallkontakts *</Label>
            <Input
              id="emergency_contact_phone"
              value={fields.emergency_contact_phone ?? ''}
              onChange={e => setFields(f => ({ ...f, emergency_contact_phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tshirt_size">T-Shirt-Größe</Label>
            <Select
              value={lookupKey(fields.tshirt_size) ?? ''}
              onValueChange={v => setFields(f => ({ ...f, tshirt_size: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="tshirt_size" className="max-sm:h-11"><SelectValue placeholder="" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="xs">XS</SelectItem>
                <SelectItem value="s">S</SelectItem>
                <SelectItem value="m">M</SelectItem>
                <SelectItem value="l">L</SelectItem>
                <SelectItem value="xl">XL</SelectItem>
                <SelectItem value="xxl">XXL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="waiver_accepted">Ich akzeptiere die Teilnahmebedingungen *</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="waiver_accepted"
                checked={!!fields.waiver_accepted}
                onCheckedChange={(v) => setFields(f => ({ ...f, waiver_accepted: !!v }))}
              />
              <Label htmlFor="waiver_accepted" className="font-normal">Ich akzeptiere die Teilnahmebedingungen</Label>
            </div>
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
