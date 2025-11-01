import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BATTLE_CHARACTERS, type BattleCharacter, cloneToBattleCharacter, getRandomCharacter } from "@shared/characters";
import { useQuery } from "@tanstack/react-query";
import { Bot, Sparkles, Shuffle } from "lucide-react";

interface CharacterSelectorProps {
  onCharacterSelect: (character: BattleCharacter) => void;
  selectedCharacter?: BattleCharacter;
}

interface UserClone {
  id: string;
  cloneName: string;
  skillLevel: number;
  style: string;
  voiceId: string | null;
}

export function CharacterSelector({ onCharacterSelect, selectedCharacter }: CharacterSelectorProps) {
  const [allCharacters, setAllCharacters] = useState<BattleCharacter[]>([...BATTLE_CHARACTERS]);

  // Fetch user's clone
  const { data: userClone } = useQuery<UserClone>({
    queryKey: ['/api/user/clone'],
    retry: false,
  });

  // Update character list when clone is loaded
  useEffect(() => {
    if (userClone) {
      const cloneCharacter = cloneToBattleCharacter(userClone);
      // Add clone to the beginning of the list
      setAllCharacters([cloneCharacter, ...BATTLE_CHARACTERS]);
    } else {
      setAllCharacters([...BATTLE_CHARACTERS]);
    }
  }, [userClone]);

  const handleRandomOpponent = () => {
    const randomChar = getRandomCharacter(selectedCharacter?.id);
    onCharacterSelect(randomChar);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Choose Your Opponent</h3>
        <Button
          onClick={handleRandomOpponent}
          variant="outline"
          size="sm"
          className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white"
          data-testid="button-random-opponent"
        >
          <Shuffle className="h-4 w-4 mr-2" />
          Random Match
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {allCharacters.map((character) => (
          <Card
            key={character.id}
            className={`cursor-pointer transition-all hover:scale-105 ${
              selectedCharacter?.id === character.id
                ? "ring-2 ring-accent-gold bg-secondary-dark"
                : "bg-card-dark hover:bg-secondary-dark"
            } border-gray-700`}
            onClick={() => onCharacterSelect(character)}
            data-testid={`character-${character.id}`}
          >
            <CardContent className="p-4 text-center">
              {/* Character Avatar */}
              <div className="mb-3 relative">
                {character.isClone && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <Badge className="bg-purple-600 text-white text-xs">
                      <Bot className="h-3 w-3 mr-1" />
                      Clone
                    </Badge>
                  </div>
                )}
                <div className={`w-20 h-20 mx-auto rounded-full overflow-hidden border-2 ${character.isClone ? 'border-purple-500' : 'border-accent-gold'} bg-gradient-to-br ${character.isClone ? 'from-purple-500 to-blue-500' : 'from-accent-gold to-accent-red'} flex items-center justify-center`}>
                  {character.avatar ? (
                    <img
                      src={`/attached_assets/generated_images/${character.avatar}`}
                      onLoad={() => console.log(`Successfully loaded: ${character.avatar}`)}
                      alt={character.displayName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.warn(`Failed to load image: ${character.avatar}`);
                        // Fallback to character initial
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'block';
                      }}
                    />
                  ) : null}
                  <div 
                    className="text-2xl font-bold text-black"
                    style={{ display: character.avatar ? 'none' : 'block' }}
                  >
                    {character.displayName.charAt(0)}
                  </div>
                </div>
              </div>

              {/* Character Info */}
              <h4 className="text-lg font-bold text-white mb-2">{character.displayName}</h4>
              <p className="text-sm text-gray-300 mb-3 min-h-[40px]">
                {character.backstory}
              </p>

              {/* Character Stats */}
              <div className="space-y-2 mb-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Style:</span>
                  <Badge variant="outline" className="text-xs">
                    {character.style}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Difficulty:</span>
                  <Badge
                    className={`text-xs ${
                      character.difficulty === "hard"
                        ? "bg-red-600"
                        : character.difficulty === "normal"
                        ? "bg-yellow-600"
                        : "bg-green-600"
                    }`}
                  >
                    {character.difficulty}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Voice:</span>
                  <Badge variant="secondary" className="text-xs">
                    {character.gender}
                  </Badge>
                </div>
              </div>

              {/* Signature Line */}
              <div className="text-xs text-accent-gold italic min-h-[32px] mb-3">
                "{character.signature}"
              </div>

              {/* Select Button */}
              <Button
                size="sm"
                variant={selectedCharacter?.id === character.id ? "default" : "outline"}
                className={
                  selectedCharacter?.id === character.id
                    ? "bg-accent-gold text-black hover:bg-yellow-600"
                    : "border-gray-600 text-white hover:bg-secondary-dark"
                }
                data-testid={`button-select-${character.id}`}
              >
                {selectedCharacter?.id === character.id ? "Selected" : "Battle"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}