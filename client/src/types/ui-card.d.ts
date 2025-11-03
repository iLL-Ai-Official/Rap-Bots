declare module "@/components/ui/card" {
  import * as React from 'react';

  export const Card: React.FC<React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>>;
  export const CardHeader: React.FC<React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>>;
  export const CardTitle: React.FC<React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>>;
  export const CardDescription: React.FC<React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>>;
  export const CardContent: React.FC<React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>>;
  export const CardFooter: React.FC<React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>>;
}
