import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    fetch(`/api/auth/verify/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus('success');
          setMessage('Your email has been verified successfully!');
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Verification failed. Please try again.');
      });
  }, []);

  return (
    <div className="flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-household/5 p-4 min-h-[calc(100vh-8rem)]">{/* Adjusting for nav and footer */}
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          {status === 'loading' && (
            <div className="mx-auto bg-primary/10 p-3 rounded-xl w-fit">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          )}
          {status === 'success' && (
            <div className="mx-auto bg-green-500/10 p-3 rounded-xl w-fit">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          )}
          {status === 'error' && (
            <div className="mx-auto bg-destructive/10 p-3 rounded-xl w-fit">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          )}
          <CardTitle className="text-2xl font-bold">
            {status === 'loading' && 'Verifying Email'}
            {status === 'success' && 'Email Verified'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'success' && (
            <Button
              className="w-full"
              onClick={() => setLocation('/login')}
              data-testid="button-goto-login"
            >
              Go to Login
            </Button>
          )}
          {status === 'error' && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setLocation('/register')}
              data-testid="button-goto-register"
            >
              Back to Register
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
