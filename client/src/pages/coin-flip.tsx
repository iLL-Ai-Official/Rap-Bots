import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Coins, TrendingUp, Award } from "lucide-react";
import { Link } from "wouter";
import coinHeads from "@assets/coin_for_isolated_1762025827709.png";
import coinTails from "@assets/coin_feat_isolated_1762025846950.png";

interface CoinFlipResult {
  result: 'heads' | 'tails';
  won: boolean;
  creditsWon: number;
  newBalance: number;
}

interface WalletData {
  battleCredits: number;
  tokens: string;
}

export default function CoinFlip() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFlipping, setIsFlipping] = useState(false);
  const [lastResult, setLastResult] = useState<'heads' | 'tails' | null>(null);
  const [betAmount, setBetAmount] = useState(1);
  const [userChoice, setUserChoice] = useState<'heads' | 'tails'>('heads');
  const [flipCount, setFlipCount] = useState(0);

  const { data: wallet } = useQuery<WalletData>({
    queryKey: ['/api/wallet'],
    enabled: !!user,
  });

  const flipMutation = useMutation({
    mutationFn: async (choice: 'heads' | 'tails') => {
      return apiRequest<CoinFlipResult>('/api/coinflip', 'POST', { choice, betAmount });
    },
    onSuccess: (data: CoinFlipResult) => {
      setLastResult(data.result);
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
      
      if (data.won) {
        toast({
          title: "🎉 You Won!",
          description: `You won ${data.creditsWon} credits! New balance: ${data.newBalance}`,
        });
      } else {
        toast({
          title: "💔 You Lost",
          description: `Better luck next time! Balance: ${data.newBalance}`,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Flip Failed",
        description: error.message || "Failed to flip coin",
        variant: "destructive",
      });
    },
  });

  const handleFlip = () => {
    if (!wallet || wallet.battleCredits < betAmount) {
      toast({
        title: "Insufficient Credits",
        description: "You need more credits to flip!",
        variant: "destructive",
      });
      return;
    }

    setIsFlipping(true);
    setFlipCount(flipCount + 1);
    
    // Visual flip animation
    setTimeout(() => {
      flipMutation.mutate(userChoice);
      setTimeout(() => {
        setIsFlipping(false);
      }, 500);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              🪙 RapBots Coin Flip
            </h1>
            <p className="text-gray-300">Double or nothing - test your luck!</p>
          </div>
          <Link href="/">
            <Button variant="outline" className="border-purple-400 text-purple-400">
              ← Back Home
            </Button>
          </Link>
        </div>

        {/* Wallet Balance */}
        <Card className="bg-slate-800 border-purple-500 mb-6">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-400" />
                <span className="text-white font-semibold">Your Credits:</span>
                <Badge className="bg-yellow-600 text-white">
                  {wallet?.battleCredits || 0}
                </Badge>
              </div>
              <Link href="/wallet">
                <Button size="sm" variant="outline" className="border-green-400 text-green-400">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Get More Credits
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Main Coin Flip Area */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Coin Display */}
          <Card className="bg-slate-800 border-purple-500">
            <CardHeader>
              <CardTitle className="text-white text-center">Flip the Coin</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-8">
              {/* Coin Animation */}
              <div className="relative w-64 h-64 mb-6">
                <div
                  className={`absolute inset-0 transition-all duration-500 ${
                    isFlipping ? 'animate-spin-fast' : ''
                  }`}
                  style={{
                    transform: lastResult === 'tails' ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Heads */}
                  <img
                    src={coinHeads}
                    alt="Coin Heads - Rapper"
                    className="absolute inset-0 w-full h-full object-contain rounded-full shadow-2xl"
                    style={{ backfaceVisibility: 'hidden' }}
                  />
                  {/* Tails */}
                  <img
                    src={coinTails}
                    alt="Coin Tails - Robot"
                    className="absolute inset-0 w-full h-full object-contain rounded-full shadow-2xl"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  />
                </div>
              </div>

              {/* Result Display */}
              {lastResult && !isFlipping && (
                <div className="text-center mb-4">
                  <p className="text-2xl font-bold text-yellow-400">
                    {lastResult === 'heads' ? '🎤 Rapper (Heads)' : '🤖 Robot (Tails)'}
                  </p>
                </div>
              )}

              {/* Flip Count */}
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Award className="h-4 w-4" />
                <span>Total Flips: {flipCount}</span>
              </div>
            </CardContent>
          </Card>

          {/* Betting Controls */}
          <Card className="bg-slate-800 border-purple-500">
            <CardHeader>
              <CardTitle className="text-white">Place Your Bet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Choose Side */}
              <div>
                <label className="text-white mb-2 block font-semibold">Choose Your Side</label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => setUserChoice('heads')}
                    variant={userChoice === 'heads' ? 'default' : 'outline'}
                    className={`h-20 ${
                      userChoice === 'heads'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'border-purple-400 text-purple-400'
                    }`}
                    data-testid="button-choose-heads"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">🎤</span>
                      <span>Rapper (Heads)</span>
                    </div>
                  </Button>
                  <Button
                    onClick={() => setUserChoice('tails')}
                    variant={userChoice === 'tails' ? 'default' : 'outline'}
                    className={`h-20 ${
                      userChoice === 'tails'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'border-purple-400 text-purple-400'
                    }`}
                    data-testid="button-choose-tails"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">🤖</span>
                      <span>Robot (Tails)</span>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Bet Amount */}
              <div>
                <label className="text-white mb-2 block font-semibold">
                  Bet Amount (Win 2x)
                </label>
                <div className="flex gap-2">
                  {[1, 5, 10, 25, 50].map((amount) => (
                    <Button
                      key={amount}
                      onClick={() => setBetAmount(amount)}
                      variant={betAmount === amount ? 'default' : 'outline'}
                      size="sm"
                      className={
                        betAmount === amount
                          ? 'bg-yellow-600 hover:bg-yellow-700'
                          : 'border-yellow-400 text-yellow-400'
                      }
                      disabled={!wallet || wallet.battleCredits < amount}
                      data-testid={`button-bet-${amount}`}
                    >
                      {amount}
                    </Button>
                  ))}
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  Win {betAmount * 2} credits if you guess correctly!
                </p>
              </div>

              {/* Flip Button */}
              <Button
                onClick={handleFlip}
                disabled={isFlipping || !wallet || wallet.battleCredits < betAmount}
                className="w-full h-16 text-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                data-testid="button-flip-coin"
              >
                {isFlipping ? (
                  <>
                    <Coins className="h-6 w-6 mr-2 animate-spin" />
                    Flipping...
                  </>
                ) : (
                  <>
                    <Coins className="h-6 w-6 mr-2" />
                    Flip Coin ({betAmount} credits)
                  </>
                )}
              </Button>

              {/* Rules */}
              <div className="bg-slate-700 p-4 rounded-lg">
                <h3 className="text-white font-semibold mb-2">How to Play</h3>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• Choose Rapper (Heads) or Robot (Tails)</li>
                  <li>• Select your bet amount</li>
                  <li>• If you win, you get 2x your bet!</li>
                  <li>• If you lose, you lose your bet</li>
                  <li>• Need more credits? Win battles or visit the Wallet!</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Card */}
        <Card className="bg-slate-800 border-purple-500 mt-6">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-purple-400">{flipCount}</p>
                <p className="text-gray-400 text-sm">Total Flips</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-yellow-400">{wallet?.battleCredits || 0}</p>
                <p className="text-gray-400 text-sm">Current Balance</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-400">50%</p>
                <p className="text-gray-400 text-sm">Fair Odds</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <style>{`
        @keyframes spin-fast {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(1080deg); }
        }
        .animate-spin-fast {
          animation: spin-fast 2s cubic-bezier(0.4, 0.0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}
