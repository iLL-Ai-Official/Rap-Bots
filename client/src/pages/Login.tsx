import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { Mic, ArrowLeft } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    try {
      // Make login request to the server
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (response.ok) {
        // Refresh the page to trigger auth check
        window.location.href = '/';
      } else {
        console.error("Login failed");
      }
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center">
              <Mic className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-white">Welcome to RapBots</CardTitle>
          <CardDescription className="text-gray-400">
            Enter your username to start battling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-300">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder-gray-400"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              disabled={isLoading || !username.trim()}
            >
              {isLoading ? "Logging in..." : "Start Battling"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>

          <div className="mt-4 p-3 bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-400 text-center">
              Use <strong className="text-purple-400">admin</strong> for admin privileges
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
