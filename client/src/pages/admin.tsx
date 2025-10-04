import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Store, TrendingUp, Clock } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Admin() {
  const { toast } = useToast();
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [merchantDialogOpen, setMerchantDialogOpen] = useState(false);
  const [merchantForm, setMerchantForm] = useState({ name: '', category: '', address: '' });

  const { data: submissions = [] } = useQuery({
    queryKey: ['/api/admin/crowdsourcing'],
  });

  const { data: merchants = [] } = useQuery({
    queryKey: ['/api/admin/merchants'],
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      apiRequest('PATCH', `/api/admin/crowdsourcing/${id}`, { status, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/crowdsourcing'] });
      toast({
        title: 'Submission reviewed',
        description: 'The submission has been processed.',
      });
      setSelectedSubmission(null);
    },
  });

  const addMerchantMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/admin/merchants', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants'] });
      toast({
        title: 'Merchant added',
        description: 'New merchant has been added successfully.',
      });
      setMerchantDialogOpen(false);
      setMerchantForm({ name: '', category: '', address: '' });
    },
  });

  const deleteMerchantMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/admin/merchants/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants'] });
      toast({
        title: 'Merchant deleted',
        description: 'The merchant has been removed.',
      });
    },
  });

  const pendingSubmissions = submissions.filter((s: any) => s.status === 'pending');

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage merchants, perks, and crowdsourced submissions
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Submissions
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-pending-submissions">
                {pendingSubmissions.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Merchants
              </CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-merchants">
                {merchants.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Submissions
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-submissions">
                {submissions.length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="crowdsourcing" className="space-y-4">
          <TabsList>
            <TabsTrigger value="crowdsourcing" data-testid="tab-crowdsourcing">
              Crowdsourcing
              {pendingSubmissions.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-orange-500/10 text-orange-600">
                  {pendingSubmissions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="merchants" data-testid="tab-merchants">Merchants</TabsTrigger>
          </TabsList>

          <TabsContent value="crowdsourcing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Crowdsourced Submissions</CardTitle>
                <CardDescription>
                  Review and approve merchant or perk suggestions from users
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No submissions yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Submitted By</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions.map((submission: any) => (
                        <TableRow key={submission.id} data-testid={`submission-row-${submission.id}`}>
                          <TableCell>
                            <Badge variant="outline">{submission.type}</Badge>
                          </TableCell>
                          <TableCell>
                            {submission.type === 'merchant' && (
                              <div>
                                <p className="font-medium">{submission.payload.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {submission.payload.category}
                                </p>
                              </div>
                            )}
                            {submission.type === 'perk' && (
                              <div>
                                <p className="font-medium">{submission.payload.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {submission.payload.description}
                                </p>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{submission.submitterEmail}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                submission.status === 'approved'
                                  ? 'default'
                                  : submission.status === 'rejected'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {submission.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {submission.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    reviewMutation.mutate({
                                      id: submission.id,
                                      status: 'approved',
                                    })
                                  }
                                  data-testid={`button-approve-${submission.id}`}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    reviewMutation.mutate({
                                      id: submission.id,
                                      status: 'rejected',
                                    })
                                  }
                                  data-testid={`button-reject-${submission.id}`}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="merchants" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Merchants</CardTitle>
                    <CardDescription>
                      Manage the merchant database
                    </CardDescription>
                  </div>
                  <Dialog open={merchantDialogOpen} onOpenChange={setMerchantDialogOpen}>
                    <Button onClick={() => setMerchantDialogOpen(true)} data-testid="button-add-merchant">
                      Add Merchant
                    </Button>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Merchant</DialogTitle>
                        <DialogDescription>
                          Add a new merchant to the database
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            value={merchantForm.name}
                            onChange={(e) =>
                              setMerchantForm({ ...merchantForm, name: e.target.value })
                            }
                            data-testid="input-merchant-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="category">Category</Label>
                          <Select
                            value={merchantForm.category}
                            onValueChange={(value) =>
                              setMerchantForm({ ...merchantForm, category: value })
                            }
                          >
                            <SelectTrigger data-testid="select-merchant-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Grocery">Grocery</SelectItem>
                              <SelectItem value="Dining">Dining</SelectItem>
                              <SelectItem value="Gas">Gas</SelectItem>
                              <SelectItem value="Travel">Travel</SelectItem>
                              <SelectItem value="Entertainment">Entertainment</SelectItem>
                              <SelectItem value="Shopping">Shopping</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address">Address (Optional)</Label>
                          <Input
                            id="address"
                            value={merchantForm.address}
                            onChange={(e) =>
                              setMerchantForm({ ...merchantForm, address: e.target.value })
                            }
                            data-testid="input-merchant-address"
                          />
                        </div>
                        <Button
                          onClick={() => addMerchantMutation.mutate(merchantForm)}
                          className="w-full"
                          disabled={!merchantForm.name || !merchantForm.category}
                          data-testid="button-submit-merchant"
                        >
                          Add Merchant
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {merchants.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No merchants yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {merchants.map((merchant: any) => (
                        <TableRow key={merchant.id} data-testid={`merchant-row-${merchant.id}`}>
                          <TableCell className="font-medium">{merchant.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{merchant.category}</Badge>
                          </TableCell>
                          <TableCell>{merchant.address || '-'}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteMerchantMutation.mutate(merchant.id)}
                              data-testid={`button-delete-merchant-${merchant.id}`}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
