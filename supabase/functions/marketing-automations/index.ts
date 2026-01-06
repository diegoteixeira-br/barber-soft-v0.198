import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BusinessSettings {
  user_id: string;
  birthday_automation_enabled: boolean;
  birthday_message_template: string;
  rescue_automation_enabled: boolean;
  rescue_days_threshold: number;
  rescue_message_template: string;
  automation_send_hour: number;
  automation_send_minute: number;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  birth_date: string | null;
  last_visit_at: string | null;
  unit_id: string;
  company_id: string;
}

interface Unit {
  id: string;
  name: string;
  evolution_instance_name: string | null;
}

interface AutomationTarget {
  client_id: string;
  phone: string;
  name: string;
  automation_type: "birthday" | "rescue";
  message: string;
  unit_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const n8nWebhookUrl = Deno.env.get("N8N_MARKETING_URL");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    if (!n8nWebhookUrl) {
      throw new Error("Missing N8N_MARKETING_URL environment variable");
    }

    // Create Supabase client with service role (bypass RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[marketing-automations] Starting automation check...");

    // Get current date and time in Brasília timezone
    const now = new Date();
    const brasiliaOffset = -3 * 60; // UTC-3 in minutes
    const brasiliaTime = new Date(now.getTime() + (brasiliaOffset - now.getTimezoneOffset()) * 60000);
    const currentDay = brasiliaTime.getDate();
    const currentMonth = brasiliaTime.getMonth() + 1; // 1-indexed
    const currentHour = brasiliaTime.getHours();
    const currentMinute = brasiliaTime.getMinutes();
    const todayDateStr = brasiliaTime.toISOString().split("T")[0]; // YYYY-MM-DD for log checking

    console.log(`[marketing-automations] Current time in Brasília: ${currentHour}:${currentMinute.toString().padStart(2, '0')} on ${currentDay}/${currentMonth} (${todayDateStr})`);

    // Fetch all business settings with automations enabled
    const { data: settingsList, error: settingsError } = await supabase
      .from("business_settings")
      .select("*")
      .or("birthday_automation_enabled.eq.true,rescue_automation_enabled.eq.true");

    if (settingsError) {
      console.error("[marketing-automations] Error fetching settings:", settingsError);
      throw settingsError;
    }

    if (!settingsList || settingsList.length === 0) {
      console.log("[marketing-automations] No businesses with automations enabled");
      return new Response(
        JSON.stringify({ success: true, message: "No automations to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[marketing-automations] Found ${settingsList.length} businesses with automations enabled`);

    let totalSent = 0;
    let totalSkipped = 0;

    for (const settings of settingsList as BusinessSettings[]) {
      console.log(`[marketing-automations] Processing user: ${settings.user_id}`);

      // Check if it's the configured send time (with ±3 min tolerance)
      const configuredHour = settings.automation_send_hour ?? 9; // Default to 9:00 if not set
      const configuredMinute = settings.automation_send_minute ?? 0;
      
      const configuredTotalMinutes = configuredHour * 60 + configuredMinute;
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      const timeDiff = Math.abs(currentTotalMinutes - configuredTotalMinutes);

      console.log(`[marketing-automations] Configured send time: ${configuredHour}:${configuredMinute.toString().padStart(2, '0')}, Current: ${currentHour}:${currentMinute.toString().padStart(2, '0')}, Diff: ${timeDiff} min`);

      if (timeDiff > 3) {
        console.log(`[marketing-automations] Not the configured send time for user ${settings.user_id}, skipping (diff: ${timeDiff} min)`);
        continue;
      }

      console.log(`[marketing-automations] Within send time window for user ${settings.user_id}`);

      // Get company for this user (only to get company_id)
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id, owner_user_id")
        .eq("owner_user_id", settings.user_id)
        .single();

      if (companyError || !company) {
        console.log(`[marketing-automations] No company found for user ${settings.user_id}`);
        continue;
      }

      // Get all clients for this company
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, name, phone, birth_date, last_visit_at, unit_id, company_id")
        .eq("company_id", company.id);

      if (clientsError) {
        console.error(`[marketing-automations] Error fetching clients for company ${company.id}:`, clientsError);
        continue;
      }

      if (!clients || clients.length === 0) {
        console.log(`[marketing-automations] No clients for company ${company.id}`);
        continue;
      }

      console.log(`[marketing-automations] Found ${clients.length} clients for company ${company.id}`);

      // Get all unit IDs from clients
      const unitIds = [...new Set(clients.map((c: Client) => c.unit_id).filter(Boolean))];

      // Fetch units with their WhatsApp instances
      const { data: units, error: unitsError } = await supabase
        .from("units")
        .select("id, name, evolution_instance_name")
        .in("id", unitIds);

      if (unitsError) {
        console.error(`[marketing-automations] Error fetching units:`, unitsError);
        continue;
      }

      const unitMap = new Map((units || []).map((u: Unit) => [u.id, u]));
      console.log(`[marketing-automations] Found ${units?.length || 0} units`);

      const targetsToSend: AutomationTarget[] = [];

      for (const client of clients as Client[]) {
        if (!client.phone) continue;

        // Check birthday automation
        if (settings.birthday_automation_enabled && client.birth_date) {
          const birthDate = new Date(client.birth_date);
          const birthDay = birthDate.getDate();
          const birthMonth = birthDate.getMonth() + 1;

          if (birthDay === currentDay && birthMonth === currentMonth) {
            // Check if already sent today
            const { data: existingLog } = await supabase
              .from("automation_logs")
              .select("id")
              .eq("company_id", company.id)
              .eq("client_id", client.id)
              .eq("automation_type", "birthday")
              .gte("sent_at", `${todayDateStr}T00:00:00`)
              .lt("sent_at", `${todayDateStr}T23:59:59`)
              .maybeSingle();

            if (!existingLog) {
              const message = settings.birthday_message_template
                .replace(/\{\{nome\}\}/gi, client.name)
                .replace(/\{\{name\}\}/gi, client.name);

              targetsToSend.push({
                client_id: client.id,
                phone: client.phone,
                name: client.name,
                automation_type: "birthday",
                message,
                unit_id: client.unit_id,
              });
              console.log(`[marketing-automations] Birthday target: ${client.name} (unit: ${client.unit_id})`);
            } else {
              totalSkipped++;
              console.log(`[marketing-automations] Birthday already sent to ${client.name} today`);
            }
          }
        }

        // Check rescue automation
        if (settings.rescue_automation_enabled && client.last_visit_at) {
          const lastVisit = new Date(client.last_visit_at);
          const daysSinceVisit = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));

          if (daysSinceVisit >= settings.rescue_days_threshold) {
            // Check if already sent in the last 30 days (don't spam)
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

            const { data: existingLog } = await supabase
              .from("automation_logs")
              .select("id")
              .eq("company_id", company.id)
              .eq("client_id", client.id)
              .eq("automation_type", "rescue")
              .gte("sent_at", thirtyDaysAgo)
              .maybeSingle();

            if (!existingLog) {
              const message = settings.rescue_message_template
                .replace(/\{\{nome\}\}/gi, client.name)
                .replace(/\{\{name\}\}/gi, client.name);

              targetsToSend.push({
                client_id: client.id,
                phone: client.phone,
                name: client.name,
                automation_type: "rescue",
                message,
                unit_id: client.unit_id,
              });
              console.log(`[marketing-automations] Rescue target: ${client.name} (${daysSinceVisit} days since last visit, unit: ${client.unit_id})`);
            } else {
              totalSkipped++;
              console.log(`[marketing-automations] Rescue already sent to ${client.name} in last 30 days`);
            }
          }
        }
      }

      if (targetsToSend.length === 0) {
        console.log(`[marketing-automations] No targets to send for company ${company.id}`);
        continue;
      }

      // Group targets by unit_id
      const targetsByUnit = new Map<string, AutomationTarget[]>();
      for (const target of targetsToSend) {
        const unitTargets = targetsByUnit.get(target.unit_id) || [];
        unitTargets.push(target);
        targetsByUnit.set(target.unit_id, unitTargets);
      }

      console.log(`[marketing-automations] Targets grouped into ${targetsByUnit.size} units`);

      // Process each unit separately
      for (const [unitId, unitTargets] of targetsByUnit) {
        const unit = unitMap.get(unitId);

        if (!unit) {
          console.log(`[marketing-automations] Unit ${unitId} not found, skipping ${unitTargets.length} targets`);
          continue;
        }

        if (!unit.evolution_instance_name) {
          console.log(`[marketing-automations] No WhatsApp instance for unit "${unit.name}" (${unitId}), skipping ${unitTargets.length} targets`);
          continue;
        }

        console.log(`[marketing-automations] Sending ${unitTargets.length} messages for unit "${unit.name}" using WhatsApp instance: ${unit.evolution_instance_name}`);

        // Send to n8n webhook
        try {
          const payload = {
            instance_name: unit.evolution_instance_name,
            targets: unitTargets.map((t) => ({
              phone: t.phone,
              name: t.name,
              message: t.message,
            })),
            automation_type: "mixed", // Can have both birthday and rescue
          };

          console.log(`[marketing-automations] Sending payload to n8n:`, JSON.stringify(payload, null, 2));

          const n8nResponse = await fetch(n8nWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!n8nResponse.ok) {
            console.error(`[marketing-automations] n8n error: ${n8nResponse.status}`);
            // Log failures
            for (const target of unitTargets) {
              await supabase.from("automation_logs").insert({
                company_id: company.id,
                automation_type: target.automation_type,
                client_id: target.client_id,
                status: "failed",
                error_message: `n8n returned ${n8nResponse.status}`,
              });
            }
          } else {
            console.log(`[marketing-automations] Successfully sent to n8n for unit "${unit.name}"`);
            // Log successes
            for (const target of unitTargets) {
              await supabase.from("automation_logs").insert({
                company_id: company.id,
                automation_type: target.automation_type,
                client_id: target.client_id,
                status: "sent",
              });
            }
            totalSent += unitTargets.length;
          }
        } catch (webhookError) {
          console.error(`[marketing-automations] Webhook error:`, webhookError);
          for (const target of unitTargets) {
            await supabase.from("automation_logs").insert({
              company_id: company.id,
              automation_type: target.automation_type,
              client_id: target.client_id,
              status: "failed",
              error_message: String(webhookError),
            });
          }
        }
      }
    }

    console.log(`[marketing-automations] Completed. Sent: ${totalSent}, Skipped: ${totalSkipped}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: totalSent,
        skipped: totalSkipped,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[marketing-automations] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
