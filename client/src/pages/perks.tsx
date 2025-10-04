import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Card as CardType, Perk, Merchant } from '@shared/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AddPerkDialog } from '@/components/perks/add-perk-dialog';
import { EditPerkDialog } from '@/components/perks/edit-perk-dialog';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Edit2, Trash2, Calendar, Store } from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';

interface PerkWithMerchant extends Perk {
  merchant?: Merchant;
}

export default function PerksPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingPerk, setEditingPerk] = useState<Perk | null>(null);
  const [deletingPerkId, setDeletingPerkId] = useState<string | null>(null);

  const { data: cards = [], isLoading: cardsLoading } = useQuery<CardType[]>({
    queryKey: ['/api/cards'],
  });

  const { data: perks = [], isLoading: perksLoading } = useQuery<PerkWithMerchant[]>({
    queryKey: ['/api/perks'],
  });

  const { data: merchants = [] } = useQuery<Merchant[]>({
    queryKey: ['/api/merchants'],
  });

  const perksWithMerchants = perks.map(perk => ({
    ...perk,
    merchant: merchants.find(m => m.id === perk.merchantId)
  }));

  const addPerkMutation = useMutation({
    mutationFn: async (perk: any) => {
      return await apiRequest('/api/perks', 'POST', perk);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/perks'] });
      toast({
        title: 'Success',
        description: 'Perk added successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to add perk',
        variant: 'destructive',
      });
    },
  });

  const editPerkMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Perk> }) => {
      return await apiRequest(`/api/perks/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/perks'] });
      setEditingPerk(null);
      toast({
        title: 'Success',
        description: 'Perk updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update perk',
        variant: 'destructive',
      });
    },
  });

  const deletePerkMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/perks/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/perks'] });
      setDeletingPerkId(null);
      toast({
        title: 'Success',
        description: 'Perk deleted successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete perk',
        variant: 'destructive',
      });
    },
  });

  const getPerkStatus = (perk: Perk) => {
    if (!perk.expirationDate) return null;
    const expDate = new Date(perk.expirationDate);
    if (isPast(expDate)) return 'expired';
    const daysLeft = differenceInDays(expDate, new Date());
    if (daysLeft <= 7) return 'expiring';
    return 'active';
  };

  const getCardName = (cardId: string | null) => {
    if (!cardId) return 'N/A';
    const card = cards.find(c => c.id === cardId);
    return card ? `${card.name} (${card.network})` : 'Unknown Card';
  };

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Perks Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage all your credit card perks and rewards
          </p>
        </div>
        <AddPerkDialog 
          cards={cards} 
          onAdd={(data) => addPerkMutation.mutateAsync(data)}
        />
      </div>

      {perksLoading || cardsLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-48 animate-pulse bg-muted" />
          ))}
        </div>
      ) : perksWithMerchants.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="mx-auto bg-primary/10 p-4 rounded-xl w-fit">
              <TrendingUp className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">No perks yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first perk to start tracking rewards
              </p>
            </div>
            <AddPerkDialog 
              cards={cards}
              onAdd={(data) => addPerkMutation.mutateAsync(data)}
              trigger={
                <Button size="lg" data-testid="button-add-first-perk">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Add Your First Perk
                </Button>
              }
            />
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {perksWithMerchants.map((perk) => {
            const status = getPerkStatus(perk);
            return (
              <Card key={perk.id} className="hover-elevate" data-testid={`perk-card-${perk.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-base" data-testid={`text-perk-name-${perk.id}`}>
                        {perk.name}
                      </CardTitle>
                      {perk.merchant && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Store className="h-3 w-3" />
                          <span>{perk.merchant.name}</span>
                        </div>
                      )}
                    </div>
                    {status && (
                      <Badge
                        variant={status === 'expired' ? 'destructive' : status === 'expiring' ? 'secondary' : 'default'}
                        data-testid={`badge-perk-status-${perk.id}`}
                      >
                        {status === 'expired' ? 'Expired' : status === 'expiring' ? 'Expiring Soon' : 'Active'}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {perk.description}
                  </p>
                  
                  {perk.value && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono" data-testid={`badge-perk-value-${perk.id}`}>
                        {perk.value}
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm pt-2 border-t">
                    <div className="text-muted-foreground">
                      <p className="font-medium">{getCardName(perk.cardId)}</p>
                      {perk.expirationDate && (
                        <div className="flex items-center gap-1 text-xs mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>Expires {format(new Date(perk.expirationDate), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingPerk(perk)}
                        data-testid={`button-edit-perk-${perk.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingPerkId(perk.id)}
                        data-testid={`button-delete-perk-${perk.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editingPerk && (
        <EditPerkDialog
          perk={editingPerk}
          cards={cards}
          open={!!editingPerk}
          onOpenChange={(open) => !open && setEditingPerk(null)}
          onEdit={(id, data) => editPerkMutation.mutateAsync({ id, data })}
        />
      )}

      <AlertDialog open={!!deletingPerkId} onOpenChange={(open) => !open && setDeletingPerkId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Perk?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this perk.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-perk">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPerkId && deletePerkMutation.mutate(deletingPerkId)}
              data-testid="button-confirm-delete-perk"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
