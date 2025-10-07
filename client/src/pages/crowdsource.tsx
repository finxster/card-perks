import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Store, TrendingUp, CheckCircle } from 'lucide-react';

const merchantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  category: z.string().min(1, 'Category is required'),
  address: z.string().optional(),
});

const perkSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  value: z.string().optional(),
});

type MerchantForm = z.infer<typeof merchantSchema>;
type PerkForm = z.infer<typeof perkSchema>;

export default function Crowdsource() {
  const { toast } = useToast();
  const [merchantSubmitted, setMerchantSubmitted] = useState(false);
  const [perkSubmitted, setPerkSubmitted] = useState(false);

  const merchantForm = useForm<MerchantForm>({
    resolver: zodResolver(merchantSchema),
    defaultValues: {
      name: '',
      category: '',
      address: '',
    },
  });

  const perkForm = useForm<PerkForm>({
    resolver: zodResolver(perkSchema),
    defaultValues: {
      name: '',
      description: '',
      value: '',
    },
  });

  const submitMerchantMutation = useMutation({
    mutationFn: (data: MerchantForm) =>
      apiRequest('POST', '/api/crowdsourcing/merchant', {
        type: 'merchant',
        payload: data,
      }),
    onSuccess: () => {
      toast({
        title: 'Merchant submitted',
        description: 'Your suggestion has been submitted for review.',
      });
      merchantForm.reset();
      setMerchantSubmitted(true);
    },
  });

  const submitPerkMutation = useMutation({
    mutationFn: (data: PerkForm) =>
      apiRequest('POST', '/api/crowdsourcing/perk', {
        type: 'perk',
        payload: data,
      }),
    onSuccess: () => {
      toast({
        title: 'Perk submitted',
        description: 'Your suggestion has been submitted for review.',
      });
      perkForm.reset();
      setPerkSubmitted(true);
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Suggest New Content</h1>
          <p className="text-muted-foreground mt-1">
            Help improve CardPerks by suggesting new merchants or perks
          </p>
        </div>

        <Tabs defaultValue="merchant" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="merchant" data-testid="tab-suggest-merchant">
              <Store className="h-4 w-4 mr-2" />
              Suggest Merchant
            </TabsTrigger>
            <TabsTrigger value="perk" data-testid="tab-suggest-perk">
              <TrendingUp className="h-4 w-4 mr-2" />
              Suggest Perk
            </TabsTrigger>
          </TabsList>

          <TabsContent value="merchant">
            {merchantSubmitted ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className="mx-auto bg-green-500/10 p-3 rounded-xl w-fit">
                      <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Merchant Submitted!</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your suggestion has been sent to our admin team for review.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setMerchantSubmitted(false)}
                      data-testid="button-suggest-another-merchant"
                    >
                      Suggest Another Merchant
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Suggest a New Merchant</CardTitle>
                  <CardDescription>
                    Don't see a merchant you shop at? Let us know!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...merchantForm}>
                    <form
                      onSubmit={merchantForm.handleSubmit((data) =>
                        submitMerchantMutation.mutate(data)
                      )}
                      className="space-y-4"
                    >
                      <FormField
                        control={merchantForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Merchant Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Whole Foods"
                                {...field}
                                data-testid="input-merchant-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={merchantForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-merchant-category">
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Grocery">Grocery</SelectItem>
                                <SelectItem value="Dining">Dining</SelectItem>
                                <SelectItem value="Gas">Gas</SelectItem>
                                <SelectItem value="Travel">Travel</SelectItem>
                                <SelectItem value="Entertainment">Entertainment</SelectItem>
                                <SelectItem value="Shopping">Shopping</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={merchantForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="123 Main St, City, State"
                                {...field}
                                data-testid="input-merchant-address"
                              />
                            </FormControl>
                            <FormDescription>
                              Include location if specific to a certain area
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        disabled={submitMerchantMutation.isPending}
                        data-testid="button-submit-merchant"
                      >
                        {submitMerchantMutation.isPending
                          ? 'Submitting...'
                          : 'Submit Merchant'}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="perk">
            {perkSubmitted ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className="mx-auto bg-green-500/10 p-3 rounded-xl w-fit">
                      <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Perk Submitted!</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your suggestion has been sent to our admin team for review.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setPerkSubmitted(false)}
                      data-testid="button-suggest-another-perk"
                    >
                      Suggest Another Perk
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Suggest a New Perk</CardTitle>
                  <CardDescription>
                    Know about a great perk that's not listed? Share it!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...perkForm}>
                    <form
                      onSubmit={perkForm.handleSubmit((data) =>
                        submitPerkMutation.mutate(data)
                      )}
                      className="space-y-4"
                    >
                      <FormField
                        control={perkForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Perk Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Double points on groceries"
                                {...field}
                                data-testid="input-perk-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={perkForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe the perk in detail..."
                                className="min-h-24"
                                {...field}
                                data-testid="input-perk-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={perkForm.control}
                        name="value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Value (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., 5% cashback, 2x points"
                                {...field}
                                data-testid="input-perk-value"
                              />
                            </FormControl>
                            <FormDescription>
                              The cashback percentage or points multiplier
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        disabled={submitPerkMutation.isPending}
                        data-testid="button-submit-perk"
                      >
                        {submitPerkMutation.isPending
                          ? 'Submitting...'
                          : 'Submit Perk'}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
