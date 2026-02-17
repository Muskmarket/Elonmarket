import { ArrowLeft, Zap, Trophy, Wallet, Twitter, Shield, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Docs = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-3xl font-bold gradient-text">MuskMarket Documentation</h1>
            <p className="text-muted-foreground">Complete guide to the prediction platform</p>
          </div>
        </div>

        <div className="space-y-8">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                What is MuskMarket?
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p className="text-muted-foreground">
                MuskMarket is a free-to-play prediction platform where token holders predict what Elon Musk will tweet about first within a daily timeframe. Winners share rewards from a pool funded by PumpFun creator rewards.
              </p>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                How to Participate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">1</div>
                <div><strong>Connect Wallet</strong> - Use Phantom or Solflare wallet</div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">2</div>
                <div><strong>Hold Tokens</strong> - Meet minimum token requirement</div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">3</div>
                <div><strong>Make Prediction</strong> - Vote on what Elon tweets first</div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">4</div>
                <div><strong>Win & Claim</strong> - If correct, claim your share</div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Reward System
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-2">
              <p>• <strong>Pool Size:</strong> 10-20% of vault balance per round</p>
              <p>• <strong>Distribution:</strong> Split equally among all winners</p>
              <p>• <strong>Accumulation:</strong> No-winner rounds add to next round</p>
              <p>• <strong>Funding:</strong> PumpFun creator rewards</p>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-2">
              <p>• Vault wallet (cold) never connected to backend</p>
              <p>• Payout wallet refilled only after round finalization</p>
              <p>• One vote and one claim per wallet per round</p>
              <p>• Wallet signature required for claims</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Docs;
