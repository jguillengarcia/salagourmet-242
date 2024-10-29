import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Calendar from './components/Calendar';
import MyReservations from './components/MyReservations';
import { ReservationProvider } from './context/ReservationContext';

function App() {
  return (
    <ReservationProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Calendar />} />
            <Route path="/my-reservations" element={<MyReservations />} />
          </Routes>
        </Layout>
        <Toaster position="top-center" />
      </Router>
    </ReservationProvider>
  );
}

export default App;