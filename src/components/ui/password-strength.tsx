import { Check, X } from 'lucide-react';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const defaultRequirements: PasswordRequirement[] = [
  { label: 'Al menos 8 caracteres', test: (p) => p.length >= 8 },
  { label: 'Una letra mayúscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Una letra minúscula', test: (p) => /[a-z]/.test(p) },
  { label: 'Un número', test: (p) => /\d/.test(p) },
  { label: 'Un carácter especial (!@#$%^&*)', test: (p) => /[!@#$%^&*]/.test(p) },
];

interface PasswordStrengthProps {
  password: string;
  requirements?: PasswordRequirement[];
  title?: string;
}

export function PasswordStrength({ 
  password, 
  requirements = defaultRequirements,
  title = 'Requisitos de contraseña:'
}: PasswordStrengthProps) {
  if (password.length === 0) return null;

  return (
    <div className="mt-3 space-y-2 p-3 rounded-lg bg-secondary/50">
      <p className="text-xs text-muted-foreground mb-2">{title}</p>
      {requirements.map((req, index) => {
        const isMet = req.test(password);
        return (
          <div key={index} className="flex items-center gap-2 text-sm">
            {isMet ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={isMet ? 'text-green-500' : 'text-muted-foreground'}>
              {req.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
