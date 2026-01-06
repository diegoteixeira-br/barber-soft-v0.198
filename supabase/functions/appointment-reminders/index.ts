import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BusinessSettings {
  user_id: string;
  appointment_reminder_enabled: boolean;
  appointment_reminder_minutes: number;
  appointment_reminder_template: string;
}

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  start_time: string;
  status: string;
  company_id: string;
  unit_id: string;
  barber_id: string;
  service_id: string;
}

interface Barber {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  name: string;
  evolution_instance_name: string | null;
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

    console.log("[appointment-reminders] Starting reminder check...");

    // Get current time in Brasília timezone
    const now = new Date();
    const brasiliaOffset = -3 * 60; // UTC-3 in minutes
    const brasiliaTime = new Date(now.getTime() + (brasiliaOffset - now.getTimezoneOffset()) * 60000);

    console.log(`[appointment-reminders] Current time in Brasília: ${brasiliaTime.toISOString()}`);

    // Fetch all business settings with appointment reminder enabled
    const { data: settingsList, error: settingsError } = await supabase
      .from("business_settings")
      .select("user_id, appointment_reminder_enabled, appointment_reminder_minutes, appointment_reminder_template")
      .eq("appointment_reminder_enabled", true);

    if (settingsError) {
      console.error("[appointment-reminders] Error fetching settings:", settingsError);
      throw settingsError;
    }

    if (!settingsList || settingsList.length === 0) {
      console.log("[appointment-reminders] No businesses with appointment reminders enabled");
      return new Response(
        JSON.stringify({ success: true, message: "No reminders to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[appointment-reminders] Found ${settingsList.length} businesses with reminders enabled`);

    let totalSent = 0;
    let totalSkipped = 0;

    for (const settings of settingsList as BusinessSettings[]) {
      console.log(`[appointment-reminders] Processing user: ${settings.user_id}`);

      // Get company for this user (only to get company_id)
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id, owner_user_id")
        .eq("owner_user_id", settings.user_id)
        .single();

      if (companyError || !company) {
        console.log(`[appointment-reminders] No company found for user ${settings.user_id}`);
        continue;
      }

      // Calculate the time window for reminders
      const reminderMinutes = settings.appointment_reminder_minutes || 30;
      
      // Window: we look for appointments that start within the reminder window (±3 min tolerance)
      const reminderTargetTime = new Date(now.getTime() + reminderMinutes * 60 * 1000);
      const reminderWindowStart = new Date(reminderTargetTime.getTime() - 3 * 60 * 1000);
      const reminderWindowEnd = new Date(reminderTargetTime.getTime() + 3 * 60 * 1000);

      console.log(`[appointment-reminders] Looking for appointments between ${reminderWindowStart.toISOString()} and ${reminderWindowEnd.toISOString()}`);

      // Get appointments in the reminder window - include both pending and scheduled status
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select("id, client_name, client_phone, start_time, status, company_id, unit_id, barber_id, service_id")
        .eq("company_id", company.id)
        .in("status", ["scheduled", "pending", "confirmed"])
        .gte("start_time", reminderWindowStart.toISOString())
        .lte("start_time", reminderWindowEnd.toISOString())
        .not("client_phone", "is", null);

      if (appointmentsError) {
        console.error(`[appointment-reminders] Error fetching appointments:`, appointmentsError);
        continue;
      }

      if (!appointments || appointments.length === 0) {
        console.log(`[appointment-reminders] No appointments in reminder window for company ${company.id}`);
        continue;
      }

      console.log(`[appointment-reminders] Found ${appointments.length} appointments in window`);

      // Group appointments by unit_id
      const appointmentsByUnit = new Map<string, Appointment[]>();
      for (const apt of appointments as Appointment[]) {
        const unitAppts = appointmentsByUnit.get(apt.unit_id) || [];
        unitAppts.push(apt);
        appointmentsByUnit.set(apt.unit_id, unitAppts);
      }

      console.log(`[appointment-reminders] Appointments grouped into ${appointmentsByUnit.size} units`);

      // Get all unit IDs
      const unitIds = [...appointmentsByUnit.keys()];

      // Fetch units with their WhatsApp instances
      const { data: units, error: unitsError } = await supabase
        .from("units")
        .select("id, name, evolution_instance_name")
        .in("id", unitIds);

      if (unitsError) {
        console.error(`[appointment-reminders] Error fetching units:`, unitsError);
        continue;
      }

      const unitMap = new Map((units || []).map((u: Unit) => [u.id, u]));

      // Get barbers and services for message formatting
      const barberIds = [...new Set(appointments.map((a: Appointment) => a.barber_id).filter(Boolean))];
      const serviceIds = [...new Set(appointments.map((a: Appointment) => a.service_id).filter(Boolean))];

      const { data: barbers } = await supabase
        .from("barbers")
        .select("id, name")
        .in("id", barberIds);

      const { data: services } = await supabase
        .from("services")
        .select("id, name")
        .in("id", serviceIds);

      const barberMap = new Map((barbers || []).map((b: Barber) => [b.id, b.name]));
      const serviceMap = new Map((services || []).map((s: Service) => [s.id, s.name]));

      // Process each unit separately
      for (const [unitId, unitAppointments] of appointmentsByUnit) {
        const unit = unitMap.get(unitId);
        
        if (!unit) {
          console.log(`[appointment-reminders] Unit ${unitId} not found, skipping`);
          continue;
        }

        if (!unit.evolution_instance_name) {
          console.log(`[appointment-reminders] No WhatsApp instance for unit "${unit.name}" (${unitId}), skipping`);
          continue;
        }

        console.log(`[appointment-reminders] Processing unit "${unit.name}" with WhatsApp instance: ${unit.evolution_instance_name}`);

        const targetsToSend: { appointment: Appointment; message: string }[] = [];

        for (const appointment of unitAppointments) {
          if (!appointment.client_phone) continue;

          // Check if reminder already sent for this appointment
          const { data: existingLog } = await supabase
            .from("automation_logs")
            .select("id")
            .eq("appointment_id", appointment.id)
            .eq("automation_type", "appointment_reminder")
            .maybeSingle();

          if (existingLog) {
            totalSkipped++;
            console.log(`[appointment-reminders] Reminder already sent for appointment ${appointment.id}`);
            continue;
          }

          // Format the message
          const startTime = new Date(appointment.start_time);
          const timeStr = startTime.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Sao_Paulo",
          });
          const dateStr = startTime.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            timeZone: "America/Sao_Paulo",
          });

          const barberName = barberMap.get(appointment.barber_id) || "nosso profissional";
          const serviceName = serviceMap.get(appointment.service_id) || "seu serviço";

          const message = settings.appointment_reminder_template
            .replace(/\{\{nome\}\}/gi, appointment.client_name)
            .replace(/\{\{name\}\}/gi, appointment.client_name)
            .replace(/\{\{horario\}\}/gi, timeStr)
            .replace(/\{\{hora\}\}/gi, timeStr)
            .replace(/\{\{data\}\}/gi, dateStr)
            .replace(/\{\{date\}\}/gi, dateStr)
            .replace(/\{\{profissional\}\}/gi, barberName)
            .replace(/\{\{barber\}\}/gi, barberName)
            .replace(/\{\{servico\}\}/gi, serviceName)
            .replace(/\{\{service\}\}/gi, serviceName);

          targetsToSend.push({ appointment, message });
        }

        if (targetsToSend.length === 0) {
          console.log(`[appointment-reminders] No new reminders to send for unit "${unit.name}"`);
          continue;
        }

        console.log(`[appointment-reminders] Sending ${targetsToSend.length} reminders for unit "${unit.name}"`);

        // Send to n8n webhook
        try {
          const payload = {
            instance_name: unit.evolution_instance_name,
            targets: targetsToSend.map((t) => ({
              phone: t.appointment.client_phone,
              name: t.appointment.client_name,
              message: t.message,
            })),
            automation_type: "appointment_reminder",
          };

          console.log(`[appointment-reminders] Sending payload to n8n:`, JSON.stringify(payload, null, 2));

          const n8nResponse = await fetch(n8nWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!n8nResponse.ok) {
            console.error(`[appointment-reminders] n8n error: ${n8nResponse.status}`);
            // Log failures
            for (const target of targetsToSend) {
              await supabase.from("automation_logs").insert({
                company_id: company.id,
                automation_type: "appointment_reminder",
                appointment_id: target.appointment.id,
                client_id: target.appointment.client_phone, // Using phone as fallback since we don't have client_id
                status: "failed",
                error_message: `n8n returned ${n8nResponse.status}`,
              });
            }
          } else {
            console.log(`[appointment-reminders] Successfully sent to n8n for unit "${unit.name}"`);
            // Log successes - IMMEDIATELY to prevent duplicates
            for (const target of targetsToSend) {
              await supabase.from("automation_logs").insert({
                company_id: company.id,
                automation_type: "appointment_reminder",
                appointment_id: target.appointment.id,
                client_id: target.appointment.client_phone, // Using phone as fallback
                status: "sent",
              });
            }
            totalSent += targetsToSend.length;
          }
        } catch (webhookError) {
          console.error(`[appointment-reminders] Webhook error:`, webhookError);
          for (const target of targetsToSend) {
            await supabase.from("automation_logs").insert({
              company_id: company.id,
              automation_type: "appointment_reminder",
              appointment_id: target.appointment.id,
              client_id: target.appointment.client_phone,
              status: "failed",
              error_message: String(webhookError),
            });
          }
        }
      }
    }

    console.log(`[appointment-reminders] Completed. Sent: ${totalSent}, Skipped: ${totalSkipped}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: totalSent,
        skipped: totalSkipped,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[appointment-reminders] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
