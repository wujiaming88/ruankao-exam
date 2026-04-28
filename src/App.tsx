import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Exam from './pages/Exam';
import Result from './pages/Result';
import History from './pages/History';
import Mistakes from './pages/Mistakes';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/exam/:examId" element={<Exam />} />
        <Route path="/result/:recordId" element={<Result />} />
        <Route path="/history" element={<History />} />
        <Route path="/mistakes" element={<Mistakes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
