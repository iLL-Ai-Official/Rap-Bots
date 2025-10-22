import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, Sparkles } from "lucide-react";

interface Profile {
  id: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  bio?: string;
  rapStyle?: string;
  totalBattles: number;
  totalWins: number;
  characterCardUrl?: string;
  characterCardData?: {
    name: string;
    rapStyle: string;
    bio: string;
    attacks: Array<{
      name: string;
      power: number;
      description: string;
      type: string;
    }>;
    stats: {
      flow: number;
      wordplay: number;
      delivery: number;
      stage_presence: number;
    };
  };
  createdAt: string;
}

export default function ProfilePage() {
  const [, params] = useRoute("/profile/:userId");
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  const [editForm, setEditForm] = useState({
    bio: "",
    rapStyle: "default",
  });
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  
  const isOwnProfile = params?.userId === currentUser?.id;
  const userId = params?.userId || (currentUser as any)?.id;

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/profile/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setEditForm({
          bio: data.bio || "",
          rapStyle: data.rapStyle || "default",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const formData = new FormData();
      formData.append("bio", editForm.bio);
      formData.append("rapStyle", editForm.rapStyle);
      
      if (selectedImage) {
        formData.append("profileImage", selectedImage);
      }

      const response = await fetch("/api/profile", {
        method: "PUT",
        body: formData,
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
        setEditing(false);
        fetchProfile();
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleGenerateCard = async () => {
    try {
      setGenerating(true);
      
      const formData = new FormData();
      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      const response = await fetch("/api/generate-character-card", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Character card generated!",
        });
        fetchProfile();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error("Error generating card:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate character card",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white">Profile not found</p>
      </div>
    );
  }

  const winRate = profile.totalBattles > 0 
    ? ((profile.totalWins / profile.totalBattles) * 100).toFixed(1) 
    : "0.0";

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-primary-dark via-secondary-dark to-primary-dark">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Info */}
          <Card className="bg-black/40 border-cyber-red">
            <CardHeader>
              <CardTitle className="text-cyber-red font-orbitron flex items-center gap-2">
                <Camera className="w-5 h-5" />
                {isOwnProfile ? "Your Profile" : `${profile.firstName}'s Profile`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Profile Image */}
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-cyber-red bg-gray-800">
                  {profile.profileImageUrl ? (
                    <img 
                      src={profile.profileImageUrl} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      No Image
                    </div>
                  )}
                </div>
                
                {isOwnProfile && editing && (
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                    className="max-w-xs"
                  />
                )}
              </div>

              {/* Name */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white">
                  {profile.firstName} {profile.lastName}
                </h2>
              </div>

              {/* Bio */}
              <div>
                <label className="text-sm text-gray-400 font-orbitron">Bio</label>
                {editing ? (
                  <Textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Tell us about your rap journey..."
                    className="mt-2 bg-black/60 border-cyber-red text-white"
                    rows={4}
                  />
                ) : (
                  <p className="mt-2 text-gray-300">
                    {profile.bio || "No bio yet"}
                  </p>
                )}
              </div>

              {/* Rap Style */}
              <div>
                <label className="text-sm text-gray-400 font-orbitron">Rap Style</label>
                {editing ? (
                  <Select
                    value={editForm.rapStyle}
                    onValueChange={(value) => setEditForm({ ...editForm, rapStyle: value })}
                  >
                    <SelectTrigger className="mt-2 bg-black/60 border-cyber-red text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Balanced</SelectItem>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                      <SelectItem value="smooth">Smooth</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="mt-2 text-gray-300 capitalize">
                    {profile.rapStyle || "Balanced"}
                  </p>
                )}
              </div>

              {/* Battle Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyber-red">{profile.totalBattles}</div>
                  <div className="text-sm text-gray-400">Battles</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{profile.totalWins}</div>
                  <div className="text-sm text-gray-400">Wins</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{winRate}%</div>
                  <div className="text-sm text-gray-400">Win Rate</div>
                </div>
              </div>

              {/* Action Buttons */}
              {isOwnProfile && (
                <div className="flex gap-2 pt-4">
                  {editing ? (
                    <>
                      <Button onClick={handleSaveProfile} className="flex-1">
                        Save Changes
                      </Button>
                      <Button 
                        onClick={() => setEditing(false)} 
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setEditing(true)} className="w-full">
                      Edit Profile
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Character Card */}
          <Card className="bg-black/40 border-cyber-red">
            <CardHeader>
              <CardTitle className="text-cyber-red font-orbitron flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Character Card
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile.characterCardData ? (
                <div className="space-y-4">
                  {/* Card Image */}
                  <div className="relative aspect-[2/3] bg-gradient-to-br from-yellow-400 via-red-500 to-purple-600 rounded-lg p-4 overflow-hidden border-4 border-yellow-400">
                    <div className="bg-black/80 rounded-lg h-full p-4 space-y-3">
                      {/* Header */}
                      <div className="text-center border-b border-yellow-400 pb-2">
                        <h3 className="text-xl font-bold text-yellow-400">
                          {profile.characterCardData.name}
                        </h3>
                        <p className="text-xs text-gray-300 capitalize">
                          {profile.characterCardData.rapStyle} Style
                        </p>
                      </div>

                      {/* Image */}
                      <div className="aspect-square bg-gray-900 rounded-lg overflow-hidden border-2 border-yellow-400">
                        {profile.profileImageUrl ? (
                          <img 
                            src={profile.profileImageUrl} 
                            alt={profile.characterCardData.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            No Image
                          </div>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Flow:</span>
                          <span className="text-yellow-400 font-bold">
                            {profile.characterCardData.stats.flow}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Wordplay:</span>
                          <span className="text-yellow-400 font-bold">
                            {profile.characterCardData.stats.wordplay}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Delivery:</span>
                          <span className="text-yellow-400 font-bold">
                            {profile.characterCardData.stats.delivery}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Presence:</span>
                          <span className="text-yellow-400 font-bold">
                            {profile.characterCardData.stats.stage_presence}
                          </span>
                        </div>
                      </div>

                      {/* Attacks */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-yellow-400 border-b border-yellow-400 pb-1">
                          Signature Moves
                        </div>
                        {profile.characterCardData.attacks.slice(0, 2).map((attack, idx) => (
                          <div key={idx} className="bg-black/60 rounded p-2">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-bold text-yellow-400">
                                {attack.name}
                              </span>
                              <span className="text-xs text-red-400">
                                {attack.power} DMG
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">
                              {attack.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Generate New Card Button */}
                  {isOwnProfile && (
                    <Button
                      onClick={handleGenerateCard}
                      disabled={generating}
                      className="w-full"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Regenerate Card
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <p className="text-gray-400">No character card yet</p>
                  {isOwnProfile && (
                    <Button
                      onClick={handleGenerateCard}
                      disabled={generating}
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Character Card
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
