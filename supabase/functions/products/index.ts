import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req: Request) => {
  // Simple content-type header
  const headers = { "Content-Type": "application/json" };

  try {
    // Handle GET request - fetch products with optional filters
    if (req.method === "GET") {
      const url = new URL(req.url);
      const category = url.searchParams.get("category");  // Get category filter
      const search = url.searchParams.get("search");  // Get search query
      
      let query = supabase.from("products").select("*").order("created_at", { ascending: false });

      // Apply category filter if provided
      if (category) {
        query = query.eq("category", category);
      }

      // Apply search filter if provided (search by product name)
      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return new Response(JSON.stringify(data), { headers });
    }

    // Handle POST request - add product to basket
    if (req.method === "POST") {
      const { session_id, product_id, quantity } = await req.json();

      // Check if the product is available in stock (quantity check)
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("quantity")
        .eq("id", product_id)
        .single();

      if (productError) throw productError;

      if (product && product.quantity < quantity) {
        return new Response(
          JSON.stringify({ error: "Not enough stock available" }),
          { status: 400, headers }
        );
      }

      // Add the product to the basket
      const { error } = await supabase.from("basket").insert([{ session_id, product_id, quantity }]);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: "Product added to basket!" }), { headers });
    }

    // Handle unsupported methods
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers,
    });
  }
});
