import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from "./pages/Login"


function App() {

  return (
    //  <RouterProvider router={router} />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        {/* Add more routes here as needed */}
      </Routes>
    </BrowserRouter>
  
    )
}



export default App
