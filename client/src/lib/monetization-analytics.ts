/**
 * Monetization Analytics Service
 * Tracks ad impressions, clicks, and revenue for analytics
 */

export interface AdImpression {
  adType: 'banner' | 'interstitial' | 'rewarded' | 'clone_sponsor';
  userId?: string;
  battleId?: string;
  timestamp: number;
  revenue?: number;
  clicked?: boolean;
}

export interface RevenueMetrics {
  totalImpressions: number;
  totalClicks: number;
  totalRevenue: number;
  ctr: number; // Click-through rate
  rpm: number; // Revenue per thousand impressions
}

class MonetizationAnalytics {
  private impressions: AdImpression[] = [];

  /**
   * Track ad impression
   */
  trackImpression(impression: Omit<AdImpression, 'timestamp'>): void {
    const fullImpression: AdImpression = {
      ...impression,
      timestamp: Date.now(),
    };
    
    this.impressions.push(fullImpression);
    
    // Send to analytics backend
    this.sendToBackend(fullImpression);
    
    console.log(`📊 Ad Impression: ${impression.adType}`, impression);
  }

  /**
   * Track ad click
   */
  trackClick(adType: string, userId?: string, battleId?: string): void {
    const impression = this.impressions.find(
      imp => imp.adType === adType && imp.userId === userId && imp.battleId === battleId
    );
    
    if (impression) {
      impression.clicked = true;
    }
    
    console.log(`👆 Ad Click: ${adType}`, { userId, battleId });
    
    // Send click event to backend
    this.sendToBackend({
      adType: adType as any,
      userId,
      battleId,
      clicked: true,
      timestamp: Date.now(),
    });
  }

  /**
   * Track rewarded ad completion and revenue
   */
  trackRewardedAdCompletion(userId: string, revenue: number): void {
    this.trackImpression({
      adType: 'rewarded',
      userId,
      revenue,
      clicked: true,
    });
  }

  /**
   * Track clone battle sponsorship
   */
  trackCloneSponsor(battleId: string, sponsorId: string, revenue: number): void {
    this.trackImpression({
      adType: 'clone_sponsor',
      battleId,
      userId: sponsorId,
      revenue,
    });
  }

  /**
   * Get revenue metrics
   */
  getMetrics(adType?: string): RevenueMetrics {
    const filteredImpressions = adType 
      ? this.impressions.filter(imp => imp.adType === adType)
      : this.impressions;
    
    const totalImpressions = filteredImpressions.length;
    const totalClicks = filteredImpressions.filter(imp => imp.clicked).length;
    const totalRevenue = filteredImpressions.reduce((sum, imp) => sum + (imp.revenue || 0), 0);
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const rpm = totalImpressions > 0 ? (totalRevenue / totalImpressions) * 1000 : 0;
    
    return {
      totalImpressions,
      totalClicks,
      totalRevenue,
      ctr,
      rpm,
    };
  }

  /**
   * Send analytics to backend
   */
  private async sendToBackend(impression: AdImpression): Promise<void> {
    try {
      await fetch('/api/analytics/ad-impression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(impression),
      });
    } catch (error) {
      console.error('Failed to send analytics:', error);
    }
  }

  /**
   * Clear old impressions (keep last 1000)
   */
  cleanupOldImpressions(): void {
    if (this.impressions.length > 1000) {
      this.impressions = this.impressions.slice(-1000);
    }
  }
}

export const monetizationAnalytics = new MonetizationAnalytics();
