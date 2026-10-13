import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { clientNavItems } from "@/lib/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  User, Camera, Lock, MapPin, Trash2, Save, AlertTriangle,
} from "lucide-react";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4 },
});

export default function AccountSettings() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [city, setCity] = useState(profile?.city || "");
  const [photoUrl, setPhotoUrl] = useState(profile?.profile_photo || profile?.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = urlData.publicUrl + `?t=${Date.now()}`;
    setPhotoUrl(url);

    // Save to profile immediately
    await supabase
      .from("profiles")
      .update({ profile_photo: url, avatar_url: url } as any)
      .eq("user_id", user.id);

    toast.success("Photo updated!");
    setUploading(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        city: city.trim() || null,
      } as any)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Profile updated!");
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated!");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== "DELETE") return;
    setDeleting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.functions.invoke("delete-account", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      }
    } catch (e) {
      console.error("Delete account error:", e);
    }

    await signOut();
    toast.success("Your account has been deleted.");
    navigate("/");
  };

  return (
    <DashboardLayout
      sidebarItems={clientNavItems}
      portalLabel="Client Portal"
      userName={profile?.full_name || "Client"}
      userRole="Client"
    >
      <motion.div {...anim(0)} className="mb-8">
        <h1 className="text-2xl md:text-3xl font-serif text-foreground">Account Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile and preferences.</p>
      </motion.div>

      <div className="max-w-2xl space-y-6">
        {/* Profile Photo */}
        <motion.div {...anim(0.05)}>
          <div className="rounded-xl bg-card border shadow-card p-6">
            <h2 className="font-semibold text-foreground mb-4">Profile Photo</h2>
            <div className="flex items-center gap-5">
              <div className="relative group">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Avatar" className="h-20 w-20 rounded-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 rounded-full bg-foreground/0 group-hover:bg-foreground/40 flex items-center justify-center transition-colors"
                >
                  <Camera className="h-5 w-5 text-background opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Uploading…" : "Change Photo"}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG or WebP. Max 5MB.</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Personal Info */}
        <motion.div {...anim(0.1)}>
          <div className="rounded-xl bg-card border shadow-card p-6">
            <h2 className="font-semibold text-foreground mb-4">Personal Information</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Your full name"
                    className="pl-10"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted/50 text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="city"
                    placeholder="e.g. Chicago, IL"
                    className="pl-10"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleSaveProfile} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Change Password */}
        <motion.div {...anim(0.15)}>
          <div className="rounded-xl bg-card border shadow-card p-6">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Lock className="h-4 w-4 text-accent" /> Change Password
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !newPassword}
                variant="outline"
              >
                {changingPassword ? "Updating…" : "Update Password"}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Delete Account */}
        <motion.div {...anim(0.2)}>
          <div className="rounded-xl bg-card border border-destructive/20 shadow-card p-6">
            <h2 className="font-semibold text-destructive mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Danger Zone
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Once you delete your account, there is no going back. This action is permanent.
            </p>
            {!showDeleteConfirm ? (
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Account
              </Button>
            ) : (
              <div className="space-y-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-sm font-medium text-foreground">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm:
                </p>
                <Input
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  placeholder="Type DELETE"
                  className="border-destructive/30"
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteAccount}
                    disabled={deleteText !== "DELETE" || deleting}
                  >
                    {deleting ? "Deleting…" : "Confirm Delete"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowDeleteConfirm(false); setDeleteText(""); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
