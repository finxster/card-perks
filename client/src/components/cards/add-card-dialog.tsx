import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertCardSchema, type InsertCard } from '@shared/schema';
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
import { Plus } from 'lucide-react';

interface AddCardDialogProps {
  onAdd: (card: InsertCard) => Promise<any>;
  trigger?: React.ReactNode;
  isHousehold?: boolean;
}

const networks = [
  'Visa',
  'Mastercard',
  'American Express',
  'Discover',
  'Other',
];

const issuers = [
  'Chase',
  'American Express',
  'Citi',
  'Capital One',
  'Wells Fargo',
  'Bank of America',
  'Discover',
  'Other',
];

export function AddCardDialog({ onAdd, trigger, isHousehold }: AddCardDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InsertCard>({
    resolver: zodResolver(insertCardSchema),
    defaultValues: {
      name: '',
      network: '',
      issuer: '',
      lastFourDigits: '',
      isHousehold: isHousehold ?? false,
    },
  });

  const handleSubmit = async (data: InsertCard) => {
    setIsSubmitting(true);
    try {
      await onAdd(data);
      form.reset();
      setOpen(false);
    } catch (error) {
      console.error('Failed to add card:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button data-testid="button-add-card">
            <Plus className="h-4 w-4 mr-2" />
            Add Card
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isHousehold === true ? 'Add Household Card' : isHousehold === false ? 'Add Personal Card' : 'Add Credit Card'}
          </DialogTitle>
          <DialogDescription>
            {isHousehold === true 
              ? 'Add a card that will be shared with all household members.'
              : isHousehold === false
              ? 'Add a personal card to track your perks and rewards.'
              : 'Add a new credit card to track your perks and rewards.'}
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
                    <Input placeholder="e.g., Chase Sapphire Preferred" {...field} data-testid="input-card-name" />
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
                      <SelectTrigger data-testid="select-network">
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
              name="issuer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card Issuer</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger data-testid="select-issuer">
                        <SelectValue placeholder="Select card issuer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {issuers.map((issuer) => (
                        <SelectItem key={issuer} value={issuer}>
                          {issuer}
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
                      data-testid="input-last-four"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isHousehold === undefined && (
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
                        data-testid="switch-household"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                data-testid="button-cancel-card"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} data-testid="button-submit-card">
                {isSubmitting ? 'Adding...' : 'Add Card'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
