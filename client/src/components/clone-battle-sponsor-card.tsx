import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, DollarSign, Users, TrendingUp, Award } from 'lucide-react';

interface CloneBattleSponsorship {
  id: string;
  sponsorName: string;
  logoUrl?: string;
  amount: number;
  cloneBattlesSponsored: number;
}

interface CloneBattleSponsorCardProps {
  sponsorship: CloneBattleSponsorship;
  showInBattle?: boolean;
}

/**
 * Clone Battle Sponsorship Card
 * Displays sponsor branding during clone battles
 * Monetizes clone vs clone battles through sponsorships
 */
export function CloneBattleSponsorCard({ sponsorship, showInBattle = false }: CloneBattleSponsorCardProps) {
  if (showInBattle) {
    // Compact battle view
    return (
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/50 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-medium text-blue-300">
              Sponsored by: <span className="text-white font-bold">{sponsorship.sponsorName}</span>
            </span>
          </div>
          <Badge variant="outline" className="bg-green-900/50 text-green-300 border-green-500/50">
            ${sponsorship.amount}
          </Badge>
        </div>
      </div>
    );
  }

  // Full card view
  return (
    <Card className="border-blue-500/50 bg-gradient-to-br from-blue-900/20 to-purple-900/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-400" />
          Clone Battle Sponsor
        </CardTitle>
        <CardDescription>
          This battle is sponsored by {sponsorship.sponsorName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-900/30 rounded-lg">
            <div className="flex items-center gap-3">
              {sponsorship.logoUrl ? (
                <img 
                  src={sponsorship.logoUrl} 
                  alt={sponsorship.sponsorName}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <Award className="h-12 w-12 text-blue-400" />
              )}
              <div>
                <p className="font-bold text-lg text-white">{sponsorship.sponsorName}</p>
                <p className="text-sm text-gray-400">Premium Battle Sponsor</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-900/50 text-green-300 border-green-500/50">
              <DollarSign className="h-3 w-3 mr-1" />
              {sponsorship.amount}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900/50 rounded-lg p-3 text-center">
              <Users className="h-6 w-6 mx-auto mb-1 text-blue-400" />
              <p className="text-2xl font-bold text-white">{sponsorship.cloneBattlesSponsored}</p>
              <p className="text-xs text-gray-400">Battles Sponsored</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 text-center">
              <TrendingUp className="h-6 w-6 mx-auto mb-1 text-green-400" />
              <p className="text-2xl font-bold text-white">${sponsorship.amount * sponsorship.cloneBattlesSponsored}</p>
              <p className="text-xs text-gray-400">Total Value</p>
            </div>
          </div>
          
          <p className="text-xs text-center text-gray-500 italic">
            Clone battles sponsored by brands help keep the platform free for everyone
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
