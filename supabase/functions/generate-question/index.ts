import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

async function fetchQuestion(llm: "openai" | "gemini") {
    let response = `{
                    "question": "What is the Capital of NY",
                    "options": ["NYC", "Albany", "Detroit", "Syracuse"],
                    "correct_option": 1
                    }`;
    // Placeholder: return parsed JSON object
    return JSON.parse(response);
    // Todo Uncomment and implement API calls below
    // if(llm === "openai") {
    //     //Todo: Implement OpenAI API call
    // }
    // else if(llm === "gemini") {
    //     //Todo: Implement Gemini API call
    // }
}

Deno.serve(async (req) => {
  try {
    const { llm = "gemini" } = await req.json();
    const questionObj = await fetchQuestion(llm);

    const { data, error } = await supabase
      .from("questions")
      .insert([{
        question_text: questionObj.question,
        options: questionObj.options,
        correct_option: questionObj.correct_option
      }])
      .select()
      .single();

    if (error) throw error;

    // Todo: Broadcast new question via Supabase Realtime
    // Add CORS headers
    const headers = new Headers();
    headers.set("Cross-Origin-Resource-Policy", "cross-origin");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "*");
    return new Response(JSON.stringify({ question: data }), { status: 200, headers });
  } catch (err: any) {
    // Add CORS headers
    const headers = new Headers();
    headers.set("Cross-Origin-Resource-Policy", "cross-origin");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "*");
    return new Response(JSON.stringify({ error: err.message || err }), { status: 500, headers });
  }
});