// App.jsx

import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import { Toaster } from 'react-hot-toast';
import PageTransition from './components/PageTransition';
import AboutDetail from './pages/AboutDetail';
import Transactions from './pages/Transactions';
import Contact from './pages/Contact';

// This sub-component handles the animation logic
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Home /></PageTransition>} /> 
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
        <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/admin" element={<PageTransition><AdminPanel /></PageTransition>} />
        <Route path="/about-protocol" element={<PageTransition><AboutDetail /></PageTransition>} />
        <Route path="/transactions" element={<PageTransition><Transactions /></PageTransition>} />
        <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <Router>
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          style: { 
            background: '#0a0a0a', 
            color: '#fff', 
            border: '1px solid #27272a', 
            fontSize: '10px', 
            borderRadius: '0' 
          } 
        }} 
      />
      <AnimatedRoutes />
    </Router>
  );
}

export default App;