import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Compressor from './pages/Compressor'
import PromptStudio from './pages/PromptStudio'
import ShareView from './pages/ShareView'
import Landing from './pages/Landing'


function PrivateRoute({ children }) {
  const token = localStorage.getItem('accessToken')
  return token ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <BrowserRouter>
      
<Routes>
  <Route path="/" element={<Landing />} />
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  <Route path="/s/:token" element={<ShareView />} />
  <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
  <Route path="/compress" element={<PrivateRoute><Compressor /></PrivateRoute>} />
  <Route path="/prompts" element={<PrivateRoute><PromptStudio /></PrivateRoute>} />
</Routes>
    </BrowserRouter>
  )
}