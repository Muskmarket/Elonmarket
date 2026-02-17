import { TrendingUp, Users, Zap, DollarSign, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatformData } from "@/hooks/usePlatformData";
import { useOnchainData } from "@/hooks/useOnchainData";

export const HeroSection = () => {
  const { payoutStats } = usePlatformData();
  const { data: onchain } = useOnchainData();

  const vaultBalanceSOL = onchain?.vault.balance_sol ?? 0;
  const holderCount = onchain?.token.holder_count ?? 0;
  const totalSupply = onchain?.token.total_supply ?? 0;

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-card" />
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-neon-green/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-neon-purple/5 rounded-full blur-[100px]" />
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--border)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)`,
          backgroundSize: "60px 60px"
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Live Badge */}
          <div className="inline-flex items-center gap-2 bg-card/80 border border-border px-4 py-2 rounded-full mb-6 animate-slide-up">
            <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
            <span className="text-sm font-medium text-foreground">Predictions Open</span>
            <span className="text-sm text-muted-foreground">•</span>
            <span className="text-sm text-neon-green font-medium">{vaultBalanceSOL.toFixed(4)} SOL Secured</span>
          </div>

          {/* Main Title */}
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-4 animate-slide-up tracking-tight" style={{ animationDelay: "0.1s" }}>
            <span className="text-foreground">MUSK</span>
            <span className="gradient-text">MARKET</span>
          </h1>

          <p className="text-lg md:text-xl text-foreground/90 mb-3 animate-slide-up font-medium" style={{ animationDelay: "0.2s" }}>
            Predict Elon's Next Tweet. Win SOL.
          </p>

          <p className="text-base text-muted-foreground mb-8 max-w-xl mx-auto animate-slide-up" style={{ animationDelay: "0.3s" }}>
            Free-to-play prediction market powered by Solana. 
            Hold tokens, make predictions, earn rewards.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12 animate-slide-up" style={{ animationDelay: "0.4s" }}>
            <Button variant="neon" size="lg" className="group min-w-[180px]">
              <Target className="w-4 h-4" />
              Start Predicting
            </Button>
            <Button variant="outline" size="lg" className="group min-w-[180px]">
              <TrendingUp className="w-4 h-4" />
              View Markets
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-slide-up" style={{ animationDelay: "0.5s" }}>
            {[
              { icon: Users, label: holderCount > 0 ? "Token Holders" : "Token Supply", value: holderCount > 0 ? formatSupply(holderCount) : totalSupply > 0 ? formatSupply(totalSupply) : "—", color: "text-neon-cyan" },
              { icon: TrendingUp, label: "Predictions", value: (payoutStats?.total_predictions_made || 0).toLocaleString(), color: "text-neon-green" },
              { icon: DollarSign, label: "Total Paid", value: `$${(payoutStats?.total_paid_usd || 0).toLocaleString()}`, color: "text-neon-purple" },
              { icon: Zap, label: "Rounds", value: (payoutStats?.total_rounds_completed || 0).toString(), color: "text-neon-orange" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card/60 border border-border p-4 rounded-xl hover:border-border/80 transition-colors">
                <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
                <div className="font-display text-xl md:text-2xl font-semibold text-foreground mb-0.5">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

function formatSupply(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}
