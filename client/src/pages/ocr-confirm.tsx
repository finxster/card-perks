import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, Edit, Trash2, Calendar, DollarSign, Store, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { queryClient } from '@/lib/queryClient';

interface DraftPerk {
  id: string;
  merchant: string;
  description: string;
  expiration?: string;
  value?: string;
  status: 'active' | 'inactive';
  imageUrl?: string;
  extractedText?: string;
  confirmed: boolean;
  createdAt: string;
}

interface Card {
  id: string;
  name: string;
  network: string;
  lastFourDigits?: string;
}

interface EditPerkData {
  merchant: string;
  description: string;
  expiration: string;
  value: string;
  status: 'active' | 'inactive';
}

export default function OCRConfirm() {
  const [draftPerks, setDraftPerks] = useState<DraftPerk[]>([]);
  const [selectedPerks, setSelectedPerks] = useState<Set<string>>(new Set());
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [editingPerk, setEditingPerk] = useState<DraftPerk | null>(null);
  const [editData, setEditData] = useState<EditPerkData>({
    merchant: '',
    description: '',
    expiration: '',
    value: '',
    status: 'inactive'
  });
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    loadDraftPerks();
    loadCards();
  }, []);

  const loadDraftPerks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ocr/draft', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load draft perks');
      }

      const perks = await response.json();
      setDraftPerks(perks);
      
      // Pre-select all perks by default
      setSelectedPerks(new Set(perks.map((p: DraftPerk) => p.id)));
    } catch (error: any) {
      console.error('Error loading draft perks:', error);
      toast({
        title: "Error",
        description: "Failed to load extracted perks",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCards = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/cards', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const cards = await response.json();
        setCards(cards);
      }
    } catch (error) {
      console.error('Error loading cards:', error);
    }
  };

  const togglePerkSelection = (perkId: string) => {
    const newSelected = new Set(selectedPerks);
    if (newSelected.has(perkId)) {
      newSelected.delete(perkId);
    } else {
      newSelected.add(perkId);
    }
    setSelectedPerks(newSelected);
  };

  const selectAllPerks = () => {
    setSelectedPerks(new Set(draftPerks.map(p => p.id)));
  };

  const deselectAllPerks = () => {
    setSelectedPerks(new Set());
  };

  const openEditDialog = (perk: DraftPerk) => {
    setEditingPerk(perk);
    setEditData({
      merchant: perk.merchant,
      description: perk.description,
      expiration: perk.expiration || '',
      value: perk.value || '',
      status: perk.status
    });
  };

  const saveEdit = async () => {
    if (!editingPerk) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/ocr/draft/${editingPerk.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      });

      if (!response.ok) {
        throw new Error('Failed to update perk');
      }

      const updatedPerk = await response.json();
      setDraftPerks(perks => perks.map(p => p.id === editingPerk.id ? updatedPerk : p));
      setEditingPerk(null);
      
      toast({
        title: "Success",
        description: "Perk updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update perk",
        variant: "destructive",
      });
    }
  };

  const deletePerk = async (perkId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/ocr/draft/${perkId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete perk');
      }

      setDraftPerks(perks => perks.filter(p => p.id !== perkId));
      setSelectedPerks(selected => {
        const newSelected = new Set(selected);
        newSelected.delete(perkId);
        return newSelected;
      });

      toast({
        title: "Success",
        description: "Perk deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete perk",
        variant: "destructive",
      });
    }
  };

  const confirmPerks = async () => {
    if (selectedPerks.size === 0) {
      toast({
        title: "No perks selected",
        description: "Please select at least one perk to confirm",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCard) {
      toast({
        title: "Card required",
        description: "Please select a card to associate with these perks",
        variant: "destructive",
      });
      return;
    }

    setIsConfirming(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ocr/confirm', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          perkIds: Array.from(selectedPerks),
          cardId: selectedCard || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to confirm perks');
      }

      // Invalidate queries to refresh dashboard and perks data
      queryClient.invalidateQueries({ queryKey: ['/api/perks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cards'] });

      toast({
        title: "Success!",
        description: `${data.confirmedPerks.length} perks have been saved to your collection`,
      });

      // Navigate to dashboard
      setTimeout(() => {
        setLocation('/dashboard');
      }, 2000);

    } catch (error: any) {
      console.error('Confirm error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to confirm perks",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (draftPerks.length === 0) {
    return (
      <div className="container mx-auto py-8 max-w-6xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <h2 className="text-xl font-semibold">No perks to review</h2>
              <p className="text-muted-foreground">
                There are no extracted perks to review. Please upload some credit card offer images first.
              </p>
              <Button onClick={() => setLocation('/ocr/upload')}>
                Upload Images
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Review Extracted Perks</h1>
        <p className="text-muted-foreground">
          Review and edit the perks we extracted from your images, then confirm which ones to save.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Extracted Perks ({draftPerks.length})</CardTitle>
                  <CardDescription>
                    Review and select the perks you want to save
                  </CardDescription>
                </div>
                <div className="space-x-2">
                  <Button variant="outline" size="sm" onClick={selectAllPerks}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAllPerks}>
                    Deselect All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draftPerks.map((perk) => (
                    <TableRow key={perk.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPerks.has(perk.id)}
                          onCheckedChange={() => togglePerkSelection(perk.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{perk.merchant}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{perk.description}</p>
                      </TableCell>
                      <TableCell>
                        {perk.value && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-green-600" />
                            <span className="text-sm font-medium text-green-600">
                              {perk.value}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={perk.status === 'active' ? 'default' : 'secondary'}>
                          {perk.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {perk.expiration && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">{perk.expiration}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(perk)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePerk(perk.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Confirmation</CardTitle>
              <CardDescription>
                Review your selection and confirm
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="card">Associated Card *</Label>
                <Select value={selectedCard} onValueChange={setSelectedCard}>
                  <SelectTrigger className={selectedCard ? '' : 'border-red-200'}>
                    <SelectValue placeholder="Select a card (required)" />
                  </SelectTrigger>
                  <SelectContent>
                    {cards.map(card => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.name} {card.lastFourDigits && `(*${card.lastFourDigits})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Required: Choose which card these perks belong to
                </p>
              </div>

              <div className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">
                    {selectedPerks.size} perks selected
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  These perks will be saved to your collection
                </p>
              </div>

              <Button
                onClick={confirmPerks}
                disabled={selectedPerks.size === 0 || !selectedCard || isConfirming}
                className="w-full"
              >
                {isConfirming ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm & Save Perks
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => setLocation('/ocr/upload')}
                className="w-full"
              >
                Upload More Images
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingPerk} onOpenChange={() => setEditingPerk(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Perk</DialogTitle>
            <DialogDescription>
              Make changes to the extracted perk information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-merchant">Merchant</Label>
              <Input
                id="edit-merchant"
                value={editData.merchant}
                onChange={(e) => setEditData(prev => ({ ...prev, merchant: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editData.description}
                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-value">Value</Label>
              <Input
                id="edit-value"
                value={editData.value}
                onChange={(e) => setEditData(prev => ({ ...prev, value: e.target.value }))}
                placeholder="e.g., 5% cashback, 10x points"
              />
            </div>
            <div>
              <Label htmlFor="edit-expiration">Expiration</Label>
              <Input
                id="edit-expiration"
                value={editData.expiration}
                onChange={(e) => setEditData(prev => ({ ...prev, expiration: e.target.value }))}
                placeholder="e.g., 12/31/2024"
              />
            </div>
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editData.status} onValueChange={(value: 'active' | 'inactive') => setEditData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPerk(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}