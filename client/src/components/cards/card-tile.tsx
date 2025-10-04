import { Card as CardType } from '@shared/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, CreditCard, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CardTileProps {
  card: CardType & { perkCount?: number };
  onEdit?: () => void;
  onDelete?: () => void;
  canManage?: boolean;
}

export function CardTile({ card, onEdit, onDelete, canManage = true }: CardTileProps) {
  const networkColors: Record<string, string> = {
    Visa: 'bg-blue-600',
    Mastercard: 'bg-orange-600',
    'American Express': 'bg-green-600',
    Amex: 'bg-green-600',
    Discover: 'bg-orange-500',
    'Chase': 'bg-blue-700',
  };

  const bgColor = networkColors[card.network] || 'bg-primary';

  return (
    <Card className="group relative overflow-hidden hover-elevate active-elevate-2 transition-all" data-testid={`card-tile-${card.id}`}>
      <div className={`absolute inset-0 ${bgColor} opacity-5`} />
      
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`${bgColor} p-2 rounded-lg`}>
              <CreditCard className="h-4 w-4 text-white" />
            </div>
            {card.isHousehold && (
              <Badge variant="secondary" className="bg-household text-household-foreground" data-testid={`badge-household-${card.id}`}>
                <Home className="h-3 w-3 mr-1" />
                Household
              </Badge>
            )}
          </div>
          
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-card-menu-${card.id}`}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit} data-testid={`button-edit-card-${card.id}`}>
                  Edit Card
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive" data-testid={`button-delete-card-${card.id}`}>
                  Delete Card
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="space-y-1">
          <h3 className="font-semibold text-lg" data-testid={`text-card-name-${card.id}`}>{card.name}</h3>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{card.network}</p>
            {card.lastFourDigits && (
              <p className="text-sm text-muted-foreground">•••• {card.lastFourDigits}</p>
            )}
          </div>
          {card.perkCount !== undefined && (
            <p className="text-xs text-muted-foreground mt-2" data-testid={`text-perk-count-${card.id}`}>
              {card.perkCount} {card.perkCount === 1 ? 'perk' : 'perks'} attached
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
