import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req: Request) => {
  // Simple content-type header is all we need
  const headers = { "Content-Type": "application/json" };

  try {
    if (req.method === "GET") {
      const { search, category, lowStock } = new URL(req.url).searchParams;

      let query = supabase.from("products").select("*").order("created_at", { ascending: false });

      // Apply search filter (if provided)
      if (search) query = query.ilike("name", `%${search}%`);

      // Filter by category (if provided)
      if (category) query = query.eq("category", category);

      // Fetch only low stock products (if requested)
      if (lowStock) query = query.lt("quantity", 5); // Example: Low stock is less than 5

      const { data, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers });
    }

    // Add a new product
    if (req.method === "POST") {
      const { name, quantity, category } = await req.json();
      const { error } = await supabase.from("products").insert([{ name, quantity, category }]);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: "Product added!" }), { headers });
    }

    // Delete a product by ID
    if (req.method === "DELETE") {
      const { id } = await req.json();
      const { error } = await supabase.from("products").delete().eq("id", id);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: "Product deleted!" }), { headers });
    }

    // Update product quantity by ID
    if (req.method === "PATCH") {
      const { id, quantity } = await req.json();
      const { error } = await supabase.from("products").update({ quantity }).eq("id", id);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: "Product quantity updated!" }), { headers });
    }

    // Handle user sign-up
    if (req.method === "POST" && req.url.includes("/signup")) {
      const { email, password } = await req.json();
      const { error } = await supabase.auth.signUp({ email, password });

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: "User registered!" }), { headers });
    }

    // Handle user login
    if (req.method === "POST" && req.url.includes("/login")) {
      const { email, password } = await req.json();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, token: data.session?.access_token }), { headers });
    }

    // Place an order
    if (req.method === "POST" && req.url.includes("/order")) {
      const { userId, items } = await req.json();
      const { error } = await supabase.from("orders").insert([{ user_id: userId, items }]);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: "Order placed!" }), { headers });
    }

    // Add item to cart
    if (req.method === "POST" && req.url.includes("/cart")) {
      const { userId, productId, quantity } = await req.json();
      const { error } = await supabase.from("cart").insert([{ user_id: userId, product_id: productId, quantity }]);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: "Item added to cart!" }), { headers });
    }

    // Handle unsupported methods
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers
    });

  } catch (error) {
    const errorproduct = error instanceof Error ? error.product : "Unknown error";
    return new Response(JSON.stringify({ error: errorproduct }), {
      status: 500,
      headers
    });
  }
});