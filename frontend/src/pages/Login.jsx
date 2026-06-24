import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { post } from "../services/api";
import { useAuth } from "../auth/AuthProvider";
import walletService from "../services/walletService";

export default function Login() {
  const { role } = useParams();
  const navigate = useNavigate();
  const { saveUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMetaMaskConnecting, setIsMetaMaskConnecting] = useState(false);

  useEffect(() => {
    // Check if MetaMask is installed
    if (walletService.isMetaMaskInstalled()) {
      // Auto-connect if previously connected
      walletService.getCurrentAccount().then((address) => {
        if (address) {
          console.log("MetaMask already connected:", address);
        }
      });
    }
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!email) {
        setError("Email is required");
        setLoading(false);
        return;
      }

      const res = await post("/api/auth/login", { email, password });
      
      if (res && res.token) {
        saveUser({ ...res.user, token: res.token });
        // redirect to role-specific panel
        if (res.user.role === "admin") navigate("/admin");
        else if (res.user.role === "seller") navigate("/seller");
        else if (res.user.role === "buyer") navigate("/buyer");
        else navigate("/");
      } else {
        setError(res.error || "Login failed");
      }
    } catch (err) {
      setError("Login error: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const connectMetaMaskLogin = async () => {
    setIsMetaMaskConnecting(true);
    setError("");
    try {
      const wallet = await walletService.connectWallet();
      // For web3 auth, you could sign a message here
      // For now, we'll just show the connected wallet
      alert(`✅ MetaMask Connected: ${wallet.address}\nNetwork: ${wallet.networkName}`);
    } catch (err) {
      setError(err.message || "Failed to connect MetaMask");
    } finally {
      setIsMetaMaskConnecting(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Login as {role}</h2>

      {error && <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>}

      <form onSubmit={submit}>
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {walletService.isMetaMaskInstalled() && (
        <div style={{ marginTop: "20px", padding: "10px", background: "#f0f0f0", borderRadius: "4px" }}>
          <p style={{ marginTop: 0 }}>Or connect with MetaMask:</p>
          <button
            type="button"
            onClick={connectMetaMaskLogin}
            disabled={loading || isMetaMaskConnecting}
            style={{
              width: "100%",
              padding: "10px",
              background: "#f6851b",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            {isMetaMaskConnecting ? "Connecting..." : "🦊 Connect MetaMask"}
          </button>
        </div>
      )}

      <p>
        Don't have an account? <a href={`/register/${role}`}>Register as {role}</a>
      </p>

      {!walletService.isMetaMaskInstalled() && (
        <p style={{ color: "#ff9500", marginTop: "20px" }}>
          💡 MetaMask not detected. Install it from{" "}
          <a href="https://metamask.io" target="_blank" rel="noopener noreferrer">
            metamask.io
          </a>
        </p>
      )}
    </div>
  );
}
