import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { post } from "../services/api";
import { useAuth } from "../auth/AuthProvider";
import walletService from "../services/walletService";

export default function Register() {
  const { role } = useParams();
  const navigate = useNavigate();
  const { saveUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMetaMaskConnecting, setIsMetaMaskConnecting] = useState(false);

  useEffect(() => {
    // Check if MetaMask is installed
    if (walletService.isMetaMaskInstalled()) {
      // Auto-connect if previously connected
      walletService.getCurrentAccount().then((address) => {
        if (address) {
          setWalletAddress(address);
        }
      });
    }
  }, []);

  const connectMetaMask = async () => {
    setIsMetaMaskConnecting(true);
    setError("");
    try {
      const wallet = await walletService.connectWallet();
      setWalletAddress(wallet.address);
    } catch (err) {
      setError(err.message || "Failed to connect MetaMask");
    } finally {
      setIsMetaMaskConnecting(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!name || !email) {
        setError("Name and email are required");
        setLoading(false);
        return;
      }

      if (role !== "admin" && !walletAddress) {
        setError("Wallet address is required for non-admin users");
        setLoading(false);
        return;
      }

      const res = await post("/api/auth/register", {
        name,
        email,
        password,
        role,
        walletAddress: walletAddress || null,
      });

      if (res && res.token) {
        saveUser({ ...res.user, token: res.token });
        navigate(`/${role}`);
      } else {
        setError(res.error || "Registration failed");
      }
    } catch (err) {
      setError("Registration error: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Register as {role}</h2>
      
      {error && <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>}

      <form onSubmit={submit}>
        <div>
          <label>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
        </div>

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

        <div>
          <label>Wallet Address</label>
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <input
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="0x..."
              disabled={loading}
              style={{ flex: 1 }}
            />
            {walletService.isMetaMaskInstalled() && (
              <button
                type="button"
                onClick={connectMetaMask}
                disabled={loading || isMetaMaskConnecting}
                style={{
                  padding: "8px 12px",
                  background: "#f6851b",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {isMetaMaskConnecting ? "Connecting..." : "MetaMask"}
              </button>
            )}
          </div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>
      </form>

      <p>
        Already have an account? <a href={`/login/${role}`}>Login as {role}</a>
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
