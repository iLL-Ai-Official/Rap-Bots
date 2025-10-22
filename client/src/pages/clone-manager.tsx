import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bot, Zap, TrendingUp, Swords } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "wouter";
import { CloneBattleSponsorCard } from "@/components/clone-battle-sponsor-card";

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

export default function CloneManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useNavigate();

  // Fetch user's clone
  const { data: clone, isLoading, error } = useQuery<UserClone>({
    queryKey: ['/api/user/clone'],
    retry: false,
  });

  // Generate/update clone mutation
  const generateCloneMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/user/clone/generate', {
        method: 'POST',
        credentials: 'include',
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

  const handleBattleClone = () => {
    if (clone) {
      // Navigate to battle arena with clone as opponent
      navigate(`/?opponent=clone_${clone.id}`);
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
          <CardContent>
            <Button
              onClick={() => generateCloneMutation.mutate()}
              disabled={generateCloneMutation.isPending}
              size="lg"
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

              <div className="flex gap-4 pt-4">
                <Button
                  onClick={handleBattleClone}
                  size="lg"
                  className="flex-1"
                >
                  <Swords className="mr-2 h-5 w-5" />
                  Battle Your Clone
                </Button>
                <Button
                  onClick={() => generateCloneMutation.mutate()}
                  disabled={generateCloneMutation.isPending}
                  variant="outline"
                  size="lg"
                >
                  {generateCloneMutation.isPending ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <TrendingUp className="mr-2 h-5 w-5" />
                  )}
                  Update Clone
                </Button>
              </div>

              <div className="text-sm text-muted-foreground text-center pt-2">
                Last updated: {new Date(clone.updatedAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>

          {/* Clone Battle Sponsorship Example */}
          <div className="mb-8">
            <CloneBattleSponsorCard 
              sponsorship={{
                id: 'demo-sponsor-1',
                sponsorName: 'Battle Rap League',
                amount: 25,
                cloneBattlesSponsored: 150
              }}
              showInBattle={false}
            />
          </div>

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
              <p className="text-sm mt-4 p-3 bg-blue-900/20 border border-blue-500/50 rounded-lg">
                <strong>🚀 Pro Tip:</strong> Premium and Pro members can sponsor clone battles for branding opportunities and support the community!
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
