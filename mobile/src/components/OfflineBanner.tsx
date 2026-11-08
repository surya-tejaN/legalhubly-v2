import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { Banner } from "./ui";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setOffline(state.isConnected === false);
    });
  }, []);
  if (!offline) return null;
  return <Banner text="You’re offline. Listings will refresh when you’re back." tone="muted" />;
}
