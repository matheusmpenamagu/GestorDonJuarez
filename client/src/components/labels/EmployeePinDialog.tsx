import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Employee {
  id: number;
  name: string;
  pin?: string;
}

interface EmployeePinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmployeeAuthenticated: (employee: Employee) => void;
}

export default function EmployeePinDialog({
  open,
  onOpenChange,
  onEmployeeAuthenticated,
}: EmployeePinDialogProps) {
  const [pin, setPin] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pin.length !== 4) {
      setError("PIN deve ter 4 dígitos");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      // Verificar PIN com o backend
      const response = await fetch("/api/employees/verify-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("sessionId") || ""}`,
        },
        body: JSON.stringify({ pin }),
      });

      if (response.ok) {
        const employee = await response.json();
        onEmployeeAuthenticated(employee);
        setPin("");
        toast({
          title: "Autenticação realizada",
          description: `Bem-vindo, ${employee.name}!`,
        });
      } else {
        const errorData = await response.json();
        setError(errorData.message || "PIN inválido");
      }
    } catch (error) {
      console.error("Error verifying PIN:", error);
      setError("Erro ao verificar PIN");
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPin(value);
    setError("");
  };

  const handleClose = () => {
    setPin("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Autenticação do Funcionário
          </DialogTitle>
          <DialogDescription>
            Digite seu PIN de 4 dígitos para acessar o módulo de etiquetas
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handlePinSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pin">PIN do Funcionário</Label>
            <Input
              id="pin"
              type="password"
              placeholder="••••"
              value={pin}
              onChange={handlePinChange}
              maxLength={4}
              className="text-center text-lg tracking-widest"
              autoFocus
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              disabled={pin.length !== 4 || isVerifying}
              className="w-full"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <User className="w-4 h-4 mr-2" />
                  Autenticar
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </form>

        <div className="text-xs text-gray-500 text-center mt-4">
          {employees.length > 0 && (
            <p>
              {employees.length} funcionário{employees.length !== 1 ? "s" : ""} cadastrado
              {employees.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}