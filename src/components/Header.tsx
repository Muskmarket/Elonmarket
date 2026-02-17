import { Target, Wallet, Menu, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { usePlatformData } from "@/hooks/usePlatformData";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";

export const Header = () => {
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { payoutStats } = usePlatformData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      if (publicKey) {
        const { data } = await supabase.rpc("is_admin_wallet", {
          _wallet: publicKey.toBase58(),
        });
        setIsAdmin(!!data);
      } else {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [publicKey]);

  const handleConnect = () => {
    setVisible(true);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-green to-neon-cyan flex items-center justify-center">
              <Target className="w-4 h-4 text-background" />
            </div>
            <h1 className="font-display font-semibold text-base text-foreground">
              MUSKMARKET
            </h1>
          </Link>

          {/* Stats - Desktop */}
          <div className="hidden lg:flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Paid</p>
              <p className="font-display font-semibold text-neon-green text-sm">
                ${(payoutStats?.total_paid_usd || 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Predictions</p>
              <p className="font-display font-semibold text-foreground text-sm">
                {(payoutStats?.total_predictions_made || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#feed" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Feed
            </a>
            <a href="#predict" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Markets
            </a>
            <a href="#leaderboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Leaderboard
            </a>
            {isAdmin && (
              <Link
                to="/admin65131200"
                className="text-sm text-neon-purple hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Shield className="w-3 h-3" />
                Admin
              </Link>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {connected && publicKey ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => disconnect()}
                className="hidden sm:flex"
              >
                <Wallet className="w-4 h-4" />
                {formatAddress(publicKey.toBase58())}
              </Button>
            ) : (
              <Button
                variant="neon"
                size="sm"
                onClick={handleConnect}
                className="hidden sm:flex"
              >
                <Wallet className="w-4 h-4" />
                Connect
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-4">
              <a
                href="#feed"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Feed
              </a>
              <a
                href="#predict"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Markets
              </a>
              <a
                href="#leaderboard"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Leaderboard
              </a>
              {isAdmin && (
                <Link
                to="/admin65131200"
                  className="text-sm text-neon-purple hover:text-foreground transition-colors flex items-center gap-1"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Shield className="w-3 h-3" />
                  Admin
                </Link>
              )}
              {connected && publicKey ? (
                <Button variant="outline" size="sm" onClick={() => disconnect()}>
                  <Wallet className="w-4 h-4" />
                  {formatAddress(publicKey.toBase58())}
                </Button>
              ) : (
                <Button variant="neon" size="sm" onClick={handleConnect}>
                  <Wallet className="w-4 h-4" />
                  Connect
                </Button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};