import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Card as CardType, Merchant, Perk } from '@shared/schema';
import { CardTile } from '@/components/cards/card-tile';
import { AddCardDialog } from '@/components/cards/add-card-dialog';
import { AddPerkDialog } from '@/components/perks/add-perk-dialog';
import { MerchantSearch } from '@/components/merchant-search';
import { PerkList } from '@/components/perks/perk-list';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Home, Plus, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: cards = [], isLoading: cardsLoading } = useQuery<(CardType & { perkCount: number })[]>({
    queryKey: ['/api/cards'],
  });

  const { data: perks = [], isLoading: perksLoading } = useQuery<Perk[]>({
    queryKey: ['/api/perks'],
  });

  const { data: household } = useQuery<{ id: string; name: string }>({
    queryKey: ['/api/household/my'],
  });

  const addCardMutation = useMutation({
    mutationFn: (cardData: any) => apiRequest('POST', '/api/cards', cardData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cards'] });
      toast({
        title: 'Card added successfully',
        description: 'Your new card has been added to your collection.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add card',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: (cardId: string) => apiRequest('DELETE', `/api/cards/${cardId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cards'] });
      toast({
        title: 'Card deleted',
        description: 'Your card has been removed.',
      });
    },
  });

  const addPerkMutation = useMutation({
    mutationFn: (perkData: any) => apiRequest('POST', '/api/perks', perkData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/perks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cards'] });
      toast({
        title: 'Perk added successfully',
        description: 'Your new perk has been added to your card.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add perk',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/merchants/search?q=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await res.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const personalCards = cards.filter((card) => !card.isHousehold);
  const householdCards = cards.filter((card) => card.isHousehold);

  const stats = [
    { label: 'Total Cards', value: cards.length, icon: TrendingUp },
    { label: 'Active Perks', value: perks.length, icon: TrendingUp },
    ...(household ? [{ label: 'Household', value: household.name, icon: Home }] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Welcome back, {user?.name}</h1>
              <p className="text-muted-foreground mt-1">
                Discover the best perks for your shopping
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.label}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid={`stat-${stat.label.toLowerCase().replace(' ', '-')}`}>
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <MerchantSearch
          onSearch={handleSearch}
          results={searchResults}
          isSearching={isSearching}
        />

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Your Cards</h2>
            <AddCardDialog onAdd={(data) => addCardMutation.mutateAsync(data)} isHousehold={false} />
          </div>

          {cardsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-40 animate-pulse bg-muted" />
              ))}
            </div>
          ) : cards.length === 0 ? (
            <Card className="p-12">
              <div className="text-center space-y-4">
                <div className="mx-auto bg-primary/10 p-4 rounded-xl w-fit">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">No cards yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add your first credit card to start tracking perks
                  </p>
                </div>
                <AddCardDialog
                  onAdd={(data) => addCardMutation.mutateAsync(data)}
                  isHousehold={false}
                  trigger={
                    <Button size="lg" data-testid="button-add-first-card">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Card
                    </Button>
                  }
                />
              </div>
            </Card>
          ) : (
            <>
              {personalCards.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-muted-foreground">
                    Personal Cards
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {personalCards.map((card) => (
                      <CardTile
                        key={card.id}
                        card={card}
                        onDelete={() => deleteCardMutation.mutate(card.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {householdCards.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Household Cards
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {householdCards.map((card) => (
                      <CardTile key={card.id} card={card} canManage={false} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Your Perks</h2>
            {cards.length > 0 && (
              <AddPerkDialog
                cards={cards}
                onAdd={(data) => addPerkMutation.mutateAsync(data)}
              />
            )}
          </div>
          
          {perksLoading ? (
            <Card className="h-32 animate-pulse bg-muted" />
          ) : (
            <PerkList perks={perks} showAddButton={false} />
          )}
        </div>
      </div>
    </div>
  );
}
