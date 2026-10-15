import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, Loader2, Video, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { isFeatureEnabled } from "@/config/features";

export type BookableLawyer = {
  id: string;
  name: string;
  firm: string;
  availability_status: string;
  consultation_fee?: number | null;
  next_available_date?: string | null;
  avg_response_hours?: number | null;
};

type Props = {
  lawyer: BookableLawyer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBooked?: () => void;
};

/** Preview-only slots for UI — never bookable until clientBooking is on + real calendar. */
function buildPreviewSlots(availability: string): { value: string; label: string; soon: boolean }[] {
  const slots: { value: string; label: string; soon: boolean }[] = [];
  const startOffset = availability === "available" ? 1 : availability === "busy" ? 5 : 14;
  const days = availability === "unavailable" ? 0 : 5;
  const hours = [10, 14, 16];

  for (let d = startOffset; d < startOffset + days; d++) {
    for (const h of hours) {
      const dt = new Date();
      dt.setDate(dt.getDate() + d);
      dt.setHours(h, 0, 0, 0);
      if (dt.getDay() === 0 || dt.getDay() === 6) continue;
      slots.push({
        value: dt.toISOString(),
        label: dt.toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
        soon: d <= 3,
      });
      if (slots.length >= 8) return slots;
    }
  }
  return slots;
}

export function availabilityLabel(status: string, nextDate?: string | null): {
  text: string;
  tone: "ok" | "warn" | "muted";
} {
  if (status === "available") {
    return { text: "Available to book now", tone: "ok" };
  }
  if (status === "busy") {
    return {
      text: nextDate
        ? `Busy now · next openings around ${new Date(nextDate).toLocaleDateString()}`
        : "Busy now · future slots available",
      tone: "warn",
    };
  }
  return { text: "Not booking right now · check back soon", tone: "muted" };
}

export default function BookConsultationDialog({ lawyer, open, onOpenChange, onBooked }: Props) {
  const { user, profile } = useAuth();
  const [slot, setSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [type, setType] = useState("video");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  /** When false: UI is visible, Confirm is blocked (no real calendar yet). */
  const bookingLive = isFeatureEnabled("clientBooking");

  const slots = useMemo(
    () => (lawyer ? buildPreviewSlots(lawyer.availability_status || "available") : []),
    [lawyer],
  );
  const avail = lawyer
    ? availabilityLabel(lawyer.availability_status, lawyer.next_available_date)
    : null;
  const hasPreviewSlots = Boolean(lawyer && slots.length > 0 && lawyer.availability_status !== "unavailable");
  const canConfirm = bookingLive && hasPreviewSlots;

  const reset = () => {
    setSlot("");
    setNotes("");
    setType("video");
    setDone(false);
    setSubmitting(false);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const submit = async () => {
    if (!bookingLive) {
      toast.error("Online booking isn’t live yet. Real calendar slots are coming soon.");
      return;
    }
    if (!lawyer || !user) {
      toast.error("Please sign in to book a consultation.");
      return;
    }
    if (!slot) {
      toast.error("Pick a time slot.");
      return;
    }

    setSubmitting(true);
    const clientName = profile?.full_name?.trim() || user.email?.split("@")[0] || "Client";
    const fee =
      lawyer.consultation_fee == null || Number(lawyer.consultation_fee) === 0
        ? 0
        : Number(lawyer.consultation_fee);

    const { error } = await supabase.from("consultations").insert({
      lawyer_id: lawyer.id,
      client_user_id: user.id,
      client_name: clientName,
      title: `Consultation with ${lawyer.name}`,
      scheduled_at: slot,
      duration_minutes: 30,
      status: "scheduled",
      type,
      fee_amount: fee,
      is_mvp_free: fee === 0,
      notes: notes.trim() || null,
    });

    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        toast.error("That time slot was just taken. Pick another time.");
        return;
      }
      toast.error(error.message || "Could not book consultation.");
      return;
    }

    setDone(true);
    toast.success("Consultation booked!");
    onBooked?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Book consultation</DialogTitle>
          <DialogDescription>
            {lawyer
              ? `Schedule a 30-minute consult with ${lawyer.name} at ${lawyer.firm}.`
              : "Select a lawyer to book."}
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Sign in to book a consultation with Chicago lawyers.
            </p>
            <Button variant="gold" className="w-full" asChild>
              <Link to="/login">Sign in to book</Link>
            </Button>
          </div>
        ) : done ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
            <p className="font-medium text-foreground">You’re booked</p>
            <p className="text-sm text-muted-foreground">
              View it anytime under Consultations in your client portal.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
              <Button variant="gold" asChild>
                <Link to="/client/consultations">My consultations</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {!bookingLive && (
              <div className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2.5 text-sm">
                <p className="font-medium text-foreground">Booking preview — not available yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Live time slots and calendar booking are coming soon. You can explore the flow below,
                  but Confirm is disabled. Use Visit Website or Message for now.
                </p>
              </div>
            )}

            {avail && (
              <div
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-sm flex items-start gap-2",
                  !bookingLive && "opacity-70",
                  avail.tone === "ok" && "border-success/30 bg-success/5 text-foreground",
                  avail.tone === "warn" && "border-warning/30 bg-warning/5 text-foreground",
                  avail.tone === "muted" && "border-border bg-muted/40 text-muted-foreground",
                )}
              >
                <Clock className="h-4 w-4 mt-0.5 shrink-0 text-accent" />
                <div>
                  <p className="font-medium">{avail.text}</p>
                  {!hasPreviewSlots && (
                    <p className="text-xs mt-1 text-muted-foreground">
                      Online booking isn’t open for this lawyer yet. Check back later or visit their
                      website.
                    </p>
                  )}
                </div>
              </div>
            )}

            {hasPreviewSlots && (
              <>
                <div className="space-y-2">
                  <Label>Meeting type</Label>
                  <Select value={type} onValueChange={setType} disabled={!bookingLive}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video call</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="in_person">In person (Chicago)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-accent" /> Available times
                    {!bookingLive && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Preview
                      </span>
                    )}
                  </Label>
                  <div className="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto pr-1">
                    {slots.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        disabled={!bookingLive}
                        onClick={() => bookingLive && setSlot(s.value)}
                        className={cn(
                          "text-left rounded-xl border px-3 py-2.5 text-sm transition-colors",
                          !bookingLive && "opacity-60 cursor-not-allowed",
                          bookingLive && slot === s.value
                            ? "border-accent bg-accent/10 text-foreground"
                            : "border-border bg-card",
                          bookingLive && slot !== s.value && "hover:border-accent/40",
                        )}
                      >
                        <span className="font-medium">{s.label}</span>
                        {s.soon && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-accent font-semibold">
                            Soon
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consult-notes">What do you need help with? (optional)</Label>
                  <Textarea
                    id="consult-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={500}
                    rows={3}
                    disabled={!bookingLive}
                    placeholder="Brief summary — not legal advice yet, just context for the meeting."
                    className="rounded-xl resize-none"
                  />
                </div>

                <div className="flex items-center justify-between text-sm rounded-xl bg-muted/50 px-3 py-2">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Video className="h-3.5 w-3.5" /> 30 minutes
                  </span>
                  <span className="font-semibold text-foreground">
                    {lawyer?.consultation_fee
                      ? `$${Number(lawyer.consultation_fee).toFixed(0)} consult fee`
                      : "Free intro consult"}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="gold"
                  className="w-full gap-2"
                  disabled={!canConfirm || submitting || (bookingLive && !slot)}
                  onClick={() => void submit()}
                  title={
                    bookingLive
                      ? "Confirm booking"
                      : "Booking disabled until live calendar slots are ready"
                  }
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Calendar className="h-4 w-4" />
                  )}
                  {submitting
                    ? "Booking…"
                    : bookingLive
                      ? "Confirm booking"
                      : "Confirm unavailable"}
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
