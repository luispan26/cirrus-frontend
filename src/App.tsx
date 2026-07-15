import { Navigate, Route, Routes } from 'react-router-dom';
import { SplashPage } from './pages/SplashPage';
import { ScenarioPage } from './pages/ScenarioPage';
import { QuestionsPage } from './pages/QuestionsPage';
import { ChatPage } from './pages/ChatPage';
import { GeneratingPage } from './pages/GeneratingPage';
import { ReportPage } from './pages/ReportPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ServicesPage } from './pages/ServicesPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />
      <Route path="/login" element={<LoginPage mode="login" />} />
      <Route path="/register" element={<LoginPage mode="register" />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/scenario" element={<ScenarioPage />} />
        <Route path="/questions" element={<QuestionsPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/generating" element={<GeneratingPage />} />
        <Route path="/report" element={<ReportPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}