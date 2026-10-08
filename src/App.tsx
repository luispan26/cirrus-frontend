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
import { ProtocolsPage } from './pages/ProtocolsPage';
import { FloorPlanParserTestPage } from './pages/FloorPlanParserTestPage';
import { ZoneBenchMaximizerTestPage } from './pages/ZoneBenchMaximizerTestPage';
import { InventoryPage } from './pages/InventoryPage';
import { EquipmentListsPage } from './pages/EquipmentListsPage';
import { LayoutSandboxPage } from './pages/LayoutSandboxPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ValidatedProtocolsPage } from './pages/ValidatedProtocolsPage';
import { DisclaimerPage } from './pages/DisclaimerPage';

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
        <Route path="/protocols" element={<ProtocolsPage />} />
        <Route path="/floor-plan-parser-test" element={<FloorPlanParserTestPage />} />
        <Route path="/zone-bench-maximizer-test" element={<ZoneBenchMaximizerTestPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/equipment-lists" element={<EquipmentListsPage />} />
        <Route path="/layout-sandbox" element={<LayoutSandboxPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/validated-protocols" element={<ValidatedProtocolsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/disclaimer" element={<DisclaimerPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
