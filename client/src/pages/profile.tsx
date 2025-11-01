import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trophy, Target, TrendingUp, Wallet, Crown, Zap, Mic } from "lucide-react";
import type { User, ArcWallet } from "@shared/schema";

interface UserStats {
  totalBattles: number;
  totalWins: number;
  winRate: number;
  battlesThisMonth: number;
}

interface BattleHistory {
  id: string;
  aiCharacterName: string;
  createdAt: string;
  userScore: number;
  aiScore: number;
  status: string;
}

export default function Profile() {
  const { user: currentUser } = useAuth();

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: !!currentUser,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
    enabled: !!currentUser,
  });

  const { data: battleHistory, isLoading: historyLoading } = useQuery<BattleHistory[]>({
    queryKey: ["/api/battles/history"],
    enabled: !!currentUser,
  });

  const { data: arcWallet, isLoading: walletLoading } = useQuery<ArcWallet>({
    queryKey: ["/api/arc/wallet"],
    enabled: !!currentUser,
  });

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'pro': return 'text-amber-500';
      case 'premium': return 'text-purple-500';
      default: return 'text-gray-400';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'pro': return <Crown className="h-4 w-4" />;
      case 'premium': return <Zap className="h-4 w-4" />;
      default: return <Mic className="h-4 w-4" />;
    }
  };

  const getTierBadgeClass = (tier: string) => {
    switch (tier) {
      case 'pro': return 'bg-gradient-to-r from-amber-500 to-orange-500';
      case 'premium': return 'bg-gradient-to-r from-purple-500 to-pink-500';
      default: return 'bg-slate-600';
    }
  };

  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  if (userLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="container mx-auto max-w-6xl">
          <Skeleton className="h-12 w-48 mb-8" />
          <div className="grid gap-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!user || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center py-12">
            <p className="text-white text-xl">User not found</p>
            <Link href="/">
              <Button className="mt-4" variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Back Button */}
        <Link href="/">
          <Button variant="outline" className="mb-6 border-slate-600 text-slate-300 hover:bg-slate-700" data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        {/* Profile Header */}
        <Card className="bg-slate-800 border-slate-700 text-white mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <Avatar className="h-24 w-24 border-4 border-purple-500" data-testid="img-avatar">
                <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || 'User'} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-purple-600 to-pink-600">
                  {getInitials(user.firstName || undefined, user.lastName || undefined, user.email || undefined)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2" data-testid="text-username">
                  {user.firstName || user.lastName 
                    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                    : user.email?.split('@')[0] || 'User'}
                </h1>
                {user.email && (
                  <p className="text-slate-400 mb-3" data-testid="text-email">{user.email}</p>
                )}
                <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap">
                  <Badge 
                    className={`${getTierBadgeClass(user.subscriptionTier || 'free')} text-white`}
                    data-testid="badge-tier"
                  >
                    {getTierIcon(user.subscriptionTier || 'free')}
                    <span className="ml-1 capitalize">{user.subscriptionTier || 'Free'} Tier</span>
                  </Badge>
                  {user.subscriptionTier === 'free' && isOwnProfile && (
                    <Link href="/subscribe?tier=premium">
                      <Button size="sm" variant="outline" className="border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white">
                        Upgrade Account
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-slate-800 border-slate-700 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Total Battles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="text-total-battles">
                {stats.totalBattles || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Total Wins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400" data-testid="text-total-wins">
                {stats.totalWins || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Win Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400" data-testid="text-win-rate">
                {stats.winRate?.toFixed(1) || 0}%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Mic className="h-4 w-4" />
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-cyan-400" data-testid="text-battles-month">
                {stats.battlesThisMonth || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Arc Wallet Section */}
        {arcWallet && (
          <Card className="bg-gradient-to-r from-cyan-900 to-blue-900 border-cyan-500 text-white mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Arc Wallet
              </CardTitle>
              <CardDescription className="text-cyan-100">
                USDC on Circle's Arc L1 Blockchain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-cyan-200 mb-1">Wallet Address</p>
                  <code className="text-xs bg-black/30 px-3 py-2 rounded block font-mono" data-testid="text-wallet-address">
                    {arcWallet.walletAddress}
                  </code>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-cyan-200 mb-1">Current Balance</p>
                    <p className="text-2xl font-bold" data-testid="text-usdc-balance">
                      ${arcWallet.usdcBalance} USDC
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-cyan-200 mb-1">Lifetime Earned</p>
                    <p className="text-xl font-semibold text-green-300" data-testid="text-lifetime-earned">
                      ${arcWallet.lifetimeEarned}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-cyan-200 mb-1">Lifetime Withdrawn</p>
                    <p className="text-xl font-semibold text-orange-300" data-testid="text-lifetime-withdrawn">
                      ${arcWallet.lifetimeWithdrawn}
                    </p>
                  </div>
                </div>
                {isOwnProfile && (
                  <Link href="/wallet">
                    <Button className="w-full bg-white text-cyan-900 hover:bg-cyan-50" data-testid="button-manage-wallet">
                      Manage Wallet
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Battle History */}
        <Card className="bg-slate-800 border-slate-700 text-white">
          <CardHeader>
            <CardTitle>Recent Battle History</CardTitle>
            <CardDescription className="text-slate-400">
              Your most recent rap battles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : battleHistory && battleHistory.length > 0 ? (
              <div className="space-y-4">
                {battleHistory.slice(0, 10).map((battle) => (
                  <div 
                    key={battle.id} 
                    className="flex items-center justify-between p-4 bg-slate-700 rounded-lg hover:bg-slate-650 transition-colors"
                    data-testid={`battle-history-${battle.id}`}
                  >
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        <span>vs {battle.aiCharacterName}</span>
                        <Badge 
                          variant={battle.userScore > battle.aiScore ? "default" : "destructive"}
                          className="text-xs"
                          data-testid={`badge-result-${battle.id}`}
                        >
                          {battle.userScore > battle.aiScore ? 'Won' : battle.userScore === battle.aiScore ? 'Tie' : 'Lost'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        {new Date(battle.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-lg" data-testid={`score-${battle.id}`}>
                        {battle.userScore} - {battle.aiScore}
                      </div>
                      <div className="text-xs text-gray-400">
                        {battle.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Trophy className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No battles yet</p>
                <p className="text-sm">Start your first battle to build your legacy!</p>
                {isOwnProfile && (
                  <Link href="/battle">
                    <Button className="mt-4" data-testid="button-start-battle">
                      Start a Battle
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
