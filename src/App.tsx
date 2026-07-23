import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import SkateparksVeranstaltungsortePage from '@/pages/SkateparksVeranstaltungsortePage';
import SkateparksVeranstaltungsorteDetailPage from '@/pages/SkateparksVeranstaltungsorteDetailPage';
import EventVerwaltungPage from '@/pages/EventVerwaltungPage';
import EventVerwaltungDetailPage from '@/pages/EventVerwaltungDetailPage';
import TeilnehmerAnmeldungPage from '@/pages/TeilnehmerAnmeldungPage';
import TeilnehmerAnmeldungDetailPage from '@/pages/TeilnehmerAnmeldungDetailPage';
import PublicFormSkateparksVeranstaltungsorte from '@/pages/public/PublicForm_SkateparksVeranstaltungsorte';
import PublicFormEventVerwaltung from '@/pages/public/PublicForm_EventVerwaltung';
import PublicFormTeilnehmerAnmeldung from '@/pages/public/PublicForm_TeilnehmerAnmeldung';
// <public:imports>
// </public:imports>
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a61cf45b2071fe2be39980d" element={<PublicFormSkateparksVeranstaltungsorte />} />
              <Route path="public/6a61cf4d2c69a785bf2f447f" element={<PublicFormEventVerwaltung />} />
              <Route path="public/6a61cf4f03b573eb0707b89e" element={<PublicFormTeilnehmerAnmeldung />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="skateparks-&-veranstaltungsorte" element={<SkateparksVeranstaltungsortePage />} />
                <Route path="skateparks-&-veranstaltungsorte/:id" element={<SkateparksVeranstaltungsorteDetailPage />} />
                <Route path="event-verwaltung" element={<EventVerwaltungPage />} />
                <Route path="event-verwaltung/:id" element={<EventVerwaltungDetailPage />} />
                <Route path="teilnehmer-anmeldung" element={<TeilnehmerAnmeldungPage />} />
                <Route path="teilnehmer-anmeldung/:id" element={<TeilnehmerAnmeldungDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
