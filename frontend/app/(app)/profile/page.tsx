"use client";

import React, { useState } from "react";
import { User, Lock, Shield, Trash2, CheckCircle2, AlertTriangle, Moon, Sun } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const { success, error } = useToast();

  // Edit name state
  const [name, setName] = useState(user?.name || "");
  const [savingName, setSavingName] = useState(false);

  // Preference state
  const [storeFrames, setStoreFrames] = useState(user?.preferences?.store_frames ?? false);
  const [savingPref, setSavingPref] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Handle name update
  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingName(true);
    try {
      await apiClient("/api/users/profile", {
        method: "PUT",
        body: JSON.stringify({ name: name.trim() }),
      });
      await refreshUser();
      success("Profile name updated successfully.");
    } catch (err: any) {
      error(err.message || "Failed to update profile name.");
    } finally {
      setSavingName(false);
    }
  };

  // Handle frame storage toggle
  const handleToggleStoreFrames = async (checked: boolean) => {
    setStoreFrames(checked);
    setSavingPref(true);
    try {
      await apiClient("/api/users/profile", {
        method: "PUT",
        body: JSON.stringify({ preferences: { store_frames: checked } }),
      });
      await refreshUser();
      success(
        checked
          ? "Camera snapshot storage enabled for Capture Moment."
          : "Camera snapshot storage disabled. Telemetry only will be saved."
      );
    } catch (err: any) {
      setStoreFrames(!checked);
      error(err.message || "Failed to update privacy preference.");
    } finally {
      setSavingPref(false);
    }
  };

  // Handle change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      error("Please complete all password fields.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 10) {
      error("New password must be at least 10 characters.");
      return;
    }

    setChangingPassword(true);
    try {
      await apiClient("/api/users/change-password", {
        method: "PUT",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_new_password: confirmNewPassword,
        }),
      });
      success("Password successfully changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      error(err.message || "Failed to change password. Please verify your current password.");
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle delete account
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      error("Please enter your current password to confirm account deletion.");
      return;
    }

    setDeletingAccount(true);
    try {
      await apiClient("/api/users/account", {
        method: "DELETE",
        body: JSON.stringify({ password: deletePassword }),
      });
      success("Account and all associated records permanently deleted.");
      logout();
    } catch (err: any) {
      error(err.message || "Failed to delete account. Password may be incorrect.");
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="pb-4 border-b border-[#E7E9EE] dark:border-white/10">
        <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#F07832] mb-1 block">
          // ACCOUNT & PRIVACY
        </span>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#17191F] dark:text-white">
          PROFILE & SETTINGS
        </h1>
        <p className="text-xs text-[#626873] dark:text-[#B8B8BE] mt-1">
          Manage your account credentials, preferences, and data privacy controls.
        </p>
      </div>

      {/* Theme & Display Preferences */}
      <GlassCard elevated className="border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E] shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#E7E9EE] dark:border-white/10">
          <div className="flex items-center gap-3">
            <Sun className="w-5 h-5 text-[#F07832]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#17191F] dark:text-white">
              Display & Theme Appearance
            </h3>
          </div>
          <ThemeToggle />
        </div>

        <p className="text-xs text-[#626873] dark:text-[#B8B8BE] leading-relaxed">
          Switch seamlessly between the cinematic Athletic-Tech Dark Theme and the Modern High-Contrast Light Theme.
          Your preference is saved locally across sessions.
        </p>
      </GlassCard>

      {/* Profile Details & Name Edit */}
      <GlassCard elevated className="border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E] shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[#E7E9EE] dark:border-white/10">
          <User className="w-5 h-5 text-[#F07832]" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#17191F] dark:text-white">
            Personal Information
          </h3>
        </div>

        <form onSubmit={handleUpdateName} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#17191F] dark:text-white mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              className="w-full rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE] dark:border-white/10 px-4 py-2.5 text-xs text-[#17191F] dark:text-white focus:outline-none focus:border-[#F07832] focus:bg-white dark:focus:bg-[#1A1A1E] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#17191F] dark:text-white mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full rounded-xl bg-[#F0F2F5]/70 dark:bg-[#141417]/70 border border-[#E7E9EE] dark:border-white/10 px-4 py-2.5 text-xs text-[#9298A3] dark:text-[#85858D] cursor-not-allowed font-mono"
            />
            <span className="text-[10px] text-[#626873] dark:text-[#85858D] mt-1 block">
              Email address is permanently bound to this user record.
            </span>
          </div>

          <Button type="submit" variant="primary" size="sm" loading={savingName}>
            Save Changes
          </Button>
        </form>
      </GlassCard>

      {/* Privacy Preferences */}
      <GlassCard elevated className="border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E] shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[#E7E9EE] dark:border-white/10">
          <Shield className="w-5 h-5 text-[#239B68]" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#17191F] dark:text-white">
            Camera & Telemetry Privacy
          </h3>
        </div>

        <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#17191F] dark:text-white block">
              Store Webcam Frame On Moment Capture
            </span>
            <p className="text-xs text-[#626873] dark:text-[#B8B8BE] max-w-xl leading-relaxed">
              When enabled, clicking "Capture Moment" will save a single low-resolution webcam JPEG along
              with your telemetry snapshot into MongoDB. When disabled, only numerical features and model scores are saved.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              checked={storeFrames}
              onChange={(e) => handleToggleStoreFrames(e.target.checked)}
              disabled={savingPref}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#D1D5DB] dark:bg-[#2A2A30] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F07832]"></div>
          </label>
        </div>
      </GlassCard>

      {/* Change Password */}
      <GlassCard elevated className="border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E] shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[#E7E9EE] dark:border-white/10">
          <Lock className="w-5 h-5 text-[#D99A27]" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#17191F] dark:text-white">
            Change Password
          </h3>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#17191F] dark:text-white mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE] dark:border-white/10 px-4 py-2.5 text-xs text-[#17191F] dark:text-white focus:outline-none focus:border-[#F07832] focus:bg-white dark:focus:bg-[#1A1A1E] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#17191F] dark:text-white mb-1.5">
              New Password (≥10 chars, letter & digit)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={10}
              className="w-full rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE] dark:border-white/10 px-4 py-2.5 text-xs text-[#17191F] dark:text-white focus:outline-none focus:border-[#F07832] focus:bg-white dark:focus:bg-[#1A1A1E] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#17191F] dark:text-white mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
              className="w-full rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE] dark:border-white/10 px-4 py-2.5 text-xs text-[#17191F] dark:text-white focus:outline-none focus:border-[#F07832] focus:bg-white dark:focus:bg-[#1A1A1E] transition-colors"
            />
          </div>

          <Button type="submit" variant="primary" size="sm" loading={changingPassword}>
            Update Password
          </Button>
        </form>
      </GlassCard>

      {/* Danger Zone: Account Deletion */}
      <GlassCard elevated className="border-[#DC5555]/30 bg-[#FDEEEE]/30 dark:bg-[#DC5555]/10 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[#DC5555]/20 text-[#DC5555]">
          <Trash2 className="w-5 h-5" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Danger Zone: Delete Account
          </h3>
        </div>

        <p className="text-xs text-[#626873] dark:text-[#B8B8BE] leading-relaxed max-w-xl">
          Permanently delete your user profile, all monitoring sessions, and all captured moment records.
          This action cascades across MongoDB Atlas and is completely irreversible.
        </p>

        <Button
          variant="danger"
          size="sm"
          onClick={() => setDeleteModalOpen(true)}
        >
          Delete Account & All Data
        </Button>
      </GlassCard>

      {/* Account Deletion Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Irreversible Account Deletion"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-[#FDEEEE] dark:bg-[#DC5555]/20 border border-[#DC5555]/30 text-xs text-[#DC5555] leading-relaxed">
            Warning: All recorded monitoring sessions, captured snapshots, and profile credentials will be permanently erased.
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#17191F] dark:text-white mb-1.5">
              Enter Current Password to Confirm
            </label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Your account password"
              className="w-full rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE] dark:border-white/10 px-4 py-2.5 text-xs text-[#17191F] dark:text-white focus:outline-none focus:border-[#DC5555] focus:bg-white dark:focus:bg-[#1A1A1E] transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E7E9EE] dark:border-white/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deletingAccount}
              onClick={handleDeleteAccount}
            >
              Permanently Delete Everything
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
