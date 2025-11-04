import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wallet, Copy, Check, ExternalLink, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WalletData {
  balance: string;
  totalEarned: string;
  walletAddress: string;
}

interface Transaction {
  txHash: string;
  txType: string;
  amountUSDC: string;
  status: string;
  createdAt: string;
  confirmedAt?: string;
}

export function WalletDashboard() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Fetch wallet balance
  const { data: walletData, isLoading: walletLoading } = useQuery<WalletData>({
    queryKey: ["/api/arc/wallet/balance"],
  });

  // Fetch recent transactions
  const { data: transactions, isLoading: txLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/arc/wallet/transactions"],
  });

  const copyAddress = () => {
    if (walletData?.walletAddress) {
      navigator.clipboard.writeText(walletData.walletAddress);
      setCopied(true);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Check className="w-4 h-4 text-green-500" data-testid="icon-confirmed" />;
      case "pending":
        return <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" data-testid="icon-pending" />;
      case "failed":
        return <span className="text-red-500" data-testid="icon-failed">✕</span>;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    if (type.includes("deposit") || type.includes("wager")) {
      return <ArrowDownRight className="w-4 h-4 text-red-500" data-testid="icon-outgoing" />;
    }
    return <ArrowUpRight className="w-4 h-4 text-green-500" data-testid="icon-incoming" />;
  };

  if (walletLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Arc Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!walletData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Arc Wallet</CardTitle>
          <CardDescription>Create your Arc wallet to earn USDC</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" data-testid="button-create-wallet">
            <Wallet className="w-4 h-4 mr-2" />
            Create Wallet
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Arc Wallet
              </CardTitle>
              <CardDescription>Circle's Arc L1 Blockchain</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
              Live
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Balance Display */}
          <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border">
            <div className="text-sm text-muted-foreground mb-1">USDC Balance</div>
            <div className="text-4xl font-bold mb-4" data-testid="text-balance">
              ${parseFloat(walletData.balance).toFixed(2)}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-muted-foreground">Total Earned:</span>
              <span className="font-semibold" data-testid="text-total-earned">
                ${parseFloat(walletData.totalEarned).toFixed(2)} USDC
              </span>
            </div>
          </div>

          {/* Wallet Address */}
          <div>
            <div className="text-sm font-medium mb-2">Wallet Address</div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <code className="flex-1 text-xs truncate" data-testid="text-wallet-address">
                {walletData.walletAddress}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAddress}
                data-testid="button-copy-address"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Send USDC to this address on Arc L1 to add funds
            </p>
          </div>

          {/* Recent Transactions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">Recent Transactions</div>
              {transactions && transactions.length > 0 && (
                <Button variant="ghost" size="sm" data-testid="button-view-all">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View All
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {txLoading ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Loading transactions...
                </div>
              ) : transactions && transactions.length > 0 ? (
                transactions.slice(0, 5).map((tx) => (
                  <button
                    key={tx.txHash}
                    onClick={() => setSelectedTx(tx)}
                    className="w-full p-3 bg-muted hover:bg-muted/80 rounded-lg flex items-center justify-between transition-colors text-left"
                    data-testid={`transaction-${tx.txHash}`}
                  >
                    <div className="flex items-center gap-3">
                      {getTypeIcon(tx.txType)}
                      <div>
                        <div className="text-sm font-medium capitalize">
                          {tx.txType.replace(/_/g, " ")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          ${parseFloat(tx.amountUSDC).toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          {getStatusIcon(tx.status)}
                          <span className="capitalize">{tx.status}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Wallet className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No transactions yet</p>
                  <p className="text-xs mt-1">Win battles to earn USDC!</p>
                </div>
              )}
            </div>
          </div>

          {/* Add Funds Button */}
          <Button variant="outline" className="w-full" data-testid="button-add-funds">
            <ExternalLink className="w-4 h-4 mr-2" />
            How to Add USDC
          </Button>
        </CardContent>
      </Card>

      {/* Transaction Details Modal */}
      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>Arc Blockchain Transaction</DialogDescription>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">Type</div>
                <div className="text-sm text-muted-foreground capitalize">
                  {selectedTx.txType.replace(/_/g, " ")}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Amount</div>
                <div className="text-2xl font-bold">
                  ${parseFloat(selectedTx.amountUSDC).toFixed(2)} USDC
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Status</div>
                <Badge variant={selectedTx.status === "confirmed" ? "default" : "secondary"}>
                  {selectedTx.status}
                </Badge>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Transaction Hash</div>
                <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
                  {selectedTx.txHash}
                </code>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Created</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(selectedTx.createdAt).toLocaleString()}
                </div>
              </div>
              {selectedTx.confirmedAt && (
                <div>
                  <div className="text-sm font-medium mb-1">Confirmed</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(selectedTx.confirmedAt).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
