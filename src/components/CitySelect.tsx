import { useEffect } from "react";
import { MapPin } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LAUNCH_CITY, LAUNCH_CITY_LABEL } from "@/lib/location";

type Props = {
  value: string;
  onChange: (city: string) => void;
  required?: boolean;
  id?: string;
  label?: string;
};

/** Launch market: Chicago only (other cities removed until expansion). */
export default function CitySelect({
  value,
  onChange,
  required,
  id = "city",
  label = "City",
}: Props) {
  useEffect(() => {
    if (value !== LAUNCH_CITY) onChange(LAUNCH_CITY);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- force launch city once on mount/mismatch
  }, [value]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
        <Select value={LAUNCH_CITY} onValueChange={onChange} required={required}>
          <SelectTrigger id={id} className="pl-10 h-11">
            <SelectValue placeholder={LAUNCH_CITY_LABEL} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={LAUNCH_CITY}>{LAUNCH_CITY_LABEL}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Legalhubly currently serves Chicago only. More cities coming soon.
      </p>
    </div>
  );
}
