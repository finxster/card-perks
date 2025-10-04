import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertPerkSchema, type InsertPerk, type Card, type Merchant } from '@shared/schema';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface AddPerkDialogProps {
  cards: Card[];
  onAdd: (perk: InsertPerk) => Promise<any>;
  trigger?: React.ReactNode;
}

const perkFormSchema = insertPerkSchema.extend({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  cardId: z.string().min(1, 'Please select a card'),
  merchantId: z.string().min(1, 'Please select a merchant'),
});

type PerkFormData = z.infer<typeof perkFormSchema>;

export function AddPerkDialog({ cards, onAdd, trigger }: AddPerkDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: merchants = [], isLoading: merchantsLoading } = useQuery<Merchant[]>({
    queryKey: ['/api/merchants'],
    enabled: open,
  });

  const form = useForm<PerkFormData>({
    resolver: zodResolver(perkFormSchema),
    defaultValues: {
      name: '',
      description: '',
      cardId: '',
      value: '',
      merchantId: '',
      expirationDate: undefined,
      isPublic: false,
    },
  });

  const handleSubmit = async (data: PerkFormData) => {
    setIsSubmitting(true);
    try {
      const perkData: InsertPerk = {
        ...data,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
      };
      await onAdd(perkData);
      form.reset();
      setOpen(false);
    } catch (error) {
      console.error('Failed to add perk:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" data-testid="button-add-perk">
            <Plus className="h-4 w-4 mr-2" />
            Add Perk
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Personal Perk</DialogTitle>
          <DialogDescription>
            Add a perk or reward to one of your cards.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cardId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-card">
                        <SelectValue placeholder="Select a card" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cards.map((card) => (
                        <SelectItem 
                          key={card.id} 
                          value={card.id}
                          data-testid={`select-card-option-${card.id}`}
                        >
                          {card.name} ({card.network})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="merchantId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Merchant</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={merchantsLoading}>
                    <FormControl>
                      <SelectTrigger data-testid="select-merchant">
                        <SelectValue placeholder={merchantsLoading ? "Loading merchants..." : "Select a merchant"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {merchants.map((merchant) => (
                        <SelectItem 
                          key={merchant.id} 
                          value={merchant.id}
                          data-testid={`select-merchant-option-${merchant.id}`}
                        >
                          {merchant.name} - {merchant.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The store or merchant where this perk applies
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Perk Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., 5% Cashback on Groceries" 
                      {...field} 
                      data-testid="input-perk-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the perk details..."
                      rows={3}
                      {...field} 
                      data-testid="input-perk-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Value (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., 5% cashback, 10x points" 
                      {...field}
                      value={field.value || ''}
                      data-testid="input-perk-value"
                    />
                  </FormControl>
                  <FormDescription>
                    The reward value or rate
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expirationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiration Date (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field}
                      value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                      data-testid="input-perk-expiration"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
                data-testid="button-cancel-perk"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                data-testid="button-submit-perk"
              >
                {isSubmitting ? 'Adding...' : 'Add Perk'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
