"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { 
  Users, 
  UserCheck, 
  ShieldCheck, 
  KeyRound, 
  Plus, 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert,
  UserPlus,
  RefreshCw,
  Mail,
  Lock
} from "lucide-react";

export default function AdminUserManagementPage() {
  const { user } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Create User Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("admin");
  const [creating, setCreating] = useState(false);

  // Change Password Modal state
  const [selectedUserForPassword, setSelectedUserForPassword] = useState(null);
  const [changePasswordVal, setChangePasswordVal] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Toggle Role loading state
  const [updatingRoleUid, setUpdatingRoleUid] = useState(null);

  const fetchUsers = async () => {
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/users", {
        headers: { "Authorization": `Bearer ${idToken}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load user database.");

      setUsers(data.users || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    setSuccess("");

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          name: newName,
          role: newRole
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user.");

      setSuccess(`User ${newEmail} created successfully as ${newRole.toUpperCase()}!`);
      setShowCreateModal(false);
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewRole("admin");
      await fetchUsers();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create user.");
    } finally {
      setCreating(false);
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserForPassword) return;

    setChangingPassword(true);
    setError("");
    setSuccess("");

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          uid: selectedUserForPassword.uid,
          newPassword: changePasswordVal
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password.");

      setSuccess(`Password updated successfully for ${selectedUserForPassword.email}!`);
      setSelectedUserForPassword(null);
      setChangePasswordVal("");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleToggleRole = async (targetUser) => {
    const targetRole = targetUser.role === "admin" ? "customer" : "admin";
    if (!confirm(`Are you sure you want to change ${targetUser.email}'s role to ${targetRole.toUpperCase()}?`)) return;

    setUpdatingRoleUid(targetUser.uid);
    setError("");
    setSuccess("");

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          uid: targetUser.uid,
          newRole: targetRole
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user role.");

      setSuccess(`User ${targetUser.email} is now an ${targetRole.toUpperCase()}!`);
      await fetchUsers();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update user role.");
    } finally {
      setUpdatingRoleUid(null);
    }
  };

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (u.uid || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (roleFilter === "admin") return matchesSearch && u.role === "admin";
    if (roleFilter === "customer") return matchesSearch && u.role !== "admin";
    return matchesSearch;
  });

  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === "admin").length;
  const customerCount = users.filter(u => u.role !== "admin").length;

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "hsl(var(--accent-hsl))", letterSpacing: "0.05em", display: "block", marginBottom: "0.25rem" }}>
            Security & Administration
          </span>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "0.25rem", color: "hsl(var(--primary-hsl))", letterSpacing: "-0.02em" }}>
            Customer & Admin Management
          </h1>
          <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.95rem" }}>
            Manage store administrators, customer accounts, assign roles, and update passwords.
          </p>
        </div>

        <button
          onClick={() => {
            setShowCreateModal(true);
            setError("");
          }}
          className="btn btn-primary"
          style={{ padding: "0.7rem 1.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <UserPlus size={18} /> Add New User / Admin
        </button>
      </div>

      {success && (
        <div className="card" style={{ borderColor: "hsl(var(--success-hsl))", backgroundColor: "hsl(var(--success-hsl) / 0.05)", padding: "1rem 1.5rem", marginBottom: "1.5rem", color: "hsl(var(--success-hsl))", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CheckCircle2 size={18} /> {success}
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: "hsl(var(--destructive-hsl))", backgroundColor: "hsl(var(--destructive-hsl) / 0.05)", padding: "1rem 1.5rem", marginBottom: "1.5rem", color: "hsl(var(--destructive-hsl))", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Metrics Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ padding: "0.75rem", borderRadius: "var(--radius-md)", backgroundColor: "hsl(var(--primary-hsl) / 0.1)", color: "hsl(var(--primary-hsl))" }}>
            <Users size={24} />
          </div>
          <div>
            <p style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>Total Accounts</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 900, color: "hsl(var(--primary-hsl))" }}>{totalUsers}</p>
          </div>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ padding: "0.75rem", borderRadius: "var(--radius-md)", backgroundColor: "hsl(var(--accent-hsl) / 0.15)", color: "hsl(var(--accent-hsl))" }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <p style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>Administrators</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 900, color: "hsl(var(--accent-hsl))" }}>{adminCount}</p>
          </div>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ padding: "0.75rem", borderRadius: "var(--radius-md)", backgroundColor: "hsl(var(--success-hsl) / 0.1)", color: "hsl(var(--success-hsl))" }}>
            <UserCheck size={24} />
          </div>
          <div>
            <p style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>Registered Customers</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 900, color: "hsl(var(--success-hsl))" }}>{customerCount}</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ marginBottom: "1.5rem", padding: "1rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ position: "relative", minWidth: "280px", flexGrow: 1 }}>
          <input
            className="input"
            placeholder="Search by email, name, or UID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "2.25rem" }}
          />
          <Search size={16} style={{ position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)", color: "hsl(var(--muted-hsl))" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "hsl(var(--muted-hsl))" }}>Filter Role:</span>
          <select className="input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ width: "auto" }}>
            <option value="all">All Roles ({users.length})</option>
            <option value="admin">Admins Only ({adminCount})</option>
            <option value="customer">Customers Only ({customerCount})</option>
          </select>

          <button onClick={fetchUsers} className="btn btn-outline" style={{ padding: "0.6rem 0.85rem" }} title="Refresh Users">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "hsl(var(--muted-hsl))" }}>
          <Loader2 className="animate-spin" size={24} style={{ display: "inline-block", marginRight: "0.5rem", animation: "spin 1s linear infinite" }} /> Loading user accounts...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "hsl(var(--muted-hsl))", fontWeight: 600 }}>No user accounts found matching your query.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid hsl(var(--border-hsl))", backgroundColor: "hsl(var(--secondary-hsl) / 0.4)", color: "hsl(var(--muted-hsl))", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>
                  <th style={{ padding: "1rem 1.25rem" }}>User / Email</th>
                  <th style={{ padding: "1rem 1.25rem" }}>Role</th>
                  <th style={{ padding: "1rem 1.25rem" }}>UID</th>
                  <th style={{ padding: "1rem 1.25rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const isAdmin = u.role === "admin";

                  return (
                    <tr key={u.uid} style={{ borderBottom: "1px solid hsl(var(--border-hsl))" }}>
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <div style={{ fontWeight: 700, color: "hsl(var(--primary-hsl))" }}>{u.name || u.email?.split("@")[0]}</div>
                        <div style={{ fontSize: "0.8rem", color: "hsl(var(--muted-hsl))" }}>{u.email}</div>
                      </td>

                      <td style={{ padding: "1rem 1.25rem" }}>
                        {isAdmin ? (
                          <span style={{ fontSize: "0.75rem", fontWeight: 800, padding: "0.2rem 0.6rem", backgroundColor: "hsl(var(--accent-hsl) / 0.15)", color: "hsl(var(--accent-hsl))", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                            <ShieldCheck size={12} /> Admin
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.2rem 0.6rem", backgroundColor: "hsl(var(--secondary-hsl))", color: "hsl(var(--muted-hsl))", borderRadius: "20px" }}>
                            Customer
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "1rem 1.25rem", fontFamily: "monospace", fontSize: "0.75rem", color: "hsl(var(--muted-hsl))" }}>
                        {u.uid}
                      </td>

                      <td style={{ padding: "1rem 1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <button
                            onClick={() => setSelectedUserForPassword(u)}
                            className="btn btn-outline"
                            style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.25rem" }}
                            title="Change User Password"
                          >
                            <KeyRound size={14} /> Password
                          </button>

                          <button
                            onClick={() => handleToggleRole(u)}
                            disabled={updatingRoleUid === u.uid}
                            className="btn btn-outline"
                            style={{
                              padding: "0.4rem 0.75rem",
                              fontSize: "0.8rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              color: isAdmin ? "hsl(var(--muted-hsl))" : "hsl(var(--accent-hsl))"
                            }}
                          >
                            {updatingRoleUid === u.uid ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
                            {isAdmin ? "Demote to Customer" : "Make Admin"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create User / Admin Modal */}
      {showCreateModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="card" style={{ maxWidth: "480px", width: "100%", padding: "2rem" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "0.25rem" }}>Create User / Admin Account</h2>
            <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
              Register a new user or administrator directly in Firebase Auth and Firestore.
            </p>

            <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="label">Account Role</label>
                <select className="input" value={newRole} onChange={(e) => setNewRole(e.target.value)} required>
                  <option value="admin">Administrator (Full Access)</option>
                  <option value="customer">Customer</option>
                </select>
              </div>

              <div>
                <label className="label">Full Name</label>
                <input className="input" placeholder="e.g. John Doe" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </div>

              <div>
                <label className="label">Email Address</label>
                <input type="email" className="input" placeholder="admin@apexworkwear.ca" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
              </div>

              <div>
                <label className="label">Password (Min 6 characters)</label>
                <input type="password" className="input" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {creating ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {selectedUserForPassword && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="card" style={{ maxWidth: "420px", width: "100%", padding: "2rem" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "0.25rem" }}>Change User Password</h2>
            <p style={{ color: "hsl(var(--muted-hsl))", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
              Updating password for: <strong>{selectedUserForPassword.email}</strong>
            </p>

            <form onSubmit={handleChangePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="label">New Password (Min 6 characters)</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Enter new password..."
                  value={changePasswordVal}
                  onChange={(e) => setChangePasswordVal(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setSelectedUserForPassword(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={changingPassword} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {changingPassword ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
