import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import RoleRoute from './components/RoleRoute';
import AdminDashboard from './pages/AdminDashboard';
import Interviews from './pages/Interviews';
import CreateInterview from './pages/CreateInterview';
import InterviewDetail from './pages/InterviewDetail';
import Questions from './pages/Questions';
import QuestionForm from './pages/QuestionForm';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import './App.css'

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <div className="min-h-screen bg-slate-900 text-white">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Protected Role-Based Routes */}
              <Route element={<RoleRoute allowedRoles={['HR', 'ADMIN']} />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/interviews/create" element={<CreateInterview />} />
              </Route>

              <Route element={<RoleRoute allowedRoles={['HR', 'INTERVIEWER', 'INTERVIEWEE']} />}>
                <Route path="/interviews" element={<Interviews />} />
                <Route path="/interviews/:id" element={<InterviewDetail />} />
              </Route>

              {/* Question Bank Routes - HR & Interviewer only */}
              <Route element={<RoleRoute allowedRoles={['HR', 'INTERVIEWER']} />}>
                <Route path="/questions" element={<Questions />} />
                <Route path="/questions/create" element={<QuestionForm />} />
                <Route path="/questions/:id/edit" element={<QuestionForm />} />
              </Route>          </Routes>
          </div>
        </SocketProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
