import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Zap } from 'lucide-react';

interface InterstitialAdProps {
  show: boolean;
  onClose: () => void;
  skipDelay?: number; // Seconds before skip button appears
}

/**
 * Interstitial Ad Component
 * Full-screen ad shown between battles for free users
 */
export function InterstitialAd({ show, onClose, skipDelay = 5 }: InterstitialAdProps) {
  const [countdown, setCountdown] = useState(skipDelay);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    if (show && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanSkip(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [show, countdown]);

  useEffect(() => {
    if (show) {
      setCountdown(skipDelay);
      setCanSkip(false);
    }
  }, [show, skipDelay]);

  const handleClose = () => {
    if (canSkip) {
      onClose();
    }
  };

  return (
    <Dialog open={show} onOpenChange={canSkip ? onClose : undefined}>
      <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-gray-900 to-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Advertisement
            </span>
            {canSkip && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            {!canSkip ? (
              <span className="text-yellow-400 font-semibold">
                Please wait {countdown} seconds...
              </span>
            ) : (
              <span className="text-green-400 font-semibold">
                You can skip this ad now
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Ad Container - In production, this would be replaced with actual ad */}
          <div className="bg-gray-800 rounded-lg p-8 min-h-[300px] flex items-center justify-center border-2 border-dashed border-gray-600">
            <div className="text-center">
              <Zap className="h-16 w-16 mx-auto mb-4 text-yellow-400 animate-pulse" />
              <p className="text-xl font-bold mb-2">Advertisement Space</p>
              <p className="text-sm text-gray-400">
                This space is for sponsored content
              </p>
              <p className="text-xs text-gray-500 mt-4">
                Premium users see no ads
              </p>
            </div>
          </div>
          
          {canSkip && (
            <Button
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              Continue to Battle
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
