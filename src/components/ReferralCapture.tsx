import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { captureReferralFromUrl } from "@/lib/shareReferral";

/** Persist legal referral / UTM params for growth attribution. */
export default function ReferralCapture() {
  const location = useLocation();

  useEffect(() => {
    captureReferralFromUrl(location.search);
  }, [location.search]);

  return null;
}
