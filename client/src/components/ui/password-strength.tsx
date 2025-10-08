import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
}

interface PasswordRule {
  label: string;
  test: (password: string) => boolean;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const rules: PasswordRule[] = [
    {
      label: "At least 8 characters",
      test: (pwd) => pwd.length >= 8
    },
    {
      label: "Contains uppercase letter",
      test: (pwd) => /[A-Z]/.test(pwd)
    },
    {
      label: "Contains lowercase letter", 
      test: (pwd) => /[a-z]/.test(pwd)
    },
    {
      label: "Contains number",
      test: (pwd) => /\d/.test(pwd)
    },
    {
      label: "Contains special character",
      test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    }
  ];

  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };
    
    const passedRules = rules.filter(rule => rule.test(password)).length;
    
    if (passedRules < 2) {
      return { score: passedRules, label: 'Weak', color: 'bg-red-500' };
    } else if (passedRules < 4) {
      return { score: passedRules, label: 'Fair', color: 'bg-yellow-500' };
    } else if (passedRules < 5) {
      return { score: passedRules, label: 'Good', color: 'bg-blue-500' };
    } else {
      return { score: passedRules, label: 'Strong', color: 'bg-green-500' };
    }
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-3 mt-3 p-3 bg-muted/30 rounded-md border">
      {/* Password strength bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground font-medium">Password Strength:</span>
          <span className={cn(
            "font-semibold text-xs px-2 py-1 rounded-full",
            strength.score < 2 ? "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20" :
            strength.score < 4 ? "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20" :
            strength.score < 5 ? "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20" : 
            "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20"
          )}>
            {strength.label}
          </span>
        </div>
        <div className="flex space-x-1 h-2">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={cn(
                "flex-1 rounded-full transition-all duration-300",
                level <= strength.score
                  ? strength.color
                  : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Password requirements */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Requirements:</p>
        <div className="grid grid-cols-1 gap-1.5">
          {rules.map((rule, index) => {
            const passed = rule.test(password);
            return (
              <div
                key={index}
                className={cn(
                  "flex items-center space-x-2 text-xs transition-all duration-200",
                  passed ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "rounded-full p-0.5 transition-all duration-200",
                  passed ? "bg-green-100 dark:bg-green-900/20" : "bg-muted"
                )}>
                  {passed ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </div>
                <span className={passed ? "font-medium" : ""}>{rule.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}