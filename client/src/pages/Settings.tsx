import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Volume2, Shield, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SEO } from "@/components/SEO";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [ttsProvider, setTtsProvider] = useState("groq");

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const { data: settings } = useQuery({
    queryKey: ["/api/user/safety-settings"],
  });

  // Update TTS provider mutation
  const updateTTSMutation = useMutation({
    mutationFn: async (provider: string) => {
      return apiRequest("/api/user/tts-provider", {
        method: "POST",
        body: JSON.stringify({ ttsProvider: provider }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Preferences Updated",
        description: "Your TTS provider preference has been saved",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/safety-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update TTS provider",
        variant: "destructive",
      });
    },
  });

  const handleSaveTTS = () => {
    updateTTSMutation.mutate(ttsProvider);
  };

  return (
    <>
      <SEO 
        title="Settings" 
        description="Manage your Battle Rap AI preferences and settings" 
      />
      
      <div className="container mx-auto py-8 max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">
              Customize your Battle Rap AI experience
            </p>
          </div>
        </div>

        {/* TTS Provider Settings */}
        <Card data-testid="card-tts-provider">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              🎤 Text-to-Speech Provider
            </CardTitle>
            <CardDescription>
              Choose your preferred voice generation service
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup 
              value={ttsProvider} 
              onValueChange={setTtsProvider}
              className="space-y-4"
            >
              {/* Groq TTS Option */}
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="groq" id="groq" data-testid="radio-groq" />
                <div className="flex-1">
                  <Label htmlFor="groq" className="cursor-pointer">
                    <div className="font-semibold mb-1">Groq TTS (Free, Fast)</div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>✅ Included with your account</p>
                      <p>✅ PlayAI models with instant generation</p>
                      <p>✅ Perfect for quick battles</p>
                      <p>⚡ 500 tokens/second processing speed</p>
                    </div>
                  </Label>
                </div>
              </div>

              {/* ElevenLabs TTS Option */}
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="elevenlabs" id="elevenlabs" data-testid="radio-elevenlabs" />
                <div className="flex-1">
                  <Label htmlFor="elevenlabs" className="cursor-pointer">
                    <div className="font-semibold mb-1">ElevenLabs (Premium, High Quality)</div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>🎯 Requires your own API key</p>
                      <p>🎭 Advanced voice control and emotions</p>
                      <p>🎵 Professional-grade audio quality</p>
                      <p>💎 Best for content creation</p>
                    </div>
                  </Label>
                </div>
              </div>
            </RadioGroup>

            <Separator />

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {ttsProvider === "groq" 
                  ? "Using free Groq TTS service" 
                  : "Using your ElevenLabs API key"}
              </p>
              <Button 
                onClick={handleSaveTTS}
                disabled={updateTTSMutation.isPending}
                data-testid="button-save-tts"
              >
                {updateTTSMutation.isPending ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Safety & Privacy */}
        <Card data-testid="card-safety">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Safety & Privacy
            </CardTitle>
            <CardDescription>
              Manage spending limits, age verification, and content moderation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/safety-center">
              <Button variant="outline" className="w-full" data-testid="button-safety-center">
                <Shield className="w-4 h-4 mr-2" />
                Open Safety Center
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            
            {settings && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Age Verification:</span>
                  <span className="font-medium capitalize">{settings.ageVerificationStatus}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Daily Spend Limit:</span>
                  <span className="font-medium">${parseFloat(settings.dailySpendLimitUSDC).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Content Moderation:</span>
                  <span className="font-medium">{settings.moderationOptIn ? "Enabled" : "Disabled"}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card data-testid="card-account">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your profile and subscription details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {user && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium" data-testid="text-email">{user.email}</span>
                </div>
                {user.firstName && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">
                      {user.firstName} {user.lastName}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subscription:</span>
                  <span className="font-medium capitalize" data-testid="text-subscription">
                    {user.subscriptionTier || "Free"}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
