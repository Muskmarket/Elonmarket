import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { User, Wallet, AlertCircle } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AuthModal = ({ open, onOpenChange }: AuthModalProps) => {
  const { login, register, error } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!username.trim() || !walletAddress.trim()) {
      setLocalError("Both fields are required");
      return;
    }
    if (username.trim().length < 3) {
      setLocalError("Username must be at least 3 characters");
      return;
    }
    // Basic Solana address validation (base58, 32-44 chars)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress.trim())) {
      setLocalError("Invalid Solana wallet address");
      return;
    }

    setSubmitting(true);
    const success =
      mode === "login"
        ? await login(username.trim(), walletAddress.trim())
        : await register(username.trim(), walletAddress.trim());
    setSubmitting(false);

    if (success) {
      onOpenChange(false);
      setUsername("");
      setWalletAddress("");
    }
  };

  const displayError = localError || error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {mode === "login" ? "Login" : "Register"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              Username
            </Label>
            <Input
              id="username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-muted/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wallet" className="flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5" />
              Wallet Address
            </Label>
            <Input
              id="wallet"
              placeholder="Your Solana wallet address"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="bg-muted/50 font-mono text-xs"
            />
          </div>

          {displayError && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {displayError}
            </div>
          )}

          <Button type="submit" variant="neon" className="w-full" disabled={submitting}>
            {submitting ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  className="text-neon-cyan hover:underline"
                  onClick={() => {
                    setMode("register");
                    setLocalError(null);
                  }}
                >
                  Register
                </button>
              </>
            ) : (
              <>
                Already registered?{" "}
                <button
                  type="button"
                  className="text-neon-cyan hover:underline"
                  onClick={() => {
                    setMode("login");
                    setLocalError(null);
                  }}
                >
                  Login
                </button>
              </>
            )}
          </p>

          <p className="text-xs text-muted-foreground text-center">
            Your username and wallet are permanently linked. No private key required.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

