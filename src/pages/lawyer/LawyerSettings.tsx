import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { lawyerNavItems } from "@/lib/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "@/components/DashboardComponents";
import {
  User, Camera, Lock, MapPin, Trash2, Save, AlertTriangle,
  Settings, CreditCard, Bell,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const anim = (delay: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.4 } });

// ─── Profile Tab ───
function ProfileTab() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [city, setCity] = useState(profile?.city || "");
  const [photoUrl, setPhotoUrl] = useState(profile?.profile_photo || profile?.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = urlData.publicUrl + `?t=${Date.now()}`;
    setPhotoUrl(url);
    await supabase.from("profiles").update({ profile_photo: url, avatar_url: url } as any).eq("user_id", user.id);
    toast.success("Photo updated!"); setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName.trim(), city: city.trim() || null } as any).eq("user_id", user.id);
    if (error) toast.error("Failed to save");
    else toast.success("Profile updated!");
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) { toast.error("Min 8 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success("Password updated!"); setNewPassword(""); setConfirmPassword(""); }
    setChangingPassword(false);
  };

  const handleDelete = async () => {
    if (deleteText !== "DELETE") return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await supabase.functions.invoke("delete-account", { headers: { Authorization: `Bearer ${session.access_token}` } });
    } catch {}
    await signOut(); toast.success("Account deleted."); navigate("/");
  };

  return (
    <div className="max-w-2xl space-y-6">
      <motion.div {...anim(0)}>
        <div className="rounded-xl bg-card border shadow-card p-6">
          <h2 className="font-semibold text-foreground mb-4">Profile Photo</h2>
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                {photoUrl ? <img src={photoUrl} alt="" className="h-20 w-20 rounded-full object-cover" /> : <User className="h-8 w-8 text-muted-foreground" />}
              </div>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="absolute inset-0 rounded-full bg-foreground/0 group-hover:bg-foreground/40 flex items-center justify-center transition-colors">
                <Camera className="h-5 w-5 text-background opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handlePhotoUpload} />
            </div>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading…" : "Change Photo"}
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div {...anim(0.05)}>
        <div className="rounded-xl bg-card border shadow-card p-6">
          <h2 className="font-semibold text-foreground mb-4">Personal Information</h2>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Full Name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={user?.email || ""} disabled className="bg-muted/50" /></div>
            <div className="space-y-2"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Chicago, IL" /></div>
            <Button onClick={handleSave} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      </motion.div>

      <motion.div {...anim(0.1)}>
        <div className="rounded-xl bg-card border shadow-card p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Lock className="h-4 w-4 text-accent" /> Change Password</h2>
          <div className="space-y-4">
            <Input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <Input type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword} variant="outline">
              {changingPassword ? "Updating…" : "Update Password"}
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div {...anim(0.15)}>
        <div className="rounded-xl bg-card border border-destructive/20 shadow-card p-6">
          <h2 className="font-semibold text-destructive mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Danger Zone</h2>
          <p className="text-sm text-muted-foreground mb-4">Permanently delete your account.</p>
          {!showDeleteConfirm ? (
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</Button>
          ) : (
            <div className="space-y-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="text-sm">Type <span className="font-mono font-bold">DELETE</span>:</p>
              <Input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} />
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteText !== "DELETE" || deleting}>{deleting ? "Deleting…" : "Confirm"}</Button>
                <Button variant="outline" size="sm" onClick={() => { setShowDeleteConfirm(false); setDeleteText(""); }}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Subscription Tab ───
function SubscriptionTab() {
  return (
    <div className="max-w-2xl">
      <div className="rounded-xl bg-card border shadow-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center"><CreditCard className="h-5 w-5 text-success" /></div>
          <div>
            <div className="font-semibold text-foreground">Free Beta</div>
            <div className="text-xs text-muted-foreground">All features included · No credit card required</div>
          </div>
        </div>
        <div className="p-4 rounded-lg bg-accent/5 border border-accent/15">
          <p className="text-sm text-foreground font-medium">🎉 You're on the Free Beta plan</p>
          <p className="text-xs text-muted-foreground mt-1">All features are free during beta. Early users get 50% lifetime discount when paid plans launch.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───
export default function LawyerSettings() {
  const { profile } = useAuth();

  return (
    <DashboardLayout sidebarItems={lawyerNavItems} portalLabel="Lawyer Portal" userName={profile?.full_name || "Lawyer"} userRole="Lawyer">
      <SectionHeader title="Settings" subtitle="Manage your profile, subscription, and preferences" />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full justify-start bg-muted/50 p-1 rounded-xl mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <User className="h-4 w-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <CreditCard className="h-4 w-4" /> Subscription
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile"><ProfileTab /></TabsContent>
        <TabsContent value="subscription"><SubscriptionTab /></TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
