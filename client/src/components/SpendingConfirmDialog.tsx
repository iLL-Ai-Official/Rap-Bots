import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, DollarSign, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SpendingConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: string;
  type: "wager_battle" | "tournament_entry" | "other";
  fee?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function SpendingConfirmDialog({
  open,
  onOpenChange,
  amount,
  type,
  fee = "0.001",
  onConfirm,
  onCancel,
}: SpendingConfirmDialogProps) {
  const [confirmed, setConfirmed] = useState(false);

  const getTypeLabel = (txType: string) => {
    switch (txType) {
      case "wager_battle":
        return "Wager Battle";
      case "tournament_entry":
        return "Tournament Entry";
      default:
        return "Transaction";
    }
  };

  const total = (parseFloat(amount) + parseFloat(fee)).toFixed(6);

  const handleConfirm = () => {
    setConfirmed(false);
    onConfirm();
  };

  const handleCancel = () => {
    setConfirmed(false);
    onOpenChange(false);
    onCancel?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-destructive/10 rounded-full">
              <AlertTriangle className="w-6 h-6 text-destructive" data-testid="icon-warning" />
            </div>
            <AlertDialogTitle className="text-xl">Confirm USDC Transaction</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-destructive font-semibold">
                <Shield className="w-5 h-5" />
                You are about to spend REAL MONEY
              </div>
              
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="secondary" data-testid="badge-type">
                    {getTypeLabel(type)}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="text-lg font-bold flex items-center gap-1" data-testid="text-amount">
                    <DollarSign className="w-4 h-4" />
                    {parseFloat(amount).toFixed(2)} USDC
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Transaction Fee:</span>
                  <span data-testid="text-fee">~${parseFloat(fee).toFixed(4)} USDC</span>
                </div>
                
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total:</span>
                    <span className="text-lg" data-testid="text-total">${total} USDC</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">⚠️</span>
                <p className="text-foreground">
                  This transaction <strong>cannot be reversed</strong>
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">⚠️</span>
                <p className="text-foreground">
                  By confirming, you acknowledge this is <strong>real cryptocurrency</strong>
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel 
            onClick={handleCancel}
            data-testid="button-cancel"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive hover:bg-destructive/90"
            data-testid="button-confirm"
          >
            Confirm Spend
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
