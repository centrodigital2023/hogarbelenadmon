import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ===== AUTH CHECK: Verify caller JWT =====
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const callerId = caller.id;
    // ===== END AUTH CHECK =====

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Verify caller is super_admin
    const { data: callerRoles } = await adminClient.from("user_roles").select("role").eq("user_id", callerId);
    const isSuperAdmin = callerRoles?.some((r: any) => r.role === "super_admin");
    if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Solo super_admin puede gestionar usuarios" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { action, ...payload } = await req.json();

    if (action === "create") {
      const { email, password, full_name, role } = payload;
      if (!email || !password || !full_name || !role) {
        return new Response(JSON.stringify({ error: "Campos requeridos: email, password, full_name, role" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (password.length < 6) {
        return new Response(JSON.stringify({ error: "La contraseña debe tener al menos 6 caracteres" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createErr) return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      await adminClient.from("user_roles").insert({ user_id: newUser.user.id, role });

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update_role") {
      const { user_id, old_role, new_role } = payload;
      if (!user_id || !new_role) {
        return new Response(JSON.stringify({ error: "user_id y new_role requeridos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (old_role) {
        await adminClient.from("user_roles").delete().eq("user_id", user_id).eq("role", old_role);
      }
      await adminClient.from("user_roles").upsert({ user_id, role: new_role }, { onConflict: "user_id,role" });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "add_role") {
      const { user_id, role } = payload;
      if (!user_id || !role) return new Response(JSON.stringify({ error: "user_id y role requeridos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { error } = await adminClient.from("user_roles").insert({ user_id, role });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "remove_role") {
      const { user_id, role } = payload;
      if (!user_id || !role) return new Response(JSON.stringify({ error: "user_id y role requeridos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await adminClient.from("user_roles").delete().eq("user_id", user_id).eq("role", role);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete") {
      const { user_id } = payload;
      if (!user_id) return new Response(JSON.stringify({ error: "user_id requerido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (user_id === callerId) return new Response(JSON.stringify({ error: "No puede eliminarse a sí mismo" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      await adminClient.from("profiles").delete().eq("user_id", user_id);
      const { error } = await adminClient.auth.admin.deleteUser(user_id);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update_profile") {
      const { user_id, full_name, phone } = payload;
      if (!user_id) return new Response(JSON.stringify({ error: "user_id requerido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const updates: any = {};
      if (full_name) updates.full_name = full_name;
      if (phone !== undefined) updates.phone = phone;
      const { error } = await adminClient.from("profiles").update(updates).eq("user_id", user_id);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "reset_password") {
      const { user_id, new_password } = payload;
      if (!user_id || !new_password) return new Response(JSON.stringify({ error: "user_id y new_password requeridos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (new_password.length < 6) return new Response(JSON.stringify({ error: "Mínimo 6 caracteres" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { error } = await adminClient.auth.admin.updateUserById(user_id, { password: new_password });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "list") {
      const { data: profiles } = await adminClient.from("profiles").select("user_id, full_name, phone, avatar_url");
      const { data: allRoles } = await adminClient.from("user_roles").select("user_id, role");
      const { data: { users } } = await adminClient.auth.admin.listUsers();

      const userMap: Record<string, any> = {};
      users?.forEach((u: any) => {
        userMap[u.id] = { user_id: u.id, email: u.email, full_name: '', phone: '', roles: [], created_at: u.created_at };
      });
      profiles?.forEach((p: any) => {
        if (userMap[p.user_id]) {
          userMap[p.user_id].full_name = p.full_name;
          userMap[p.user_id].phone = p.phone || '';
        }
      });
      allRoles?.forEach((r: any) => {
        if (userMap[r.user_id]) userMap[r.user_id].roles.push(r.role);
      });

      return new Response(JSON.stringify({ users: Object.values(userMap) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Acción no reconocida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
