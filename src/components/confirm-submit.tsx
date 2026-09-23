"use client";

import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Botão de envio que pede confirmação antes (ações destrutivas: remover
 * paciente, apagar CTG...). Use dentro de um `<form action={...}>`.
 */
export function ConfirmSubmit({
  message,
  children,
  ...props
}: ButtonProps & { message: string }) {
  return (
    <Button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
