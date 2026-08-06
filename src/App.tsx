import '@/lib/sentry';
import '@/lib/stale-bundle';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import PublicPagesAdmin from '@/pages/PublicPagesAdmin';
import SkateparksVeranstaltungsortePage from '@/pages/SkateparksVeranstaltungsortePage';
import SkateparksVeranstaltungsorteDetailPage from '@/pages/SkateparksVeranstaltungsorteDetailPage';
import EventVerwaltungPage from '@/pages/EventVerwaltungPage';
import EventVerwaltungDetailPage from '@/pages/EventVerwaltungDetailPage';
import TeilnehmerAnmeldungPage from '@/pages/TeilnehmerAnmeldungPage';
import TeilnehmerAnmeldungDetailPage from '@/pages/TeilnehmerAnmeldungDetailPage';
// <custom:imports>
const EventAnmeldenPage = lazy(() => import('@/pages/intents/EventAnmeldenPage'));
// </custom:imports>

// Lazy: public pages live outside <Layout> and only load on /#/public/:slug —
// dashboard users never pay for them, anonymous visitors skip the dashboard.
const PublicPage = lazy(() => import('@/pages/public/PublicPage'));

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/:slug" element={<Suspense fallback={null}><PublicPage /></Suspense>} />
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="skateparks-veranstaltungsorte" element={<SkateparksVeranstaltungsortePage />} />
                <Route path="skateparks-veranstaltungsorte/:id" element={<SkateparksVeranstaltungsorteDetailPage />} />
                <Route path="event-verwaltung" element={<EventVerwaltungPage />} />
                <Route path="event-verwaltung/:id" element={<EventVerwaltungDetailPage />} />
                <Route path="teilnehmer-anmeldung" element={<TeilnehmerAnmeldungPage />} />
                <Route path="teilnehmer-anmeldung/:id" element={<TeilnehmerAnmeldungDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                <Route path="verwaltung/oeffentliche-seiten" element={<PublicPagesAdmin />} />
                {/* <custom:routes> */}
                <Route path="intents/event-anmelden" element={<Suspense fallback={null}><EventAnmeldenPage /></Suspense>} />
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
