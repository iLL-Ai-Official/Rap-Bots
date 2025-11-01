import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Coins, 
  TrendingUp, 
  Wallet as WalletIcon, 
  Zap, 
  CreditCard, 
  History,
  DollarSign,
  Gift,
  Loader2,
  Link,
  Play,
  Send
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";

interface UserWallet {
  id: string;
  userId: string;
  battleCredits: number;
  tokens: string;
  lifetimeEarned: string;
  lifetimeSpent: string;
  cloneAdRevenue: string;
  totalAdImpressions: number;
  createdAt: string;
  updatedAt: string;
}

interface Transaction {
  id: string;
  userId: string;
  type: string;
  amount: string;
  currency: string;
  description: string | null;
  battleId: string | null;
  relatedUserId: string | null;
  metadata: any;
  createdAt: string;
}

interface MiningEvent {
  id: string;
  userId: string;
  tokensEarned: string;
  activityType: string;
  battleId: string | null;
  createdAt: string;
}

interface ArcWallet {
  id: string;
  userId: string;
  walletAddress: string;
  usdcBalance: string;
  lifetimeEarned: string;
  createdAt: string;
  updatedAt: string;
}

interface ArcTransaction {
  id: string;
  userId: string;
  type: string;
  amount: string;
  fromAddress: string;
  toAddress: string;
  status: string;
  txHash: string | null;
  voiceCommandText: string | null;
  battleId: string | null;
  createdAt: string;
}

interface VoiceCommand {
  id: string;
  userId: string;
  commandText: string;
  intent: string;
  status: string;
  errorMessage: string | null;
  audioUrl: string | null;
  executedAt: string | null;
  createdAt: string;
}

const CREDIT_PACKAGES = [
  { credits: 100, price: 0.99, bonus: 0 },
  { credits: 500, price: 3.99, bonus: 50 },
  { credits: 1000, price: 6.99, bonus: 150 },
  { credits: 5000, price: 24.99, bonus: 1000 },
];

export default function Wallet() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [voiceCommandText, setVoiceCommandText] = useState("");

  // Fetch wallet
  const { data: wallet, isLoading: walletLoading } = useQuery<UserWallet>({
    queryKey: ['/api/wallet'],
  });

  // Fetch transactions
  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions', { limit: 20 }],
  });

  // Fetch mining events
  const { data: miningEvents = [] } = useQuery<MiningEvent[]>({
    queryKey: ['/api/mining/events', { limit: 20 }],
  });

  // Fetch ad revenue
  const { data: adRevenue } = useQuery<{ totalRevenue: string; impressions: number }>({
    queryKey: ['/api/credits/revenue'],
  });

  // Fetch Arc wallet
  const { data: arcWallet, isLoading: arcWalletLoading } = useQuery<ArcWallet>({
    queryKey: ['/api/arc/wallet'],
  });

  // Fetch Arc transactions
  const { data: arcTransactions = [] } = useQuery<ArcTransaction[]>({
    queryKey: ['/api/arc/transactions', { limit: 20 }],
  });

  // Fetch voice commands
  const { data: voiceCommands = [] } = useQuery<VoiceCommand[]>({
    queryKey: ['/api/arc/voice-commands', { limit: 20 }],
  });

  // Claim daily bonus mutation
  const claimDailyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/mining/daily-login', {
        method: 'POST',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - already claimed today
          throw new Error(data.message || 'Daily bonus already claimed. Try again tomorrow!');
        }
        throw new Error('Failed to claim daily bonus');
      }
      
      return data;
    },
    onSuccess: (data: any) => {
      // Invalidate all wallet-related queries with exact keys
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', { limit: 20 }] });
      queryClient.invalidateQueries({ queryKey: ['/api/mining/events', { limit: 20 }] });
      queryClient.invalidateQueries({ queryKey: ['/api/credits/revenue'] });
      toast({
        title: "🎁 Daily Bonus Claimed!",
        description: `Earned ${data.tokens} tokens and ${data.credits} credits`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to Claim",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Voice command mutation
  const voiceCommandMutation = useMutation({
    mutationFn: async (commandText: string) => {
      const res = await apiRequest('POST', '/api/arc/voice-command', { commandText });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/arc/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/arc/transactions', { limit: 20 }] });
      queryClient.invalidateQueries({ queryKey: ['/api/arc/voice-commands', { limit: 20 }] });
      setVoiceCommandText("");
      toast({
        title: "Voice Command Sent!",
        description: "Processing your blockchain command...",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Command Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (walletLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
          <WalletIcon className="h-8 w-8" />
          My Wallet
        </h1>
        <p className="text-muted-foreground">
          Manage your credits, tokens, and earnings
        </p>
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Battle Credits</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-battle-credits">
              {wallet?.battleCredits || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Use to start battles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Mined</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-tokens-mined">
              {parseFloat(wallet?.tokens || "0").toFixed(4)}
            </div>
            <p className="text-xs text-muted-foreground">
              Earned from battles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clone Ad Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-ad-revenue">
              ${parseFloat(wallet?.cloneAdRevenue || "0").toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {adRevenue?.impressions || 0} ad impressions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arc USDC Balance</CardTitle>
            <Badge className="bg-blue-500 text-xs">⛓️ Demo</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500" data-testid="text-usdc-balance">
              {arcWalletLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                `$${parseFloat(arcWallet?.usdcBalance || "0").toFixed(2)}`
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Earned on Arc blockchain
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lifetime Stats */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Lifetime Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Earned</p>
              <p className="text-2xl font-bold text-green-500">
                {parseFloat(wallet?.lifetimeEarned || "0").toFixed(4)} tokens
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-2xl font-bold text-red-500">
                {parseFloat(wallet?.lifetimeSpent || "0").toFixed(4)} tokens
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Bonus */}
      <Card className="mb-8 border-yellow-500/50 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-yellow-500" />
            Daily Login Bonus
          </CardTitle>
          <CardDescription>
            Claim your free daily credits and tokens!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => claimDailyMutation.mutate()}
            disabled={claimDailyMutation.isPending}
            className="w-full md:w-auto"
            data-testid="button-claim-daily"
          >
            {claimDailyMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                <Gift className="mr-2 h-4 w-4" />
                Claim Daily Bonus
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Tabs for History */}
      <Tabs defaultValue="transactions" className="mb-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transactions" data-testid="tab-transactions">
            <History className="mr-2 h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="mining" data-testid="tab-mining">
            <Zap className="mr-2 h-4 w-4" />
            Mining History
          </TabsTrigger>
          <TabsTrigger value="arc" data-testid="tab-arc">
            ⛓️ Arc Blockchain
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                Your credit and token transaction history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions && transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No transactions yet
                  </p>
                ) : (
                  transactions && transactions.map((tx: Transaction) => (
                    <div key={tx.id} className="flex items-center justify-between border-b pb-3">
                      <div className="flex-1">
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString()} • {tx.currency}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={tx.type === "purchase" || tx.type === "mining" || tx.type === "battle_win" ? "default" : "secondary"}>
                          {tx.type.replace('_', ' ')}
                        </Badge>
                        <p className={`font-bold mt-1 ${
                          tx.type === "battle_cost" ? "text-red-500" : "text-green-500"
                        }`}>
                          {tx.type === "battle_cost" ? "-" : "+"}{parseFloat(tx.amount).toFixed(tx.currency === "tokens" ? 4 : 0)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mining">
          <Card>
            <CardHeader>
              <CardTitle>Mining Events</CardTitle>
              <CardDescription>
                Tokens earned from various activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {miningEvents && miningEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No mining events yet - complete battles to earn tokens!
                  </p>
                ) : (
                  miningEvents && miningEvents.map((event: MiningEvent) => (
                    <div key={event.id} className="flex items-center justify-between border-b pb-3">
                      <div className="flex-1">
                        <p className="font-medium capitalize">{event.activityType.replace('_', ' ')}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(event.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="default" className="bg-yellow-500">
                          <Zap className="h-3 w-3 mr-1" />
                          Mining
                        </Badge>
                        <p className="font-bold text-yellow-500 mt-1">
                          +{parseFloat(event.tokensEarned).toFixed(4)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="arc">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ⛓️ Arc Blockchain Transactions
                <Badge className="bg-blue-500">Demo</Badge>
              </CardTitle>
              <CardDescription>
                USDC transactions on Circle's Arc L1 blockchain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {arcTransactions && arcTransactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No Arc transactions yet - try a voice command to get started!
                  </p>
                ) : (
                  arcTransactions && arcTransactions.map((tx: ArcTransaction) => (
                    <div key={tx.id} className="flex flex-col border-b pb-3 space-y-2" data-testid={`arc-tx-${tx.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium capitalize">{tx.type.replace('_', ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleString()}
                          </p>
                          {tx.voiceCommandText && (
                            <p className="text-xs text-blue-500 mt-1 italic">
                              🎤 "{tx.voiceCommandText}"
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge variant={tx.status === "confirmed" ? "default" : tx.status === "pending" ? "secondary" : "destructive"}>
                            {tx.status}
                          </Badge>
                          <p className="font-bold text-blue-500 mt-1">
                            ${parseFloat(tx.amount).toFixed(2)} USDC
                          </p>
                        </div>
                      </div>
                      {tx.txHash && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Link className="h-3 w-3" />
                          <span className="font-mono truncate" data-testid={`tx-hash-${tx.id}`}>
                            {tx.txHash}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Voice Command Panel */}
      <Card className="mb-8 border-blue-500/50 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎤 Voice Command Panel
            <Badge className="bg-blue-500">⛓️ Demo</Badge>
          </CardTitle>
          <CardDescription>
            Send voice commands to interact with Arc blockchain (e.g., "Send 5 USDC to Alice" or "Check my balance")
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Input
              placeholder="Enter your voice command..."
              value={voiceCommandText}
              onChange={(e) => setVoiceCommandText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && voiceCommandText.trim()) {
                  voiceCommandMutation.mutate(voiceCommandText);
                }
              }}
              disabled={voiceCommandMutation.isPending}
              data-testid="input-voice-command"
            />
            <Button
              onClick={() => voiceCommandMutation.mutate(voiceCommandText)}
              disabled={voiceCommandMutation.isPending || !voiceCommandText.trim()}
              data-testid="button-send-voice-command"
            >
              {voiceCommandMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Command
                </>
              )}
            </Button>
          </div>

          {voiceCommands && voiceCommands.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-3">Recent Commands</h4>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {voiceCommands.map((cmd: VoiceCommand) => (
                    <div key={cmd.id} className="flex items-start justify-between border-b pb-3 last:border-0" data-testid={`voice-cmd-${cmd.id}`}>
                      <div className="flex-1">
                        <p className="text-sm font-medium">"{cmd.commandText}"</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {cmd.intent.replace('_', ' ')} • {new Date(cmd.createdAt).toLocaleString()}
                        </p>
                        {cmd.errorMessage && (
                          <p className="text-xs text-red-500 mt-1">
                            Error: {cmd.errorMessage}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          cmd.status === "completed" ? "default" :
                          cmd.status === "processing" ? "secondary" :
                          cmd.status === "failed" ? "destructive" : "outline"
                        }>
                          {cmd.status}
                        </Badge>
                        {cmd.audioUrl && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const audio = new Audio(cmd.audioUrl!);
                              audio.play();
                            }}
                            data-testid={`button-play-audio-${cmd.id}`}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Purchase Credits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Purchase Battle Credits
          </CardTitle>
          <CardDescription>
            Buy credits to continue battling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {CREDIT_PACKAGES.map((pkg, index) => (
              <Card
                key={index}
                className={`cursor-pointer transition-all ${
                  selectedPackage === index
                    ? "border-primary ring-2 ring-primary"
                    : "hover:border-primary/50"
                }`}
                onClick={() => setSelectedPackage(index)}
                data-testid={`card-package-${index}`}
              >
                <CardHeader>
                  <CardTitle className="text-lg">
                    {pkg.credits + pkg.bonus} Credits
                  </CardTitle>
                  {pkg.bonus > 0 && (
                    <Badge className="w-fit">+{pkg.bonus} Bonus</Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">${pkg.price.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {pkg.credits} base + {pkg.bonus} bonus
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {selectedPackage !== null && (
            <div className="mt-6 flex justify-center">
              <Button size="lg" className="w-full md:w-auto" data-testid="button-purchase-credits">
                <CreditCard className="mr-2 h-4 w-4" />
                Purchase for ${CREDIT_PACKAGES[selectedPackage].price.toFixed(2)}
              </Button>
            </div>
          )}

          <p className="text-sm text-muted-foreground text-center mt-4">
            💡 Or earn free credits by winning battles!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
