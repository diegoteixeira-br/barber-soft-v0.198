import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
const EVOLUTION_GLOBAL_KEY = Deno.env.get('EVOLUTION_GLOBAL_KEY');
const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    if (!EVOLUTION_API_URL || !EVOLUTION_GLOBAL_KEY || !N8N_WEBHOOK_URL) {
      console.error('Missing environment variables:', {
        hasEvolutionUrl: !!EVOLUTION_API_URL,
        hasGlobalKey: !!EVOLUTION_GLOBAL_KEY,
        hasWebhookUrl: !!N8N_WEBHOOK_URL,
      });
      throw new Error('Variáveis de ambiente não configuradas');
    }

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Verify the JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Usuário não autenticado');
    }

    // Get user's company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_user_id', user.id)
      .single();

    if (companyError || !company) {
      console.error('Company error:', companyError);
      throw new Error('Empresa não encontrada');
    }

    const { action } = await req.json();
    console.log(`Action: ${action}, Company: ${company.id}`);

    switch (action) {
      case 'create': {
        // Generate unique instance name and token
        const timestamp = Date.now();
        const instanceName = `barbersoft_${company.id.substring(0, 8)}_${timestamp}`;
        const instanceToken = generateToken();

        console.log(`Creating instance: ${instanceName}`);

        // Create instance with webhook configuration
        const createPayload = {
          instanceName,
          token: instanceToken,
          qrcode: true,
          webhook: N8N_WEBHOOK_URL,
          events: ["MESSAGES_UPSERT"]
        };

        console.log('Create payload:', JSON.stringify(createPayload));

        const createResponse = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_GLOBAL_KEY!,
          },
          body: JSON.stringify(createPayload),
        });

        const createData = await createResponse.json();
        console.log('Create response:', JSON.stringify(createData));

        if (!createResponse.ok) {
          throw new Error(createData.message || 'Erro ao criar instância');
        }

        // Save instance info to database
        const { error: updateError } = await supabase
          .from('companies')
          .update({
            evolution_instance_name: instanceName,
            evolution_api_key: instanceToken,
          })
          .eq('id', company.id);

        if (updateError) {
          console.error('Update error:', updateError);
          throw new Error('Erro ao salvar dados da instância');
        }

        // Get QR Code
        const qrResponse = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: {
            'apikey': EVOLUTION_GLOBAL_KEY!,
          },
        });

        const qrData = await qrResponse.json();
        console.log('QR response status:', qrResponse.status);

        if (!qrResponse.ok) {
          throw new Error(qrData.message || 'Erro ao gerar QR Code');
        }

        return new Response(JSON.stringify({
          success: true,
          instanceName,
          qrCode: qrData.base64 || qrData.qrcode?.base64,
          pairingCode: qrData.pairingCode,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'status': {
        if (!company.evolution_instance_name) {
          return new Response(JSON.stringify({
            success: true,
            state: 'disconnected',
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Checking status for: ${company.evolution_instance_name}`);

        const statusResponse = await fetch(
          `${EVOLUTION_API_URL}/instance/connectionState/${company.evolution_instance_name}`,
          {
            method: 'GET',
            headers: {
              'apikey': EVOLUTION_GLOBAL_KEY!,
            },
          }
        );

        const statusData = await statusResponse.json();
        console.log('Status response:', JSON.stringify(statusData));

        if (!statusResponse.ok) {
          // Instance might not exist anymore
          if (statusResponse.status === 404) {
            return new Response(JSON.stringify({
              success: true,
              state: 'disconnected',
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          throw new Error(statusData.message || 'Erro ao verificar status');
        }

        return new Response(JSON.stringify({
          success: true,
          state: statusData.state || statusData.instance?.state || 'unknown',
          instanceName: company.evolution_instance_name,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'disconnect': {
        if (!company.evolution_instance_name) {
          return new Response(JSON.stringify({
            success: true,
            message: 'Nenhuma instância conectada',
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Disconnecting: ${company.evolution_instance_name}`);

        // Logout from instance
        try {
          await fetch(
            `${EVOLUTION_API_URL}/instance/logout/${company.evolution_instance_name}`,
            {
              method: 'DELETE',
              headers: {
                'apikey': EVOLUTION_GLOBAL_KEY!,
              },
            }
          );
        } catch (e) {
          console.log('Logout error (non-critical):', e);
        }

        // Delete instance
        try {
          await fetch(
            `${EVOLUTION_API_URL}/instance/delete/${company.evolution_instance_name}`,
            {
              method: 'DELETE',
              headers: {
                'apikey': EVOLUTION_GLOBAL_KEY!,
              },
            }
          );
        } catch (e) {
          console.log('Delete error (non-critical):', e);
        }

        // Clear database
        const { error: updateError } = await supabase
          .from('companies')
          .update({
            evolution_instance_name: null,
            evolution_api_key: null,
          })
          .eq('id', company.id);

        if (updateError) {
          console.error('Update error:', updateError);
          throw new Error('Erro ao limpar dados');
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Desconectado com sucesso',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'refresh-qr': {
        if (!company.evolution_instance_name) {
          throw new Error('Nenhuma instância encontrada');
        }

        console.log(`Refreshing QR for: ${company.evolution_instance_name}`);

        const qrResponse = await fetch(
          `${EVOLUTION_API_URL}/instance/connect/${company.evolution_instance_name}`,
          {
            method: 'GET',
            headers: {
              'apikey': EVOLUTION_GLOBAL_KEY!,
            },
          }
        );

        const qrData = await qrResponse.json();
        console.log('Refresh QR response status:', qrResponse.status);

        if (!qrResponse.ok) {
          throw new Error(qrData.message || 'Erro ao atualizar QR Code');
        }

        return new Response(JSON.stringify({
          success: true,
          qrCode: qrData.base64 || qrData.qrcode?.base64,
          pairingCode: qrData.pairingCode,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Ação inválida: ${action}`);
    }
  } catch (error) {
    console.error('Error in evolution-whatsapp:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
