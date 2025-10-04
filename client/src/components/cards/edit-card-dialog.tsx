import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertCardSchema, type InsertCard, type Card } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface EditCardDialogProps {
  card: Card | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (cardId: string, data: InsertCard) => Promise<any>;
}

const networks = [
  'Visa',
  'Mastercard',
  'American Express',
  'Discover',
  'Chase',
  'Capital One',
  'Other',
];

export function EditCardDialog({ card, open, onOpenChange, onUpdate }: EditCardDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InsertCard>({
    resolver: zodResolver(insertCardSchema),
    defaultValues: {
      name: '',
      network: '',
      lastFourDigits: '',
      isHousehold: false,
    },
  });

  useEffect(() => {
    if (card) {
      form.reset({
        name: card.name,
        network: card.network,
        lastFourDigits: card.lastFourDigits || '',
        isHousehold: card.isHousehold,
      });
    }
  }, [card, form]);

  const handleSubmit = async (data: InsertCard) => {
    if (!card) return;
    
    setIsSubmitting(true);
    try {
      await onUpdate(card.id, data);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update card:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Credit Card</DialogTitle>
          <DialogDescription>
            Update your credit card information.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Chase Sapphire Preferred" {...field} data-testid="input-edit-card-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="network"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Network</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-network">
                        <SelectValue placeholder="Select network" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {networks.map((network) => (
                        <SelectItem key={network} value={network}>
                          {network}
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
              name="lastFourDigits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last 4 Digits (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="1234"
                      maxLength={4}
                      {...field}
                      value={field.value || ''}
                      data-testid="input-edit-last-four"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isHousehold"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Household Card</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Share this card with your household members
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-edit-household"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-edit-card"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} data-testid="button-submit-edit-card">
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
