import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  value: string;
  onChange: (city: string) => void;
  required?: boolean;
  id?: string;
  label?: string;
};

export default function CitySelect({
  value,
  onChange,
  required,
  id = "city",
  label = "City",
}: Props) {
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from("cities").select("name").order("name");
      if (!active) return;
      const names = (data || []).map((c) => c.name as string).filter(Boolean);
      setCities(names.length > 0 ? names : ["Chicago", "New York", "Los Angeles", "Houston", "Miami"]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}{required ? " *" : ""}</Label>
      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
        <Select
          value={value || undefined}
          onValueChange={onChange}
          disabled={loading}
          required={required}
        >
          <SelectTrigger id={id} className="pl-10 h-11">
            <SelectValue placeholder={loading ? "Loading cities…" : "Select your city"} />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {cities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
