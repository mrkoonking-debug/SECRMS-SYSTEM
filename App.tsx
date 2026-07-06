
import React, { Suspense, lazy, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Loader2 } from 'lucide-react';
import { MockDb } from './services/mockDb';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const ClaimsList = lazy(() => import('./pages/ClaimsList').then(m => ({ default: m.ClaimsList })));
const JobDetail = lazy(() => import('./pages/JobDetail').then(m => ({ default: m.JobDetail })));
const SubmitClaim = lazy(() => import('./pages/SubmitClaim').then(m => ({ default: m.SubmitClaim })));

const DocumentPreview = lazy(() => import('./pages/DocumentPreview').then(m => ({ default: m.DocumentPreview })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const CustomerSearch = lazy(() => import('./pages/CustomerSearch').then(m => ({ default: m.CustomerSearch })));
const CustomerStatus = lazy(() => import('./pages/CustomerStatus').then(m => ({ default: m.CustomerStatus })));
const CustomerSubmit = lazy(() => import('./pages/CustomerSubmit').then(m => ({ default: m.CustomerSubmit })));
const UserManagement = lazy(() => import('./pages/UserManagement').then(m => ({ default: m.UserManagement })));
const LogsManagement = lazy(() => import('./pages/LogsManagement').then(m => ({ default: m.LogsManagement })));
const RecycleBin = lazy(() => import('./pages/RecycleBin').then(m => ({ default: m.RecycleBin })));
const BrandManagement = lazy(() => import('./pages/BrandManagement').then(m => ({ default: m.BrandManagement })));
const DistributorManagement = lazy(() => import('./pages/DistributorManagement').then(m => ({ default: m.DistributorManagement })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const IncomingClaims = lazy(() => import('./pages/IncomingClaims').then(m => ({ default: m.IncomingClaims })));
const EditRMA = lazy(() => import('./pages/EditRMA').then(m => ({ default: m.EditRMA })));
const FinanceLedger = lazy(() => import('./pages/FinanceLedger').then(m => ({ default: m.FinanceLedger })));

const PageLoader = () => (
  <div className="flex items-center justify-center h-full w-full">
    <div className="flex items-center gap-3 bg-white dark:bg-[#1c1c1e] px-6 py-3 rounded-full border border-gray-200 dark:border-[#333] shadow-sm">
      <Loader2 className="w-5 h-5 animate-spin text-[#0071e3]" />
      <span className="text-sm font-medium text-gray-500">Loading...</span>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  useEffect(() => {
    MockDb.getSettings().then(settings => {
      if (settings?.performanceMode) {
        document.documentElement.classList.add('performance-mode');
      } else {
        document.documentElement.classList.remove('performance-mode');
      }
    }).catch(err => console.error("Could not fetch performance mode setting:", err));
  }, []);


  return (
    <div className="relative w-full h-screen h-[100dvh] flex flex-col overflow-hidden bg-gradient-to-br from-[#f5f5f7] via-[#eef0f5] to-[#f0f2f8] dark:bg-gradient-to-br dark:from-[#131314] dark:via-[#0e0e0f] dark:to-[#131314] transition-colors duration-300">
      {isAdmin ? (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full h-full md:p-4 md:gap-4">
          <Navbar embedded={true} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden relative bg-[#f2f2f7]/80 dark:bg-[#17171e]/80 backdrop-blur-xl md:rounded-2xl border-t md:border border-gray-200/50 dark:border-white/[0.08] shadow-sm custom-scrollbar pb-0">
            {/* Ambient Background Glows inspired by modern UI design */}
            <div className="absolute bottom-[-150px] left-[-150px] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-amber-500/15 via-orange-500/5 to-transparent blur-[120px] pointer-events-none -z-10 dark:opacity-75 opacity-25" />
            <div className="absolute top-[-200px] right-[-150px] w-[450px] h-[450px] rounded-full bg-blue-500/10 dark:bg-blue-600/[0.05] blur-[120px] pointer-events-none -z-10 dark:opacity-70 opacity-20" />
            <div className="min-h-full px-1.5 sm:px-4 pt-20 pb-36 md:py-8">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/admin/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/admin/rmas" element={<ProtectedRoute><ClaimsList /></ProtectedRoute>} />
                  <Route path="/admin/incoming" element={<ProtectedRoute><IncomingClaims /></ProtectedRoute>} />
                  <Route path="/admin/job/:jobId" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />
                  <Route path="/admin/rma/:rmaId/edit" element={<ProtectedRoute><EditRMA /></ProtectedRoute>} />
                  <Route path="/admin/submit" element={<ProtectedRoute><SubmitClaim /></ProtectedRoute>} />

                  <Route path="/admin/document/:type/:id" element={<ProtectedRoute><DocumentPreview /></ProtectedRoute>} />
                  <Route path="/admin/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
                  <Route path="/admin/logs" element={<ProtectedRoute><LogsManagement /></ProtectedRoute>} />
                  <Route path="/admin/recycle-bin" element={<ProtectedRoute><RecycleBin /></ProtectedRoute>} />
                  <Route path="/admin/brands" element={<ProtectedRoute><BrandManagement /></ProtectedRoute>} />
                  <Route path="/admin/distributors" element={<ProtectedRoute><DistributorManagement /></ProtectedRoute>} />
                  <Route path="/admin/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                  <Route path="/admin/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
                  <Route path="/admin/finance" element={<ProtectedRoute><FinanceLedger /></ProtectedRoute>} />
                </Routes>
              </Suspense>
            </div>
          </main>
        </div>
      ) : (
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<CustomerSearch />} />
              <Route path="/status" element={<CustomerStatus />} />
              <Route path="/register" element={<CustomerSubmit />} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </Suspense>
        </main>
      )}
    </div>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <LanguageProvider>
      <ThemeProvider>
        <Router>
          <AppContent />
        </Router>
      </ThemeProvider>
    </LanguageProvider>
  </ErrorBoundary>
);

export default App;
