"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  LogOut,
  Download,
  Trash2,
  Mail,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { DeleteAllContactsDialog } from "@/components/contacts/DeleteAllContactsDialog";
import { ClarityCanvasCard } from "@/components/settings/ClarityCanvasCard";
import { ConnectionSuccessModal } from "@/components/settings/ConnectionSuccessModal";
import type { BaseSynthesis, SynthesisResponse } from "@/lib/clarity-canvas/types";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [contactCount, setContactCount] = useState(0);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  // Clarity Canvas state
  const [clarityConnected, setClarityConnected] = useState(false);
  const [claritySynthesis, setClaritySynthesis] = useState<BaseSynthesis | null>(null);
  const [claritySyncedAt, setClaritySyncedAt] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    fetchUserProfile();
    fetchContactCount();

    // Check for OAuth query params
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');

    if (errorParam) {
      // Handle OAuth errors
      const errorMessages: Record<string, string> = {
        access_denied: 'You cancelled the Clarity Canvas connection.',
        invalid_state: 'Connection failed - security validation error. Please try again.',
        no_code: 'Connection failed - no authorization received. Please try again.',
        token_exchange_failed: 'Connection failed - token exchange error. Please try again.',
        user_not_found: 'Connection failed - user account not found. Please contact support.',
      };
      toast({
        title: 'Connection Failed',
        description: errorMessages[errorParam] || 'An unknown error occurred. Please try again.',
        variant: 'destructive',
      });
      window.history.replaceState({}, '', '/settings');
      fetchClarityStatus();
    } else if (params.get('clarity_connected') === 'true') {
      fetchClarityStatus().then(() => {
        setShowSuccessModal(true);
      });
      // Clean up URL
      window.history.replaceState({}, '', '/settings');
    } else {
      fetchClarityStatus();
    }
  }, []);

  const fetchContactCount = async () => {
    try {
      const response = await fetch("/api/contacts?limit=1");
      if (response.ok) {
        const data = await response.json();
        setContactCount(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch contact count:", error);
    }
  };

  const fetchClarityStatus = async () => {
    try {
      const response = await fetch("/api/clarity-canvas/synthesis");
      if (response.ok) {
        const data: SynthesisResponse = await response.json();
        setClarityConnected(data.connected);
        setClaritySynthesis(data.synthesis);
        setClaritySyncedAt(data.syncedAt);
      }
    } catch (error) {
      console.error("Failed to fetch Clarity Canvas status:", error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        setUser({
          id: authUser.id,
          email: authUser.email || "",
          name: authUser.user_metadata?.name || null,
          createdAt: authUser.created_at,
        });
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({ title: "Error", description: "Failed to log out", variant: "destructive" });
    }
  };

  const handleExportContacts = async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/contacts/export");
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contacts-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Success", description: "Contacts exported successfully" });
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "Error", description: "Failed to export contacts", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const response = await fetch("/api/user", {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete failed");

      const supabase = createClient();
      await supabase.auth.signOut();

      toast({ title: "Success", description: "Account deleted successfully" });
      router.push("/login");
    } catch (error) {
      console.error("Delete error:", error);
      toast({ title: "Error", description: "Failed to delete account", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-6 px-4 md:py-8 md:px-6">
      {/* Header - 33 Strategies Style */}
      <div className="mb-8">
        <p className="mb-2 font-mono text-xs font-medium uppercase tracking-[0.2em] text-gold-primary">
          04 — Configure
        </p>
        <h1 className="font-display text-2xl text-white">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Account Section */}
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User size={20} className="text-gold-primary" />
              Account
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Your account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5">
              <div className="w-12 h-12 rounded-full bg-gold-subtle flex items-center justify-center">
                <Mail size={20} className="text-gold-primary" />
              </div>
              <div>
                <p className="text-white font-medium">
                  {user?.name || "User"}
                </p>
                <p className="text-sm text-zinc-400">{user?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm">
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-zinc-500">Member since</p>
                <p className="text-white">
                  {user?.createdAt ? formatDate(user.createdAt) : "—"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-zinc-500">Account ID</p>
                <p className="text-white font-mono text-xs break-all md:truncate">
                  {user?.id || "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integrations Section (Clarity Canvas) */}
        <ClarityCanvasCard
          initialConnected={clarityConnected}
          initialSynthesis={claritySynthesis}
          initialSyncedAt={claritySyncedAt}
        />

        {/* Data Management Section */}
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield size={20} className="text-gold-primary" />
              Data Management
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Export or delete your data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-lg bg-white/5">
              <div>
                <p className="text-white font-medium">Export Contacts</p>
                <p className="text-sm text-zinc-400">
                  Download all your contacts as a CSV file
                </p>
              </div>
              <Button
                onClick={handleExportContacts}
                disabled={exporting}
                variant="secondary"
                className="h-11 shrink-0 w-full md:w-auto"
              >
                <Download size={16} />
                {exporting ? "Exporting..." : "Export"}
              </Button>
            </div>

            {contactCount > 0 && (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-lg bg-white/5">
                <div>
                  <p className="text-white font-medium">Delete All Contacts</p>
                  <p className="text-sm text-zinc-400">
                    Permanently remove all {contactCount} contacts from your account
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteAllDialog(true)}
                  className="h-11 shrink-0 w-full md:w-auto bg-red-600 hover:bg-red-700"
                >
                  <Trash2 size={16} />
                  Delete All
                </Button>
              </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <div>
                <p className="text-white font-medium">Delete Account</p>
                <p className="text-sm text-zinc-400">
                  Permanently delete your account and all data
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="h-11 shrink-0 w-full md:w-auto bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 size={16} />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-zinc-900 border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white flex items-center gap-2">
                      <AlertTriangle className="text-red-500" size={20} />
                      Delete Account
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400">
                      This action cannot be undone. This will permanently delete
                      your account and remove all your contacts and data from
                      our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-white/10 border-white/10 text-white hover:bg-white/20">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {deleting ? "Deleting..." : "Delete Account"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Session Section */}
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <LogOut size={20} className="text-gold-primary" />
              Session
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Manage your current session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-lg bg-white/5">
              <div>
                <p className="text-white font-medium">Sign Out</p>
                <p className="text-sm text-zinc-400">
                  Sign out of your account on this device
                </p>
              </div>
              <Button onClick={handleLogout} variant="secondary" className="h-11 w-full md:w-auto">
                <LogOut size={16} />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete All Contacts Dialog */}
      <DeleteAllContactsDialog
        isOpen={showDeleteAllDialog}
        onClose={() => {
          setShowDeleteAllDialog(false);
          fetchContactCount(); // Refresh count after deletion
        }}
        contactCount={contactCount}
      />

      {/* Clarity Canvas Connection Success Modal */}
      <ConnectionSuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        synthesis={claritySynthesis}
      />
    </div>
  );
}
