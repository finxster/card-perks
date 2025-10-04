import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, Plus, Edit2, Trash2 } from 'lucide-react';
import type { Perk, Merchant } from '@shared/schema';
import { format, isPast, differenceInDays } from 'date-fns';

interface PerkWithMerchant extends Perk {
  merchant?: Merchant;
}

interface PerkListProps {
  perks: PerkWithMerchant[];
  onAdd?: () => void;
  showAddButton?: boolean;
  onEdit?: (perk: Perk) => void;
  onDelete?: (perkId: string) => void;
}

export function PerkList({ perks, onAdd, showAddButton = true, onEdit, onDelete }: PerkListProps) {
  const getPerkStatus = (perk: Perk) => {
    if (!perk.expirationDate) return null;
    const expDate = new Date(perk.expirationDate);
    if (isPast(expDate)) return 'expired';
    const daysLeft = differenceInDays(expDate, new Date());
    if (daysLeft <= 7) return 'expiring';
    return 'active';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Your Perks</h3>
        {showAddButton && onAdd && (
          <Button onClick={onAdd} size="sm" data-testid="button-add-perk">
            <Plus className="h-4 w-4 mr-2" />
            Add Perk
          </Button>
        )}
      </div>

      {perks.length === 0 ? (
        <Card className="p-8">
          <div className="text-center space-y-2">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="font-semibold">No perks yet</h3>
            <p className="text-sm text-muted-foreground">
              Add perks to your cards to start tracking rewards
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {perks.map((perk) => {
            const status = getPerkStatus(perk);
            return (
              <Card key={perk.id} className="hover-elevate" data-testid={`perk-item-${perk.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-base" data-testid={`text-perk-name-${perk.id}`}>
                        {perk.name}
                      </CardTitle>
                      {perk.merchant && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {perk.merchant.name}
                        </p>
                      )}
                    </div>
                    {perk.value && (
                      <Badge variant="secondary" className="bg-personal/10 text-personal">
                        {perk.value}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">{perk.description}</p>
                  
                  <div className="flex items-center justify-between pt-2">
                    {perk.expirationDate ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Expires {format(new Date(perk.expirationDate), 'MMM d, yyyy')}
                        </span>
                        {status === 'expiring' && (
                          <Badge variant="outline" className="border-orange-500 text-orange-600">
                            Expiring Soon
                          </Badge>
                        )}
                        {status === 'expired' && (
                          <Badge variant="outline" className="border-destructive text-destructive">
                            Expired
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div />
                    )}
                    
                    {(onEdit || onDelete) && (
                      <div className="flex gap-1">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onEdit(perk)}
                            data-testid={`button-edit-perk-${perk.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onDelete(perk.id)}
                            data-testid={`button-delete-perk-${perk.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
