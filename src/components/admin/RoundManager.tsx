import { useState, useEffect } from "react";
import { Calendar, Clock, Square, Trophy, Lock, Plus, X, Hash, Tag, Save, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { formatToLocalTime, formatToLocalFullDate } from "@/lib/utils";

const optionIcons: Record<string, string> = {
  Tesla: "/tesla-logo.png",
  SpaceX: "/spacex-logo.png",
  Dogecoin: "/doge-logo.png",
  Doge: "/doge-logo.png",
  "AI/Grok": "/grok-logo.png",
  Grok: "/grok-logo.png",
  Meme: "/doge-logo.png",
  X: "/x-logo.png",
  Grokpedia: "/grok-logo.png",
  Starlink: "/spacex-logo.png",
};

interface PredictionRound {
  id: string;
  round_number: number;
  status: string;
  start_time: string;
  end_time: string;
  prediction_start_time?: string;
  vote_lock_minutes?: number;
  total_votes: number;
  total_winners: number;
  winning_tweet_text?: string;
  question?: string;
}

export const RoundManager = ({ adminSecretKey }: { adminSecretKey: string }) => {
  const { toast } = useToast();
  const [rounds, setRounds] = useState<PredictionRound[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Game config state
  const [postsToDisplay, setPostsToDisplay] = useState(6);
  const [defaultOptions, setDefaultOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [gameConfigId, setGameConfigId] = useState("");

  // Round creation state
  const [newRound, setNewRound] = useState({
    question: "What will Elon post about first?",
    predictionStartTime: "",
    predictionEndTime: "",
    voteLockMinutes: 60,
  });

  useEffect(() => {
    fetchRounds();
    fetchGameConfig();
  }, []);

  const fetchGameConfig = async () => {
    const { data } = await supabase
      .from("game_config" as any)
      .select("*")
      .limit(1)
      .single();

    if (data) {
      const d = data as any;
      setGameConfigId(d.id);
      setPostsToDisplay(d.posts_to_display || 6);
      setDefaultOptions(d.default_options || []);
    }
  };

  const fetchRounds = async () => {
    const { data } = await supabase
      .from("prediction_rounds")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setRounds(data as PredictionRound[]);
  };

  const saveGameConfig = async () => {
    setSavingConfig(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: "update_game_config",
            adminWallet: "private_admin",
            adminSecretKey,
            data: {
              id: gameConfigId,
              rss_feed_url: "",
              posts_to_display: postsToDisplay,
              default_options: defaultOptions,
            },
          }),
        }
      );
      if (!response.ok) throw new Error("Failed to save");
      toast({ title: "Saved!", description: "Game settings updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setSavingConfig(false);
    }
  };

  const addOption = () => {
    if (newOption.trim() && !defaultOptions.includes(newOption.trim())) {
      setDefaultOptions([...defaultOptions, newOption.trim()]);
      setNewOption("");
    }
  };

  const removeOption = (option: string) => {
    setDefaultOptions(defaultOptions.filter((o) => o !== option));
  };

  const createRound = async () => {
    if (!newRound.predictionStartTime || !newRound.predictionEndTime) {
      toast({ title: "Error", description: "Please set prediction time frame", variant: "destructive" });
      return;
    }
    if (defaultOptions.length === 0) {
      toast({ title: "Error", description: "Please add at least one prediction option", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: "create_round",
            adminWallet: "private_admin",
            adminSecretKey,
            data: {
              question: newRound.question,
              startTime: new Date().toISOString(),
              endTime: new Date(newRound.predictionEndTime).toISOString(),
              predictionStartTime: new Date(newRound.predictionStartTime).toISOString(),
              voteLockMinutes: newRound.voteLockMinutes,
              status: "open",
              options: defaultOptions.map((label) => ({
                label,
                keywords: [label.toLowerCase()],
              })),
            },
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to create round");
      toast({ title: "Round Created!", description: "Round is now open for voting." });
      fetchRounds();
      setNewRound({
        question: "What will Elon post about first?",
        predictionStartTime: "",
        predictionEndTime: "",
        voteLockMinutes: 60,
      });
    } catch {
      toast({ title: "Error", description: "Failed to create round", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const endRound = async (roundId: string) => {
    setLoading(true);
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/detect-winner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      toast({ title: "Round ended!", description: "Winner detection triggered." });
      fetchRounds();
    } catch {
      toast({ title: "Error", description: "Failed to end round", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-neon-green/20 text-neon-green border-neon-green/30";
      case "upcoming": return "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30";
      case "finalized": return "bg-neon-purple/20 text-neon-purple border-neon-purple/30";
      case "paid": return "bg-neon-green/20 text-neon-green border-neon-green/30";
      case "no_winner": return "bg-muted text-muted-foreground border-border";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6">
      {/* Time Synchronization Info */}
      <div className="flex flex-wrap gap-4 px-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
          <Clock className="w-3 h-3" />
          <span>Your Local Time: <span className="text-foreground font-medium">{format(new Date(), "h:mm a")} ({Intl.DateTimeFormat().resolvedOptions().timeZone})</span></span>
        </div>
        {rounds.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
            <Tag className="w-3 h-3" />
            <span>Latest Round DB Start (UTC): <span className="text-foreground font-medium">{rounds[0].prediction_start_time || rounds[0].start_time}</span></span>
          </div>
        )}
      </div>

      {/* Game Settings */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Game Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <Label className="flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" />
              Posts to Display
            </Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={postsToDisplay}
              onChange={(e) => setPostsToDisplay(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground mt-1">Number of tweets shown in the live feed</p>
          </div>

          <div>
            <Label className="flex items-center gap-1.5 mb-2">
              <Tag className="w-3.5 h-3.5" />
              Default Prediction Options
            </Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {defaultOptions.map((option) => (
                <Badge key={option} variant="secondary" className="pl-2 pr-1.5 py-1.5 flex items-center gap-1.5">
                  {optionIcons[option] && (
                    <img src={optionIcons[option]} alt="" className="w-3.5 h-3.5 object-contain" />
                  )}
                  {option}
                  <button onClick={() => removeOption(option)} className="p-0.5 hover:bg-destructive/20 rounded transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                placeholder="Add new option..."
                onKeyDown={(e) => e.key === "Enter" && addOption()}
              />
              <Button variant="outline" size="icon" onClick={addOption}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Button variant="neon" onClick={saveGameConfig} disabled={savingConfig}>
            <Save className="w-4 h-4" />
            {savingConfig ? "Saving..." : "Save Game Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Create Round */}
      <Card variant="glass" className="border-neon-cyan/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Zap className="w-5 h-5 text-neon-cyan" />
            Create New Round
          </CardTitle>
          <p className="text-sm text-muted-foreground">Setup the next prediction event and voting rules.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Question / Event Title</Label>
              <Input
                value={newRound.question}
                onChange={(e) => setNewRound({ ...newRound, question: e.target.value })}
                placeholder="e.g., What will Elon post about first?"
                className="bg-muted/30 border-border/50 focus:border-neon-cyan/50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <Calendar className="w-4 h-4 text-neon-cyan" />
                  Monitoring Starts (Your Local Time)
                </Label>
                <Input
                  type="datetime-local"
                  value={newRound.predictionStartTime}
                  onChange={(e) => setNewRound({ ...newRound, predictionStartTime: e.target.value })}
                  className="bg-muted/30 border-border/50"
                />
                <p className="text-[11px] text-muted-foreground leading-tight">
                  When the system starts scanning Elon's posts for a winner.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <Calendar className="w-4 h-4 text-neon-cyan" />
                  Monitoring Ends (Your Local Time)
                </Label>
                <Input
                  type="datetime-local"
                  value={newRound.predictionEndTime}
                  onChange={(e) => setNewRound({ ...newRound, predictionEndTime: e.target.value })}
                  className="bg-muted/30 border-border/50"
                />
                <p className="text-[11px] text-muted-foreground leading-tight">
                  The deadline for the event. If no match is found by this time, the round ends.
                </p>
              </div>
            </div>

            <div className="max-w-xs space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Lock className="w-4 h-4 text-neon-orange" />
                Voting Cut-off (minutes before start)
              </Label>
              <Input
                type="number"
                min={0}
                max={1440}
                value={newRound.voteLockMinutes}
                onChange={(e) => setNewRound({ ...newRound, voteLockMinutes: Number(e.target.value) })}
                className="bg-muted/30 border-border/50"
              />
              <p className="text-[11px] text-muted-foreground leading-tight">
                How many minutes before "Monitoring Starts" should voting close?
              </p>
            </div>
          </div>

          {/* Real-time Summary / Preview */}
          {(newRound.predictionStartTime || newRound.predictionEndTime) && (
            <div className="p-4 rounded-xl bg-neon-cyan/5 border border-neon-cyan/20 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neon-cyan flex items-center gap-2">
                <Hash className="w-3 h-3" />
                Round Lifecycle Summary
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase">Voting Opens</span>
                  <span className="text-sm font-medium text-neon-green">Immediately upon creation</span>
                </div>
                
                {newRound.predictionStartTime && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase">Voting Closes (Local)</span>
                    <span className="text-sm font-medium text-neon-orange">
                      {formatToLocalTime(new Date(new Date(newRound.predictionStartTime).getTime() - (newRound.voteLockMinutes * 60000)).toISOString())}
                    </span>
                  </div>
                )}

                {newRound.predictionStartTime && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase">Monitoring Starts (Local)</span>
                    <span className="text-sm font-medium text-foreground">
                      {formatToLocalTime(new Date(newRound.predictionStartTime).toISOString())}
                    </span>
                  </div>
                )}

                {newRound.predictionEndTime && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase">Round Deadline (Local)</span>
                    <span className="text-sm font-medium text-foreground">
                      {formatToLocalTime(new Date(newRound.predictionEndTime).toISOString())}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button 
              variant="neon" 
              onClick={createRound} 
              disabled={creating} 
              className="w-full h-12 text-base font-semibold shadow-lg shadow-neon-cyan/10"
            >
              <Zap className={`w-5 h-5 mr-2 ${creating ? "animate-pulse" : ""}`} />
              {creating ? "Setting up Round..." : "Launch Round & Start Voting"}
            </Button>
            <p className="text-center text-[10px] text-muted-foreground mt-3 uppercase tracking-tighter">
              A new round will be visible to all users instantly after clicking launch.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Round History */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Recent Rounds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rounds.map((round) => (
              <div key={round.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Round {round.round_number}</span>
                    <Badge className={getStatusColor(round.status)}>{round.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{round.question}</p>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    {round.prediction_start_time
                      ? `${formatToLocalTime(round.prediction_start_time)} - ${formatToLocalTime(round.end_time)}`
                      : `${formatToLocalTime(round.start_time)} - ${formatToLocalTime(round.end_time)}`}
                    {round.vote_lock_minutes ? ` (vote lock: ${round.vote_lock_minutes}m)` : ""}
                  </div>
                  {round.winning_tweet_text && (
                    <p className="text-xs text-muted-foreground truncate max-w-md">
                      Winner: "{round.winning_tweet_text}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right mr-4">
                    <p className="text-sm text-muted-foreground">{round.total_votes} votes</p>
                    <p className="text-sm text-neon-green">{round.total_winners} winners</p>
                  </div>
                  {(round.status === "open") && (
                    <Button size="sm" variant="outline" onClick={() => endRound(round.id)} disabled={loading} title="Run winner detection">
                      <Square className="w-3.5 h-3.5" />
                      Check winner
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {rounds.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No rounds created yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
