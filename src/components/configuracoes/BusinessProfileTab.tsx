import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Building2, Loader2 } from "lucide-react";
import { useBusinessSettings, BusinessSettingsInput } from "@/hooks/useBusinessSettings";
import { AvatarUpload } from "@/components/ui/avatar-upload";

export function BusinessProfileTab() {
  const { settings, isLoading, updateSettings } = useBusinessSettings();
  
  const [formData, setFormData] = useState<BusinessSettingsInput>({
    business_name: "",
    logo_url: null,
    opening_time: "09:00",
    closing_time: "19:00",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        business_name: settings.business_name || "",
        logo_url: settings.logo_url,
        opening_time: settings.opening_time || "09:00",
        closing_time: settings.closing_time || "19:00",
      });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Perfil da Barbearia
        </CardTitle>
        <CardDescription>
          Configure as informações básicas do seu negócio
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Logo Upload usando componente reutilizável */}
            <AvatarUpload
              currentImageUrl={formData.logo_url}
              onImageUploaded={(url) => setFormData(prev => ({ ...prev, logo_url: url }))}
              bucket="logos"
              folder="logos"
              fallbackIcon={<Building2 className="h-12 w-12 text-muted-foreground" />}
              size="lg"
              label="Logo da Barbearia"
            />

            {/* Form Fields */}
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business_name">Nome da Empresa</Label>
                <Input
                  id="business_name"
                  value={formData.business_name || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                  placeholder="Ex: Barbearia Premium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="opening_time">Horário de Abertura</Label>
                  <Input
                    id="opening_time"
                    type="time"
                    value={formData.opening_time || "09:00"}
                    onChange={(e) => setFormData(prev => ({ ...prev, opening_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closing_time">Horário de Fechamento</Label>
                  <Input
                    id="closing_time"
                    type="time"
                    value={formData.closing_time || "19:00"}
                    onChange={(e) => setFormData(prev => ({ ...prev, closing_time: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
