import { BrowserRouter, Navigate, Route, Routes, NavLink } from "react-router-dom";
import "./index.css";
import AdminPanel from "./pages/AdminPanel";
import SellerPanel from "./pages/SellerPanel";
import BuyerPanel from "./pages/BuyerPanel";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <header className="header">
          <div>
            <h1>Propyx Escrow</h1>
            <p>Secure Blockchain-Powered Real Estate Transactions</p>
          </div>
          <nav className="escrow-nav">
            <NavLink
              to="/login/admin"
              className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
            >
              Admin Panel
            </NavLink>
            <NavLink
              to="/login/seller"
              className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
            >
              Seller Panel
            </NavLink>
            <NavLink
              to="/login/buyer"
              className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
            >
              Buyer Panel
            </NavLink>
          </nav>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/login/admin" replace />} />
            <Route path="/login/:role" element={<Login />} />
            <Route path="/register/:role" element={<Register />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/seller" element={<SellerPanel />} />
            <Route path="/buyer" element={<BuyerPanel />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>

        <footer className="footer">
          <p>Propyx © 2026 | Powered by Smart Contracts & Immutable Ledger</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;