import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.tsx";
import { ResultsPage } from "./components/ResultsPage.tsx";
import { PassageDetailPage } from "./components/PassageDetailPage.tsx";
import { ReportPage } from "./components/ReportPage.tsx";
import { AdminPage } from "./components/AdminPage.tsx";
import { AdminPassageDetailPage } from "./components/AdminPassageDetailPage.tsx";
import { QuitPage } from "./components/QuitPage.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/results/:sessionId" element={<ResultsPage />} />
      <Route path="/results/:sessionId/:passageIndex" element={<PassageDetailPage />} />
      <Route path="/report/:sessionId" element={<ReportPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/admin/passages/:passageId" element={<AdminPassageDetailPage />} />
      <Route path="/quit" element={<QuitPage />} />
    </Routes>
  </BrowserRouter>
);
