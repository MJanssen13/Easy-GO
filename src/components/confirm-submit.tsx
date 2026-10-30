"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useActionFormBusy } from "@/components/action-form";
import { cn } from "@/lib/utils";

/**
 * Botão de envio que mostra "carregando" e bloqueia novo clique enquanto o
 * formulário envia. Com `message`, pede confirmação antes (ações
 * destrutivas: remover paciente, apagar CTG...).
 */
export function SubmitButton({ message, children, disabled, className, ...props }: ButtonProps & { message?: string }) {
  const { pending } = useFormStatus();
  const formBusy = useActionFormBusy();
  const busy = pending || formBusy;
  return (
    <Button
      type="submit"
      {...props}
      // Enquanto envia, o ícone do botão dá lugar ao indicador de carregamento.
      className={cn(busy && "[&>svg:not(.animate-spin)]:hidden", className)}
      disabled={disabled || busy}
      onClick={(e) => {
        if (message && !window.confirm(message)) e.preventDefault();
      }}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}

export function ConfirmSubmit(props: ButtonProps & { message: string }) {
  return <SubmitButton {...props} />;
}
