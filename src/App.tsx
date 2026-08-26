import { Navigate, Route, Routes } from 'react-router-dom';
import { SplashPage } from './pages/SplashPage';
import { ScenarioPage } from './pages/ScenarioPage';
import { QuestionsPage } from './pages/QuestionsPage';
import { ChatPage } from './pages/ChatPage';
import { GeneratingPage } from './pages/GeneratingPage';
import { ReportPage } from './pages/ReportPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DesignHistoryPage } from './pages/DesignHistoryPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ServicesPage } from './pages/ServicesPage';
import { ProtocolsTestPage } from './pages/ProtocolsTestPage';
import { FloorPlanParserTestPage } from './pages/FloorPlanParserTestPage';
import { ZoneGenerationTestPage } from './pages/ZoneGenerationTestPage';
import { BenchPlacementTestPage } from './pages/BenchPlacementTestPage';
import { InventoryPage } from './pages/InventoryPage';
import { StationsPage } from './pages/StationsPage';
import { LayoutSandboxPage } from './pages/LayoutSandboxPage';
import { LayoutCandidatesPage } from './pages/LayoutCandidatesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />
      <Route path="/login" element={<LoginPage mode="login" />} />
      <Route path="/register" element={<LoginPage mode="register" />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/history" element={<DesignHistoryPage />} />
        <Route path="/scenario" element={<ScenarioPage />} />
        <Route path="/questions" element={<QuestionsPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/generating" element={<GeneratingPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/protocols-test" element={<ProtocolsTestPage />} />
        <Route path="/floor-plan-parser-test" element={<FloorPlanParserTestPage />} />
        <Route path="/zone-generation-test" element={<ZoneGenerationTestPage />} />
        <Route path="/bench-placement-test" element={<BenchPlacementTestPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/stations" element={<StationsPage />} />
        <Route path="/layout-sandbox" element={<LayoutSandboxPage />} />
        <Route path="/layout-candidates" element={<LayoutCandidatesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
