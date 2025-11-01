import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Check, X, Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ProfilePicture {
  id: string;
  originalPhotoUrl: string;
  generatedImageUrl: string | null;
  status: 'processing' | 'completed' | 'failed';
  isActive: boolean;
  createdAt: string;
}

export function ProfilePictureUploader() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Get user's profile pictures
  const { data: pictures = [], isLoading } = useQuery<ProfilePicture[]>({
    queryKey: ['/api/profile-pictures'],
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      
      const response = await fetch('/api/profile-pictures/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '🎨 Face Swap Generated!',
        description: 'Your AI rapper avatar has been created',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/profile-pictures'] });
      setSelectedFile(null);
      setPreviewUrl(null);
    },
    onError: (error: any) => {
      toast({
        title: '❌ Upload Failed',
        description: error.message || 'Failed to generate face swap',
        variant: 'destructive',
      });
    },
  });

  // Activate picture mutation
  const activateMutation = useMutation({
    mutationFn: async (pictureId: string) => {
      const response = await fetch(`/api/profile-pictures/${pictureId}/activate`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Activation failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '✅ Profile Picture Updated',
        description: 'Your new avatar is now active',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/profile-pictures'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Activation Failed',
        description: error.message || 'Failed to activate profile picture',
        variant: 'destructive',
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
      toast({
        title: '❌ Invalid File Type',
        description: 'Please upload a JPEG or PNG image',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: '❌ File Too Large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold mb-4 text-black dark:text-white flex items-center gap-2">
          <User className="w-5 h-5" />
          Generate AI Rapper Avatar
        </h3>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Upload your photo and we'll create a custom rap battle avatar using AI face-swap technology!
        </p>

        <div className="space-y-4">
          {/* File Input */}
          <div>
            <label
              htmlFor="photo-upload"
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 dark:hover:border-purple-400 transition-colors bg-gray-50 dark:bg-gray-800"
              data-testid="label-upload-photo"
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-contain rounded-lg"
                  data-testid="img-preview-photo"
                />
              ) : (
                <div className="flex flex-col items-center" data-testid="div-upload-prompt">
                  <Upload className="w-12 h-12 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click to upload your photo
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    JPEG or PNG, max 5MB
                  </p>
                </div>
              )}
              <input
                id="photo-upload"
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploadMutation.isPending}
                data-testid="input-photo-upload"
              />
            </label>
          </div>

          {/* Upload Button */}
          {selectedFile && (
            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                data-testid="button-generate-avatar"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Generate Avatar
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                variant="outline"
                disabled={uploadMutation.isPending}
                data-testid="button-cancel-upload"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Generated Avatars */}
      <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold mb-4 text-black dark:text-white">
          Your AI Avatars
        </h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-8" data-testid="div-loading">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : pictures.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8" data-testid="text-no-avatars">
            No avatars generated yet. Upload a photo to get started!
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {pictures.map((picture) => (
              <div
                key={picture.id}
                className="relative group"
                data-testid={`card-avatar-${picture.id}`}
              >
                <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 transition-all">
                  {picture.generatedImageUrl ? (
                    <img
                      src={picture.generatedImageUrl}
                      alt="Generated avatar"
                      className="w-full h-full object-cover"
                      data-testid={`img-avatar-${picture.id}`}
                    />
                  ) : picture.status === 'processing' ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                      <X className="w-8 h-8 text-red-500" />
                    </div>
                  )}
                </div>

                {/* Active Badge */}
                {picture.isActive && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1" data-testid={`badge-active-${picture.id}`}>
                    <Check className="w-3 h-3" />
                    Active
                  </div>
                )}

                {/* Activate Button */}
                {picture.status === 'completed' && !picture.isActive && (
                  <Button
                    onClick={() => activateMutation.mutate(picture.id)}
                    disabled={activateMutation.isPending}
                    size="sm"
                    className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-purple-600 hover:bg-purple-700"
                    data-testid={`button-activate-${picture.id}`}
                  >
                    Set as Profile Pic
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
