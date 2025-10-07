import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

function useQueryParam(name: string) {
  return new URLSearchParams(window.location.search).get(name);
}

export default function AcceptInvite() {
  const token = useQueryParam('token');
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function acceptInvite() {
      const jwt = localStorage.getItem('token');
      if (!jwt) {
        setLocation(`/login?redirect=/accept-invite?token=${token}`);
        return;
      }
      try {
        await apiRequest(
          'GET',
          `/api/household/accept/${token}`
        );
        toast({
          title: 'Invitation accepted!',
          description: 'You have joined the household.',
        });
        setLocation('/household');
      } catch (err: any) {
        toast({
          title: 'Error',
          description: err?.message || 'Failed to accept invitation.',
        });
        setLoading(false);
      }
    }
    if (token) acceptInvite();
  }, [token, setLocation, toast]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">{/* Adjusting for nav and footer */}
      {loading ? (
        <div>Accepting invitation...</div>
      ) : (
        <div>Failed to accept invitation. Please try again.</div>
      )}
    </div>
  );
}
