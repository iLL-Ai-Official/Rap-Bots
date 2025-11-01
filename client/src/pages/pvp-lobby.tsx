import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation } from 'wouter';
import { Swords, Users, Trophy, Clock, Check, X, Mail, ArrowRight } from 'lucide-react';
import type { BattleInvite } from '@shared/schema';

interface InviteWithUsers extends BattleInvite {
  challenger: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
  };
  opponent: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
  };
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  totalBattles: number;
  totalWins: number;
}

export default function PvPLobby() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null);

  // Fetch all users for challenge selection
  const { data: allUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: !!user,
  });

  // Fetch battle invites
  const { data: invites, isLoading: invitesLoading } = useQuery<InviteWithUsers[]>({
    queryKey: ['/api/pvp/challenges'],
    enabled: !!user,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Fetch active PvP battles
  const { data: activeBattles } = useQuery({
    queryKey: ['/api/pvp/battles'],
    enabled: !!user,
    refetchInterval: 5000,
  });

  // Create challenge mutation
  const createChallengeMutation = useMutation({
    mutationFn: async (opponentId: string) => {
      const response = await apiRequest('/api/pvp/challenges', {
        method: 'POST',
        body: JSON.stringify({
          opponentId,
          settings: {
            difficulty: 'normal',
            profanityFilter: false,
            lyricComplexity: 75,
            styleIntensity: 85,
            maxRounds: 5,
            creditsPerPlayer: 1,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create challenge');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '⚔️ Challenge Sent!',
        description: 'Your battle invite has been sent',
      });
      setSelectedOpponent(null);
      queryClient.invalidateQueries({ queryKey: ['/api/pvp/challenges'] });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Failed to Send Challenge',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Accept challenge mutation
  const acceptChallengeMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await apiRequest(`/api/pvp/challenges/${inviteId}/accept`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to accept challenge');
      }

      return response.json();
    },
    onSuccess: (battle) => {
      toast({
        title: '✅ Challenge Accepted!',
        description: 'Battle is starting...',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/pvp/challenges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pvp/battles'] });
      
      // Navigate to battle using router
      setLocation(`/battle/${battle.id}?mode=pvp`);
    },
    onError: (error: any) => {
      toast({
        title: '❌ Failed to Accept Challenge',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Decline challenge mutation
  const declineChallengeMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await apiRequest(`/api/pvp/challenges/${inviteId}/decline`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to decline challenge');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Challenge Declined',
        description: 'You declined the battle invite',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/pvp/challenges'] });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Failed to Decline',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const receivedInvites = invites?.filter(i => i.opponentId === user?.id && i.status === 'pending') || [];
  const sentInvites = invites?.filter(i => i.challengerId === user?.id && i.status === 'pending') || [];
  const otherUsers = allUsers?.filter(u => u.id !== user?.id) || [];

  const getWinRate = (totalBattles: number, totalWins: number) => {
    if (totalBattles === 0) return 0;
    return Math.round((totalWins / totalBattles) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-2">
              <Swords className="h-8 w-8 text-purple-400" />
              PvP Battle Lobby
            </h1>
            <p className="text-gray-400">Challenge other rappers to epic battles</p>
          </div>
          
          <Link href="/">
            <Button variant="outline" className="border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white">
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Active Battles */}
        {activeBattles && activeBattles.length > 0 && (
          <Card className="bg-slate-800 border-slate-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Active Battles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeBattles.map((battle: any) => (
                  <Link key={battle.id} href={`/battle/${battle.id}?mode=pvp`}>
                    <Card className="bg-slate-700 border-slate-600 hover:border-purple-500 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={battle.opponent?.profileImageUrl || ''} />
                              <AvatarFallback>
                                {battle.opponent?.firstName?.[0]}{battle.opponent?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-white font-semibold">
                                vs {battle.opponent?.firstName} {battle.opponent?.lastName}
                              </p>
                              <p className="text-sm text-gray-400">
                                Round {Math.floor(battle.challengerScore / 100) + 1} / {battle.maxRounds}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-purple-400">
                                {battle.challengerUserId === user?.id ? battle.challengerScore : battle.opponentScore}
                              </p>
                              <p className="text-xs text-gray-400">Your Score</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-red-400">
                                {battle.challengerUserId === user?.id ? battle.opponentScore : battle.challengerScore}
                              </p>
                              <p className="text-xs text-gray-400">Opponent</p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-purple-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="challenges" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 border-slate-700">
            <TabsTrigger value="challenges" data-testid="tab-find-opponents">
              <Users className="h-4 w-4 mr-2" />
              Find Opponents
            </TabsTrigger>
            <TabsTrigger value="received" data-testid="tab-received-challenges">
              <Mail className="h-4 w-4 mr-2" />
              Received ({receivedInvites.length})
            </TabsTrigger>
            <TabsTrigger value="sent" data-testid="tab-sent-challenges">
              <Clock className="h-4 w-4 mr-2" />
              Sent ({sentInvites.length})
            </TabsTrigger>
          </TabsList>

          {/* Find Opponents Tab */}
          <TabsContent value="challenges">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Available Opponents</CardTitle>
                <CardDescription className="text-gray-400">
                  Challenge other rappers to a PvP battle (1 credit per player)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {otherUsers.map((opponent) => (
                    <Card key={opponent.id} className="bg-slate-700 border-slate-600">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={opponent.profileImageUrl || ''} />
                              <AvatarFallback>
                                {opponent.firstName?.[0]}{opponent.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-white font-semibold">
                                {opponent.firstName} {opponent.lastName}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {opponent.totalBattles || 0} Battles
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {getWinRate(opponent.totalBattles || 0, opponent.totalWins || 0)}% Win Rate
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            onClick={() => createChallengeMutation.mutate(opponent.id)}
                            disabled={createChallengeMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700"
                            data-testid={`button-challenge-${opponent.id}`}
                          >
                            <Swords className="h-4 w-4 mr-2" />
                            Challenge
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {otherUsers.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      No opponents available at the moment
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Received Invites Tab */}
          <TabsContent value="received">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Battle Challenges</CardTitle>
                <CardDescription className="text-gray-400">
                  Accept or decline incoming battle invites
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {receivedInvites.map((invite) => (
                    <Card key={invite.id} className="bg-slate-700 border-slate-600">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={invite.challenger.profileImageUrl || ''} />
                              <AvatarFallback>
                                {invite.challenger.firstName?.[0]}{invite.challenger.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-white font-semibold">
                                {invite.challenger.firstName} {invite.challenger.lastName}
                              </p>
                              <p className="text-sm text-gray-400">
                                {invite.settings.maxRounds || 5} rounds • {invite.settings.creditsPerPlayer || 1} credit
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              onClick={() => acceptChallengeMutation.mutate(invite.id)}
                              disabled={acceptChallengeMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                              data-testid={`button-accept-${invite.id}`}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Accept
                            </Button>
                            <Button
                              onClick={() => declineChallengeMutation.mutate(invite.id)}
                              disabled={declineChallengeMutation.isPending}
                              variant="outline"
                              className="border-red-400 text-red-400 hover:bg-red-400 hover:text-white"
                              data-testid={`button-decline-${invite.id}`}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Decline
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {receivedInvites.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      No pending challenges
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sent Invites Tab */}
          <TabsContent value="sent">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Sent Challenges</CardTitle>
                <CardDescription className="text-gray-400">
                  Waiting for opponents to respond
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sentInvites.map((invite) => (
                    <Card key={invite.id} className="bg-slate-700 border-slate-600">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={invite.opponent.profileImageUrl || ''} />
                              <AvatarFallback>
                                {invite.opponent.firstName?.[0]}{invite.opponent.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-white font-semibold">
                                {invite.opponent.firstName} {invite.opponent.lastName}
                              </p>
                              <p className="text-sm text-gray-400">
                                Sent {new Date(invite.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          <Badge variant="secondary" className="bg-yellow-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {sentInvites.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      No sent challenges
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
