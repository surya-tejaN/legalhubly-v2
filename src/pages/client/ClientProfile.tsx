import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { clientNavItems } from "@/lib/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/DashboardComponents";
import {
  User, Camera, Lock, MapPin, Trash2, Save, AlertTriangle,
  Heart, Star, Briefcase, ArrowRight, Loader2, Settings,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

const anim = (delay: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.4 } });

// ─── Settings Tab ───
function SettingsTab() {
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
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = urlData.publicUrl + `?t=${Date.now()}`;
    setPhotoUrl(url);
    await supabase.from("profiles").update({ profile_photo: url, avatar_url: url } as any).eq("user_id", user.id);
    toast.success("Photo updated!");
    setUploading(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName.trim(), city: city.trim() || null } as any).eq("user_id", user.id);
    if (error) toast.error("Failed to save");
    else toast.success("Profile updated!");
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success("Password updated!"); setNewPassword(""); setConfirmPassword(""); }
    setChangingPassword(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== "DELETE") return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await supabase.functions.invoke("delete-account", { headers: { Authorization: `Bearer ${session.access_token}` } });
    } catch {}
    await signOut();
    toast.success("Account deleted.");
    navigate("/");
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Photo */}
      <motion.div {...anim(0)}>
        <div className="rounded-xl bg-card border shadow-card p-6">
          <h2 className="font-semibold text-foreground mb-4">Profile Photo</h2>
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                {photoUrl ? <img src={photoUrl} alt="Avatar" className="h-20 w-20 rounded-full object-cover" /> : <User className="h-8 w-8 text-muted-foreground" />}
              </div>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="absolute inset-0 rounded-full bg-foreground/0 group-hover:bg-foreground/40 flex items-center justify-center transition-colors">
                <Camera className="h-5 w-5 text-background opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handlePhotoUpload} />
            </div>
            <div>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? "Uploading…" : "Change Photo"}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG or WebP. Max 5MB.</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Personal Info */}
      <motion.div {...anim(0.05)}>
        <div className="rounded-xl bg-card border shadow-card p-6">
          <h2 className="font-semibold text-foreground mb-4">Personal Information</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="name" placeholder="Your full name" className="pl-10" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ""} disabled className="bg-muted/50 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="city" placeholder="e.g. Chicago, IL" className="pl-10" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save Changes"}</Button>
          </div>
        </div>
      </motion.div>

      {/* Password */}
      <motion.div {...anim(0.1)}>
        <div className="rounded-xl bg-card border shadow-card p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Lock className="h-4 w-4 text-accent" /> Change Password</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword} variant="outline">
              {changingPassword ? "Updating…" : "Update Password"}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Delete */}
      <motion.div {...anim(0.15)}>
        <div className="rounded-xl bg-card border border-destructive/20 shadow-card p-6">
          <h2 className="font-semibold text-destructive mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Danger Zone</h2>
          <p className="text-sm text-muted-foreground mb-4">Permanently delete your account. This cannot be undone.</p>
          {!showDeleteConfirm ? (
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Account</Button>
          ) : (
            <div className="space-y-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="text-sm font-medium text-foreground">Type <span className="font-mono font-bold">DELETE</span> to confirm:</p>
              <Input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder="Type DELETE" className="border-destructive/30" />
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={handleDeleteAccount} disabled={deleteText !== "DELETE" || deleting}>{deleting ? "Deleting…" : "Confirm Delete"}</Button>
                <Button variant="outline" size="sm" onClick={() => { setShowDeleteConfirm(false); setDeleteText(""); }}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Saved Lawyers Tab ───
function SavedLawyersTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("saved_lawyers").select("id, created_at, lawyers(*)").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setSaved((data as any) || []); setLoading(false); });
  }, [user]);

  const removeLawyer = async (savedId: string) => {
    await supabase.from("saved_lawyers").delete().eq("id", savedId);
    setSaved((prev) => prev.filter((s) => s.id !== savedId));
    toast.success("Removed");
    queryClient.invalidateQueries({ queryKey: ["saved-lawyers"] });
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>;
  if (saved.length === 0) return (
    <div className="text-center py-16 rounded-xl bg-card border">
      <Heart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
      <h3 className="font-serif text-lg text-foreground mb-1">No saved lawyers yet</h3>
      <p className="text-sm text-muted-foreground mb-4">Browse lawyers and tap the heart icon to save your favorites.</p>
      <Button variant="gold" asChild><Link to="/client/find-lawyers">Browse Lawyers</Link></Button>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-2">{saved.length} saved lawyer{saved.length !== 1 ? "s" : ""}</p>
      {saved.map((item, i) => {
        const lawyer = item.lawyers;
        if (!lawyer) return null;
        return (
          <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="flex items-center gap-4 p-5 rounded-xl border bg-card hover:shadow-sm transition-shadow">
            <Link to={`/client/lawyer/${lawyer.id}`} className="shrink-0">
              <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                <span className="text-base font-bold text-accent">{lawyer.avatar_initials}</span>
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <Link to={`/client/lawyer/${lawyer.id}`} className="font-semibold text-foreground hover:text-accent transition-colors">{lawyer.name}</Link>
              <p className="text-xs text-muted-foreground mt-0.5">{lawyer.firm}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Star className="h-3 w-3 text-accent fill-accent" />{lawyer.rating?.toFixed(1)}</span>
                <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{lawyer.experience_years} yrs</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="gold" size="sm" asChild><Link to={`/client/lawyer/${lawyer.id}`}>View</Link></Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => removeLawyer(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Main Page ───
export default function ClientProfile() {
  const { profile } = useAuth();

  return (
    <DashboardLayout sidebarItems={clientNavItems} portalLabel="Client Portal" userName={profile?.full_name || "Client"} userRole="Client">
      <SectionHeader title="Profile" subtitle="Manage your account, saved lawyers, and preferences" />

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="w-full justify-start bg-muted/50 p-1 rounded-xl mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="settings" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Settings className="h-4 w-4" /> Account Settings
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Heart className="h-4 w-4" /> Saved Lawyers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings"><SettingsTab /></TabsContent>
        <TabsContent value="saved"><SavedLawyersTab /></TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
