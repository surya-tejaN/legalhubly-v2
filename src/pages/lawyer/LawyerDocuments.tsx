import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { lawyerNavItems } from "@/lib/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/DashboardComponents";
import { FileText, Upload, Download, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Doc { id: string; filename: string; content_type: string; size_bytes: number; path: string; bucket: string; created_at: string; }

export default function LawyerDocuments() {
  const { user, profile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchDocs = async () => {
    if (!user) return;
    const { data } = await supabase.from("documents").select("*").eq("owner_user_id", user.id).order("created_at", { ascending: false });
    setDocs(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
    setUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("documents").upload(path, file);
    if (uploadErr) { toast.error("Upload failed"); setUploading(false); return; }
    await supabase.from("documents").insert({ owner_user_id: user.id, filename: file.name, content_type: file.type, size_bytes: file.size, path, bucket: "documents" });
    toast.success("Uploaded");
    setUploading(false);
    fetchDocs();
  };

  const handleDownload = async (doc: Doc) => {
    const { data, error } = await supabase.storage.from(doc.bucket).download(doc.path);
    if (error || !data) { toast.error("Download failed"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a"); a.href = url; a.download = doc.filename; a.click(); URL.revokeObjectURL(url);
  };

  const handleDelete = async (doc: Doc) => {
    await supabase.storage.from(doc.bucket).remove([doc.path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    toast.success("Deleted");
  };

  const formatSize = (b: number) => b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <DashboardLayout sidebarItems={lawyerNavItems} portalLabel="Lawyer Portal" userName={profile?.full_name || "Lawyer"} userRole="Lawyer">
      <SectionHeader title="Documents" subtitle="Manage case documents"
        action={<Button onClick={() => fileRef.current?.click()} disabled={uploading}><Upload className="mr-2 h-4 w-4" />{uploading ? "Uploading..." : "Upload"}</Button>} />
      <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
      ) : docs.length === 0 ? (
        <div className="text-center py-20 rounded-xl bg-card border">
          <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-serif text-lg text-foreground mb-2">No documents</h3>
          <p className="text-sm text-muted-foreground mb-4">Upload documents to get started.</p>
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Upload</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc, i) => (
            <motion.div key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0"><FileText className="h-5 w-5 text-accent" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{doc.filename}</div>
                <div className="text-xs text-muted-foreground">{formatSize(doc.size_bytes)} · {new Date(doc.created_at).toLocaleDateString()}</div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} className="h-8 w-8"><Download className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
