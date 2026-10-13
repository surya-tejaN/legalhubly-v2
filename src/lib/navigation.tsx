import {
  LayoutDashboard,
  Search,
  Heart,
  Settings,
  MessageSquare,
  FileText,
  Briefcase,
  Video,
  CreditCard,
  Users,
  Calendar,
  Receipt,
  Wrench,
  User,
} from "lucide-react";
import { features } from "@/config/features";

type NavItem = { icon: JSX.Element; label: string; to: string };

function filterEnabled(items: Array<NavItem & { enabled: boolean }>): NavItem[] {
  return items.filter((item) => item.enabled).map(({ icon, label, to }) => ({ icon, label, to }));
}

export const clientNavItems = filterEnabled([
  { icon: <LayoutDashboard />, label: "Dashboard", to: "/client/dashboard", enabled: features.clientDashboard },
  { icon: <Search />, label: "Find Lawyers", to: "/client/find-lawyers", enabled: features.clientFindLawyers },
  { icon: <Heart />, label: "Saved Lawyers", to: "/client/saved-lawyers", enabled: features.clientSavedLawyers },
  { icon: <MessageSquare />, label: "Messages", to: "/client/messages", enabled: features.clientMessages },
  { icon: <Briefcase />, label: "My Cases", to: "/client/cases", enabled: features.clientCases },
  { icon: <Video />, label: "Consultations", to: "/client/consultations", enabled: features.clientConsultations },
  { icon: <FileText />, label: "Documents", to: "/client/documents", enabled: features.clientDocuments },
  { icon: <CreditCard />, label: "Payments", to: "/client/payments", enabled: features.clientPayments },
  { icon: <User />, label: "Profile", to: "/client/profile", enabled: features.clientProfile },
  { icon: <Settings />, label: "Settings", to: "/client/settings", enabled: features.clientSettings },
]);

export const lawyerNavItems = filterEnabled([
  { icon: <LayoutDashboard />, label: "Dashboard", to: "/lawyer/dashboard", enabled: features.lawyerDashboard },
  { icon: <Users />, label: "Leads", to: "/lawyer/leads", enabled: features.lawyerLeads },
  { icon: <Users />, label: "Clients", to: "/lawyer/clients", enabled: features.lawyerClients },
  { icon: <MessageSquare />, label: "Messages", to: "/lawyer/messages", enabled: features.lawyerMessages },
  { icon: <Briefcase />, label: "Cases", to: "/lawyer/cases", enabled: features.lawyerCases },
  { icon: <Calendar />, label: "Calendar", to: "/lawyer/calendar", enabled: features.lawyerCalendar },
  { icon: <Receipt />, label: "Billing", to: "/lawyer/billing", enabled: features.lawyerBilling },
  { icon: <FileText />, label: "Documents", to: "/lawyer/documents", enabled: features.lawyerDocuments },
  { icon: <Wrench />, label: "Tools", to: "/lawyer/tools", enabled: features.lawyerTools },
  { icon: <Settings />, label: "Settings", to: "/lawyer/settings", enabled: features.lawyerSettings },
]);

export const firmNavItems = [
  { icon: <LayoutDashboard />, label: "Dashboard", to: "/firm/dashboard" },
];

export const adminNavItems = [
  { icon: <LayoutDashboard />, label: "Dashboard", to: "/admin/dashboard" },
];
