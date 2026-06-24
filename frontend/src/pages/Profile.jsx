import React, { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthProvider";
import { get, post, put } from "../services/api";

export default function Profile() {
  const { user, saveUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [walletAddress, setWalletAddress] = useState(user?.walletAddress || "");

  useEffect(()=>{ setName(user?.name||""); setWalletAddress(user?.walletAddress||""); }, [user]);

  const save = async () => {
    const res = await put(`/user/me`, { name, walletAddress }, user?.token);
    if (res && !res.error) {
      saveUser({ ...user, name: res.user.name, walletAddress: res.user.walletAddress, token: user.token });
      alert('Profile updated');
    } else alert(res.error || 'Update failed');
  };

  if (!user) return <div>Please login to edit your profile.</div>;

  return (
    <div className="section">
      <h2>Profile</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 480 }}>
        <input placeholder="Display name" value={name} onChange={e=>setName(e.target.value)} />
        <input placeholder="Wallet address" value={walletAddress} onChange={e=>setWalletAddress(e.target.value)} />
        <button className="btn btn-primary" onClick={save}>Save</button>
      </div>
    </div>
  );
}
