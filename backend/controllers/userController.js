const User = require("../models/User");

const getMe = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const user = await User.findById(req.user._id).select("-passwordHash");
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { name, walletAddress } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (name) user.name = name;
    if (walletAddress) user.walletAddress = walletAddress;
    await user.save();
    res.json({ user: { id: user._id, email: user.email, role: user.role, walletAddress: user.walletAddress, name: user.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getMe, updateProfile };
