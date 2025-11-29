import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.tsx";
import { ResultsPage } from "./components/ResultsPage.tsx";
import { PassageDetailPage } from "./components/PassageDetailPage.tsx";
import { AdminPage } from "./components/AdminPage.tsx";
import { QuitPage } from "./components/QuitPage.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/results/:sessionId" element={<ResultsPage />} />
      <Route path="/results/:sessionId/:passageIndex" element={<PassageDetailPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/quit" element={<QuitPage />} />
    </Routes>
  </BrowserRouter>
);
