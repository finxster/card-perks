import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertHouseholdSchema, insertCardSchema, type InsertCard, type Card as CardType, type User, type Household as HouseholdType } from '@shared/schema';
import { z } from 'zod';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Home, Plus, Users, Mail, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CardTile } from '@/components/cards/card-tile';
import { AddCardDialog } from '@/components/cards/add-card-dialog';
import { EditCardDialog } from '@/components/cards/edit-card-dialog';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type InviteForm = z.infer<typeof inviteSchema>;

export default function Household() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  const { data: household, isLoading } = useQuery<HouseholdType | null>({
    queryKey: ['/api/household/my'],
  });

  const { data: members = [] } = useQuery<(User & { isOwner?: boolean })[]>({
    queryKey: ['/api/household/members'],
    enabled: !!household,
  });

  const { data: cards = [] } = useQuery<CardType[]>({
    queryKey: ['/api/cards'],
    enabled: !!household,
  });

  const householdCards = cards.filter(card => card.isHousehold);

  const createForm = useForm<z.infer<typeof insertHouseholdSchema>>({
    resolver: zodResolver(insertHouseholdSchema),
    defaultValues: { name: '' },
  });

  const inviteForm = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '' },
  });

  const createHouseholdMutation = useMutation({
    mutationFn: (data: z.infer<typeof insertHouseholdSchema>) =>
      apiRequest('POST', '/api/household', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/household/my'] });
      toast({
        title: 'Household created',
        description: 'Your household has been created successfully.',
      });
      setCreateDialogOpen(false);
      createForm.reset();
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (data: InviteForm) =>
      apiRequest('POST', '/api/household/invite', data),
    onSuccess: () => {
      toast({
        title: 'Invitation sent',
        description: 'An invitation email has been sent.',
      });
      setInviteDialogOpen(false);
      inviteForm.reset();
    },
  });

  const addCardMutation = useMutation({
    mutationFn: (data: InsertCard) =>
      apiRequest('POST', '/api/cards', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cards'] });
      toast({
        title: 'Card added',
        description: 'Your household card has been added successfully.',
      });
    },
  });

  const updateCardMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertCard }) =>
      apiRequest('PATCH', `/api/cards/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cards'] });
      toast({
        title: 'Card updated',
        description: 'Your card has been updated successfully.',
      });
      setEditingCard(null);
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: (cardId: string) =>
      apiRequest('DELETE', `/api/cards/${cardId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cards'] });
      toast({
        title: 'Card deleted',
        description: 'Your card has been removed.',
      });
      setDeletingCardId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="animate-pulse h-64 bg-muted" />
        </div>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto bg-household/10 p-3 rounded-xl w-fit">
              <Home className="h-8 w-8 text-household" />
            </div>
            <CardTitle className="text-2xl font-bold">Create a Household</CardTitle>
            <CardDescription>
              Share credit cards and perks with your family members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" size="lg" data-testid="button-create-household">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Household
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Household</DialogTitle>
                  <DialogDescription>
                    Give your household a name to get started
                  </DialogDescription>
                </DialogHeader>
                <Form {...createForm}>
                  <form
                    onSubmit={createForm.handleSubmit((data) =>
                      createHouseholdMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Household Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Smith Family"
                              {...field}
                              data-testid="input-household-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createHouseholdMutation.isPending}
                        data-testid="button-submit-household"
                      >
                        {createHouseholdMutation.isPending
                          ? 'Creating...'
                          : 'Create'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Home className="h-8 w-8 text-household" />
                {household.name}
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your household and invite members
              </p>
            </div>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-invite-member">
                  <Mail className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Household Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation email to add a new member
                  </DialogDescription>
                </DialogHeader>
                <Form {...inviteForm}>
                  <form
                    onSubmit={inviteForm.handleSubmit((data) =>
                      inviteMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={inviteForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="member@example.com"
                              {...field}
                              data-testid="input-invite-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setInviteDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={inviteMutation.isPending}
                        data-testid="button-send-invite"
                      >
                        {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Household Cards
              </CardTitle>
              <CardDescription className="mt-1">
                {householdCards.length} {householdCards.length === 1 ? 'card' : 'cards'} shared with household
              </CardDescription>
            </div>
            <AddCardDialog
              onAdd={(data) => addCardMutation.mutateAsync({ ...data, isHousehold: true })}
              trigger={
                <Button size="sm" data-testid="button-add-household-card">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Card
                </Button>
              }
            />
          </CardHeader>
          <CardContent>
            {householdCards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No household cards yet. Add a card to get started!
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {householdCards.map((card) => (
                  <CardTile
                    key={card.id}
                    card={card}
                    onEdit={() => setEditingCard(card)}
                    onDelete={() => setDeletingCardId(card.id)}
                    canManage={true}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Household Members
            </CardTitle>
            <CardDescription>
              {members.length} {members.length === 1 ? 'member' : 'members'} in your household
            </CardDescription>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No members yet. Invite someone to get started!
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg hover-elevate"
                    data-testid={`member-item-${member.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {member.name
                            .split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium" data-testid={`text-member-name-${member.id}`}>{member.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </div>
                    {member.isOwner && (
                      <Badge variant="secondary">Owner</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <EditCardDialog
          card={editingCard}
          open={!!editingCard}
          onOpenChange={(open) => !open && setEditingCard(null)}
          onUpdate={(id, data) => updateCardMutation.mutateAsync({ id, data })}
        />

        <AlertDialog open={!!deletingCardId} onOpenChange={(open) => !open && setDeletingCardId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Card</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this card? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingCardId && deleteCardMutation.mutate(deletingCardId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
