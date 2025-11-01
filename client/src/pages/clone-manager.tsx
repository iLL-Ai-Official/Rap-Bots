import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bot, Zap, TrendingUp, Swords, Users, Play, Trophy, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";

interface UserClone {
  id: string;
  userId: string;
  cloneName: string;
  skillLevel: number;
  avgRhymeDensity: number;
  avgFlowQuality: number;
  avgCreativity: number;
  battlesAnalyzed: number;
  style: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AvailableClone extends UserClone {
  ownerUsername: string;
}

interface CloneBattleRound {
  roundNumber: number;
  userClone: {
    verse: string;
    scores: {
      rhymeDensity: number;
      flowQuality: number;
      creativity: number;
      totalScore: number;
    };
  };
  opponentClone: {
    verse: string;
    scores: {
      rhymeDensity: number;
      flowQuality: number;
      creativity: number;
      totalScore: number;
    };
  };
  battleScore: {
    userScore: number;
    opponentScore: number;
  };
}

export default function CloneManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [battlesLimit, setBattlesLimit] = useState<string>("10");
  const [showCloneSelection, setShowCloneSelection] = useState(false);
  const [selectedOpponentClone, setSelectedOpponentClone] = useState<AvailableClone | null>(null);
  const [battleInProgress, setBattleInProgress] = useState(false);
  const [battleId, setBattleId] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [battleRounds, setBattleRounds] = useState<CloneBattleRound[]>([]);
  const [battleComplete, setBattleComplete] = useState(false);

  // Fetch user's clone
  const { data: clone, isLoading, error } = useQuery<UserClone>({
    queryKey: ['/api/user/clone'],
    retry: false,
  });

  // Fetch available clones
  const { data: availableClones = [], isLoading: loadingClones } = useQuery<AvailableClone[]>({
    queryKey: ['/api/clones/available'],
    enabled: showCloneSelection,
  });

  // Generate/update clone mutation
  const generateCloneMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/user/clone/generate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          battlesLimit: battlesLimit === "all" ? 9999 : parseInt(battlesLimit) 
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to generate clone');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/clone'] });
      toast({
        title: "🤖 Clone Generated!",
        description: `${data.cloneName} is ready to battle (Skill: ${data.skillLevel}/100)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate clone",
        variant: "destructive",
      });
    },
  });

  // Start clone battle mutation
  const startCloneBattleMutation = useMutation({
    mutationFn: async (opponentCloneId: string) => {
      return await apiRequest('/api/clone-battles/start', {
        method: 'POST',
        body: JSON.stringify({ opponentCloneId }),
      });
    },
    onSuccess: (data) => {
      setBattleId(data.battleId);
      setBattleInProgress(true);
      setShowCloneSelection(false);
      setCurrentRound(0);
      setBattleRounds([]);
      setBattleComplete(false);
      toast({
        title: "🤖 Clone Battle Started!",
        description: `${data.userClone.cloneName} vs ${data.opponentClone.cloneName}`,
      });
      // Auto-start first round
      setTimeout(() => processNextRound(data.battleId, 1), 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start clone battle",
        variant: "destructive",
      });
    },
  });

  // Process battle round
  const processNextRound = async (battleIdToUse: string, roundNumber: number) => {
    try {
      const response = await apiRequest(`/api/clone-battles/${battleIdToUse}/round`, {
        method: 'POST',
        body: JSON.stringify({ roundNumber }),
      });

      setBattleRounds(prev => [...prev, { ...response, roundNumber }]);
      setCurrentRound(roundNumber);

      // Check if battle is complete (3 rounds)
      if (roundNumber >= 3) {
        setTimeout(() => completeBattle(battleIdToUse), 2000);
      } else {
        // Auto-advance to next round
        setTimeout(() => processNextRound(battleIdToUse, roundNumber + 1), 3000);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process round",
        variant: "destructive",
      });
      setBattleInProgress(false);
    }
  };

  // Complete battle
  const completeBattle = async (battleIdToUse: string) => {
    try {
      const response = await apiRequest(`/api/clone-battles/${battleIdToUse}/complete`, {
        method: 'POST',
      });

      setBattleComplete(true);
      setBattleInProgress(false);

      toast({
        title: response.didUserCloneWin ? "🏆 Victory!" : "💀 Defeat",
        description: response.didUserCloneWin 
          ? "Your clone dominated the battle!" 
          : "Your clone fought well but fell short.",
      });

      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete battle",
        variant: "destructive",
      });
    }
  };

  const handleBattleClone = () => {
    if (clone) {
      // Navigate to battle arena with clone as opponent
      setLocation(`/?opponent=clone_${clone.id}`);
    }
  };

  const getSkillLevelColor = (level: number) => {
    if (level < 40) return "text-gray-500";
    if (level < 65) return "text-blue-500";
    if (level < 85) return "text-purple-500";
    return "text-red-500";
  };

  const getSkillLevelLabel = (level: number) => {
    if (level < 40) return "Beginner";
    if (level < 65) return "Intermediate";
    if (level < 85) return "Advanced";
    return "Expert";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Bot className="h-10 w-10" />
          Clone Manager
        </h1>
        <p className="text-muted-foreground">
          Create and battle against an AI clone of yourself that matches your skill level
        </p>
      </div>

      {!clone && !error && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>No Clone Yet</CardTitle>
            <CardDescription>
              Generate your first clone to battle against yourself! Your clone will be created based on your past battle performance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="battles-limit">Battles to Analyze</Label>
              <Select value={battlesLimit} onValueChange={setBattlesLimit}>
                <SelectTrigger id="battles-limit" data-testid="select-battles-limit">
                  <SelectValue placeholder="Select battles to analyze" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">Last 10 Battles</SelectItem>
                  <SelectItem value="25">Last 25 Battles</SelectItem>
                  <SelectItem value="50">Last 50 Battles</SelectItem>
                  <SelectItem value="all">All Battles</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Analyzing more battles creates a more accurate clone
              </p>
            </div>
            <Button
              onClick={() => generateCloneMutation.mutate()}
              disabled={generateCloneMutation.isPending}
              size="lg"
              data-testid="button-generate-clone"
            >
              {generateCloneMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Clone...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-5 w-5" />
                  Generate My Clone
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {clone && (
        <>
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-3xl">{clone.cloneName}</CardTitle>
                  <CardDescription className="mt-2">
                    Your AI mirror - Trained on {clone.battlesAnalyzed} of your battles
                  </CardDescription>
                </div>
                <Badge variant="secondary" className={`text-lg px-4 py-2 ${getSkillLevelColor(clone.skillLevel)}`}>
                  {getSkillLevelLabel(clone.skillLevel)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <span className="font-medium">Overall Skill</span>
                    <span className={`text-xl font-bold ${getSkillLevelColor(clone.skillLevel)}`}>
                      {clone.skillLevel}/100
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <span className="font-medium">Battle Style</span>
                    <Badge variant="outline" className="capitalize">
                      {clone.style}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <span className="font-medium">Rhyme Density</span>
                    <span className="text-xl font-bold">{clone.avgRhymeDensity}/100</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <span className="font-medium">Flow Quality</span>
                    <span className="text-xl font-bold">{clone.avgFlowQuality}/100</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <span className="font-medium">Creativity</span>
                    <span className="text-xl font-bold">{clone.avgCreativity}/100</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="update-battles-limit">Battles to Analyze for Update</Label>
                  <Select value={battlesLimit} onValueChange={setBattlesLimit}>
                    <SelectTrigger id="update-battles-limit" data-testid="select-update-battles-limit">
                      <SelectValue placeholder="Select battles to analyze" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">Last 10 Battles</SelectItem>
                      <SelectItem value="25">Last 25 Battles</SelectItem>
                      <SelectItem value="50">Last 50 Battles</SelectItem>
                      <SelectItem value="all">All Battles</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    More battles = better accuracy
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    onClick={handleBattleClone}
                    size="lg"
                    data-testid="button-battle-clone"
                  >
                    <Swords className="mr-2 h-5 w-5" />
                    Battle Your Clone
                  </Button>
                  <Button
                    onClick={() => setShowCloneSelection(true)}
                    size="lg"
                    variant="secondary"
                    disabled={!clone || battleInProgress}
                    data-testid="button-clone-vs-clone"
                  >
                    <Users className="mr-2 h-5 w-5" />
                    Clone vs Clone
                  </Button>
                  <Button
                    onClick={() => generateCloneMutation.mutate()}
                    disabled={generateCloneMutation.isPending}
                    variant="outline"
                    size="lg"
                    data-testid="button-update-clone"
                  >
                    {generateCloneMutation.isPending ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <TrendingUp className="mr-2 h-5 w-5" />
                    )}
                    Update Clone
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground text-center pt-2">
                Last updated: {new Date(clone.updatedAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>

          {!battleInProgress && !showCloneSelection && (
            <Card>
              <CardHeader>
                <CardTitle>About Your Clone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-muted-foreground">
                <p>
                  Your clone is an AI opponent that mirrors your rap battle abilities. It's trained on your recent battle performance to match your skill level.
                </p>
                <p>
                  As you improve and battle more, update your clone to keep it in sync with your current abilities. This gives you a perfect practice partner!
                </p>
                <p className="text-sm">
                  <strong>Tip:</strong> Battle your clone regularly to see how you match up against yourself and identify areas for improvement.
                </p>
              </CardContent>
            </Card>
          )}

          {showCloneSelection && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Select Opponent Clone</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCloneSelection(false)}
                    data-testid="button-close-selection"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </div>
                <CardDescription>
                  Choose another user's clone to battle against. Cost: 1 battle credit
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingClones ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : availableClones.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No other clones available yet</p>
                    <p className="text-sm mt-2">Be the first to create a clone!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableClones.map((availableClone) => (
                      <Card key={availableClone.id} className="hover:bg-accent/50 cursor-pointer transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-lg">{availableClone.cloneName}</h3>
                                <Badge variant="outline" className="text-xs">
                                  @{availableClone.ownerUsername}
                                </Badge>
                                <Badge variant="secondary" className={getSkillLevelColor(availableClone.skillLevel)}>
                                  {getSkillLevelLabel(availableClone.skillLevel)}
                                </Badge>
                              </div>
                              <div className="flex gap-4 text-sm text-muted-foreground">
                                <span>Skill: {availableClone.skillLevel}/100</span>
                                <span>Style: {availableClone.style}</span>
                                <span>{availableClone.battlesAnalyzed} battles analyzed</span>
                              </div>
                            </div>
                            <Button
                              onClick={() => {
                                setSelectedOpponentClone(availableClone);
                                startCloneBattleMutation.mutate(availableClone.id);
                              }}
                              disabled={startCloneBattleMutation.isPending}
                              data-testid={`button-battle-${availableClone.id}`}
                            >
                              {startCloneBattleMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Play className="mr-2 h-4 w-4" />
                                  Battle
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {battleInProgress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-6 w-6" />
                  Clone Battle in Progress
                </CardTitle>
                <CardDescription>
                  Spectator Mode - Watch your clone battle automatically
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
                  <div className="text-center flex-1">
                    <p className="text-sm text-muted-foreground">Your Clone</p>
                    <p className="font-bold text-lg">{clone?.cloneName}</p>
                    <p className="text-2xl font-bold mt-2">
                      {battleRounds.length > 0 
                        ? battleRounds[battleRounds.length - 1].battleScore.userScore 
                        : 0}
                    </p>
                  </div>
                  <div className="px-4">
                    <p className="text-3xl font-bold text-muted-foreground">VS</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-sm text-muted-foreground">Opponent</p>
                    <p className="font-bold text-lg">{selectedOpponentClone?.cloneName}</p>
                    <p className="text-2xl font-bold mt-2">
                      {battleRounds.length > 0 
                        ? battleRounds[battleRounds.length - 1].battleScore.opponentScore 
                        : 0}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Round Progress</Label>
                    <span className="text-sm font-medium">Round {currentRound} / 3</span>
                  </div>
                  <Progress value={(currentRound / 3) * 100} className="h-2" />
                </div>

                <div className="space-y-4">
                  {battleRounds.map((round, index) => (
                    <Card key={index} className="border-2">
                      <CardHeader>
                        <CardTitle className="text-sm">Round {round.roundNumber}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold">{clone?.cloneName}</Label>
                            <Badge variant="outline">Score: {round.userClone.scores.totalScore}</Badge>
                          </div>
                          <div className="p-3 bg-blue-500/10 rounded border border-blue-500/20">
                            <p className="text-sm whitespace-pre-wrap">{round.userClone.verse}</p>
                          </div>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <span>Rhyme: {round.userClone.scores.rhymeDensity}</span>
                            <span>Flow: {round.userClone.scores.flowQuality}</span>
                            <span>Creativity: {round.userClone.scores.creativity}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold">{selectedOpponentClone?.cloneName}</Label>
                            <Badge variant="outline">Score: {round.opponentClone.scores.totalScore}</Badge>
                          </div>
                          <div className="p-3 bg-red-500/10 rounded border border-red-500/20">
                            <p className="text-sm whitespace-pre-wrap">{round.opponentClone.verse}</p>
                          </div>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <span>Rhyme: {round.opponentClone.scores.rhymeDensity}</span>
                            <span>Flow: {round.opponentClone.scores.flowQuality}</span>
                            <span>Creativity: {round.opponentClone.scores.creativity}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {!battleComplete && currentRound < 3 && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="ml-3 text-sm text-muted-foreground">Generating next round...</p>
                    </div>
                  )}

                  {battleComplete && (
                    <Card className="border-2 border-primary">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Trophy className="h-5 w-5" />
                          Battle Complete!
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg">
                          {battleRounds.length > 0 &&
                          battleRounds[battleRounds.length - 1].battleScore.userScore >
                          battleRounds[battleRounds.length - 1].battleScore.opponentScore
                            ? `🏆 ${clone?.cloneName} wins!`
                            : `🏆 ${selectedOpponentClone?.cloneName} wins!`}
                        </p>
                        <Button
                          onClick={() => {
                            setBattleInProgress(false);
                            setBattleComplete(false);
                            setBattleRounds([]);
                            setCurrentRound(0);
                            setBattleId(null);
                            setSelectedOpponentClone(null);
                          }}
                          className="mt-4"
                          data-testid="button-finish-battle"
                        >
                          Finish
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
