import { useState } from 'react';
import { Search, MapPin, TrendingUp } from 'lucide-react';
import { useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Merchant, Card as CardType } from '@shared/schema';

interface MerchantSearchProps {
  onSearch: (query: string) => void;
  results: (Merchant & {
    matchingCards?: Array<{
      card: CardType;
      perks: any[];
    }>;
  })[];
  isSearching?: boolean;
}

export function MerchantSearch({ onSearch, results, isSearching }: MerchantSearchProps) {
  const [query, setQuery] = useState('');
  const [, setLocation] = useLocation();

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.length > 2) {
      onSearch(value);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        <Input
          type="search"
          placeholder="Where are you shopping today?"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-12 h-14 text-lg rounded-xl"
          data-testid="input-merchant-search"
        />
      </div>

      {isSearching && (
        <div className="text-center py-8 text-muted-foreground">
          Searching merchants...
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Search Results</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map((merchant) => (
              <Card key={merchant.id} className="hover-elevate active-elevate-2" data-testid={`merchant-result-${merchant.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg" data-testid={`text-merchant-name-${merchant.id}`}>{merchant.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">{merchant.category}</Badge>
                    {merchant.address && (
                      <div className="flex items-center gap-1 text-xs">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{merchant.address}</span>
                      </div>
                    )}
                  </div>
                  {/* Show all matching cards and their perks */}
                  {merchant.matchingCards && merchant.matchingCards.length > 0 ? (
                    <div className="pt-2 border-t space-y-2">
                      <p className="text-sm font-medium mb-1">Your Cards & Perks:</p>
                      {merchant.matchingCards.map(({ card, perks }) => (
                        <div key={card.id} className="mb-2">
                          <p className="text-sm text-muted-foreground font-semibold">{card.name}</p>
                          {perks.map((perk: any) => (
                            <Badge key={perk.id} variant="secondary" className="mt-1 bg-personal/10 text-personal">
                              {perk.value}
                            </Badge>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No perks available for this merchant
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!isSearching && query.length > 2 && results.length === 0 && (
        <Card className="p-8">
          <div className="text-center space-y-2">
            <Search className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="font-semibold">No merchants found</h3>
            <p className="text-sm text-muted-foreground">
              Try a different search term or suggest a new merchant
            </p>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={() => setLocation('/crowdsource')}
              data-testid="button-suggest-merchant"
            >
              Suggest Merchant
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
