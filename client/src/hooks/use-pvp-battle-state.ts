import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { Battle, BattleRoundSubmission } from '@shared/schema';

export interface PvPBattleState {
  battle: Battle | null;
  currentRound: number;
  roundSubmissions: BattleRoundSubmission[];
  isYourTurn: boolean;
  opponent: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
  } | null;
  isLoading: boolean;
  isSubmitting: boolean;
}

export function usePvPBattleState(battleId: string | undefined) {
  const { toast } = useToast();
  const [localState, setLocalState] = useState<Partial<PvPBattleState>>({});

  // Fetch PvP battle details
  const { data: battleData, isLoading, refetch } = useQuery<PvPBattleState>({
    queryKey: ['/api/pvp/battles', battleId],
    enabled: !!battleId,
    refetchInterval: 5000, // Poll every 5 seconds for updates
  });

  // Submit round mutation
  const submitRoundMutation = useMutation({
    mutationFn: async ({ verse, audioUrl }: { verse: string; audioUrl?: string }) => {
      if (!battleId || !battleData) {
        throw new Error('Battle not ready');
      }

      const response = await apiRequest(`/api/pvp/battles/${battleId}/rounds/${battleData.currentRound}/submit`, {
        method: 'POST',
        body: JSON.stringify({ verse, audioUrl }),
      });

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: '✅ Round Submitted',
        description: data.bothSubmitted 
          ? 'Both players submitted! Scores calculated.' 
          : 'Waiting for opponent to submit...',
      });

      // Refetch battle state
      queryClient.invalidateQueries({ queryKey: ['/api/pvp/battles', battleId] });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Submission Failed',
        description: error.message || 'Failed to submit round',
        variant: 'destructive',
      });
    },
  });

  // Forfeit battle mutation
  const forfeitBattleMutation = useMutation({
    mutationFn: async () => {
      if (!battleId) {
        throw new Error('No battle ID');
      }

      const response = await apiRequest(`/api/pvp/battles/${battleId}/forfeit`, {
        method: 'POST',
      });

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '⚔️ Battle Forfeited',
        description: 'You have forfeited this battle',
      });

      // Refetch battle state
      queryClient.invalidateQueries({ queryKey: ['/api/pvp/battles', battleId] });
      queryClient.invalidateQueries({ queryKey: ['/api/pvp/battles'] });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Forfeit Failed',
        description: error.message || 'Failed to forfeit battle',
        variant: 'destructive',
      });
    },
  });

  const submitRound = useCallback(
    (verse: string, audioUrl?: string) => {
      return submitRoundMutation.mutateAsync({ verse, audioUrl });
    },
    [submitRoundMutation]
  );

  const forfeitBattle = useCallback(() => {
    return forfeitBattleMutation.mutateAsync();
  }, [forfeitBattleMutation]);

  return {
    battle: battleData?.battle || null,
    currentRound: battleData?.currentRound || 1,
    roundSubmissions: battleData?.roundSubmissions || [],
    isYourTurn: battleData?.isYourTurn || false,
    opponent: battleData?.opponent || null,
    isLoading,
    isSubmitting: submitRoundMutation.isPending,
    submitRound,
    forfeitBattle,
    isForfeitingBattle: forfeitBattleMutation.isPending,
    refetch,
  };
}
