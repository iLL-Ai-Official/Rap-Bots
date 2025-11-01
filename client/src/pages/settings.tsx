import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { APIKeyManager } from '@/components/api-key-manager';
import { ProfilePictureUploader } from '@/components/profile-picture-uploader';
import { Settings2, Mic, Key, Shield, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
const settingsImage = "/images/Audio_settings_interface_5e678558.png";

export default function SettingsPage() {
  // Fetch Arc wallet data
  const { data: arcWallet, isLoading: arcWalletLoading } = useQuery<any>({
    queryKey: ['/api/arc/wallet'],
  });

  // Helper function to truncate wallet address
  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 relative" data-testid="page-settings">
      {/* Settings Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-12 z-0 pointer-events-none"
        style={{ backgroundImage: `url(${settingsImage})` }}
      />
      <div className="relative z-10 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Settings2 className="w-8 h-8" />
            Settings
          </h1>
          <p className="text-gray-300">
            Customize your rap battle experience and manage your API keys
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="avatar" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800 border-gray-700">
            <TabsTrigger value="avatar" className="data-[state=active]:bg-purple-600">
              <User className="w-4 h-4 mr-2" />
              Profile Avatar
            </TabsTrigger>
            <TabsTrigger value="tts" className="data-[state=active]:bg-purple-600">
              <Mic className="w-4 h-4 mr-2" />
              TTS Services
            </TabsTrigger>
            <TabsTrigger value="battle" className="data-[state=active]:bg-purple-600">
              <Shield className="w-4 h-4 mr-2" />
              Battle Settings
            </TabsTrigger>
            <TabsTrigger value="account" className="data-[state=active]:bg-purple-600">
              <Key className="w-4 h-4 mr-2" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* Profile Avatar Tab */}
          <TabsContent value="avatar" className="space-y-6">
            <ProfilePictureUploader />
          </TabsContent>

          {/* TTS Services Tab */}
          <TabsContent value="tts" className="space-y-6">
            <APIKeyManager />
            
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  TTS Service Comparison
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Compare different text-to-speech services for your rap battles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gray-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white">System (Default)</CardTitle>
                      <Badge variant="secondary">Always Available</Badge>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-gray-300">
                        <strong>Bark TTS + Typecast</strong><br/>
                        Uses admin-managed keys
                      </p>
                      <div className="text-xs text-gray-400">
                        <p>✓ Always works</p>
                        <p>✗ Slower generation</p>
                        <p>✗ Limited voice options</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-700 border-blue-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white">OpenAI TTS</CardTitle>
                      <Badge className="bg-blue-600">Latest 2025</Badge>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-gray-300">
                        <strong>gpt-4o-mini-tts</strong><br/>
                        With "steerability" features
                      </p>
                      <div className="text-xs text-gray-400">
                        <p>✓ Authentic rapper voices</p>
                        <p>✓ Emotion control</p>
                        <p>✓ High quality audio</p>
                        <p>💰 ~$0.015 per minute</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-700 border-green-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white">Groq TTS</CardTitle>
                      <Badge className="bg-green-600">Ultra Fast</Badge>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-gray-300">
                        <strong>PlayAI Models</strong><br/>
                        10x faster than real-time
                      </p>
                      <div className="text-xs text-gray-400">
                        <p>✓ Lightning fast</p>
                        <p>✓ Multiple voices</p>
                        <p>✓ Perfect for battles</p>
                        <p>💰 $50 per 1M characters</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Battle Settings Tab */}
          <TabsContent value="battle" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Battle Preferences</CardTitle>
                <CardDescription className="text-gray-300">
                  Customize your rap battle experience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">Profanity Filter</h4>
                      <p className="text-sm text-gray-400">Filter explicit content in battles</p>
                    </div>
                    <Badge variant="outline">Coming Soon</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">Difficulty Preference</h4>
                      <p className="text-sm text-gray-400">Default difficulty for new battles</p>
                    </div>
                    <Badge variant="outline">Coming Soon</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">Audio Quality</h4>
                      <p className="text-sm text-gray-400">Audio generation quality settings</p>
                    </div>
                    <Badge variant="outline">Coming Soon</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            {/* Arc Blockchain Wallet Card */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    ⛓️ Arc Blockchain Wallet
                  </CardTitle>
                  <Badge variant="secondary" className="bg-green-600">Demo Mode</Badge>
                </div>
                <CardDescription className="text-gray-300">
                  Earn USDC rewards on Circle's Arc L1 blockchain
                </CardDescription>
              </CardHeader>
              <CardContent>
                {arcWalletLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-sm text-gray-400 mt-2">Loading wallet...</p>
                  </div>
                ) : arcWallet ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Wallet Address</h4>
                        <p className="text-sm text-gray-400 font-mono" data-testid="text-arc-wallet-address">
                          {truncateAddress(arcWallet.walletAddress)}
                        </p>
                      </div>
                      <div className="text-right">
                        <h4 className="text-white font-medium">Balance</h4>
                        <p className="text-lg text-green-400 font-semibold" data-testid="text-arc-wallet-balance">
                          ${arcWallet.usdcBalance || '0.00'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-700">
                      <Link href="/wallet">
                        <Button 
                          className="w-full bg-purple-600 hover:bg-purple-700" 
                          data-testid="button-view-arc-wallet"
                        >
                          View Full Wallet Dashboard
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-400">No Arc wallet found</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Account Information</CardTitle>
                <CardDescription className="text-gray-300">
                  Your account details and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">Profile Settings</h4>
                      <p className="text-sm text-gray-400">Update your profile information</p>
                    </div>
                    <Badge variant="outline">Coming Soon</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">Data Export</h4>
                      <p className="text-sm text-gray-400">Download your battle history and stats</p>
                    </div>
                    <Badge variant="outline">Coming Soon</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">Privacy Settings</h4>
                      <p className="text-sm text-gray-400">Control your data and privacy preferences</p>
                    </div>
                    <Badge variant="outline">Coming Soon</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}