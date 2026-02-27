import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { LiveFeed } from "@/components/LiveFeed";
import { PredictionVoting } from "@/components/PredictionVoting";
import { ClaimSection } from "@/components/ClaimSection";
import { Leaderboard } from "@/components/Leaderboard";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <LiveFeed />
        <ClaimSection />
        <PredictionVoting />
        <Leaderboard />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
