import { createClient } from 'npm:@supabase/supabase-js@2';
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
function buildLLMPrompt() {
  return `Generate a trivia question with 4 or 5 options. Only one answer should be correct. Use these topics: General Knowledge, Geography, History, Science, Literature, Movies, Music, Sports, Pop Culture, and Current Events. Respond in format: {"question": "...","options": ["...", "...", "...", "..."],"correct_option": 1}`;
}
const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
async function fetchQuestion() {
  const prompt = buildLLMPrompt();
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    })
  });
  const { candidates } = await res.json();
  let rawContent = candidates[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  rawContent = rawContent.replace(/^```json|^```|```$/gm, "").replace(/\n/g, "");
  try {
    // Validate and parse the JSON response
    const parsedContent = JSON.parse(rawContent);
    if (!parsedContent.question || !Array.isArray(parsedContent.options) || typeof parsedContent.correct_option !== 'number') {
      throw new Error("Invalid JSON structure");
    }
    let response = `{
                    "question": "${parsedContent.question}",
                    "options": "${parsedContent.options}",
                    "correct_option": ${parsedContent.correct_option}
                    }`;
    return JSON.parse(response);
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${rawContent}`);
  }
}
Deno.serve(async (req)=>{
  try {
    const llm = 'gemini';
    const questionObj = await fetchQuestion();
    const { data, error } = await supabase.from("questions").insert([
      {
        question_text: questionObj.question,
        options: questionObj.options,
        correct_option: questionObj.correct_option
      }
    ]).select().single();
    if (error) {
      console.error("Supabase insert error:", error.message);
      throw new Error(`Failed to insert question: ${JSON.stringify(error)} ${questionObj.question}`);
    }
    // Add CORS headers
    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, x-client-info, apikey");
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers
      });
    }
    return new Response(JSON.stringify({
      question: data
    }), {
      status: 200
    });
  } catch (err) {
    // Add CORS headers
    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, x-client-info, apikey");
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers
      });
    }
    return new Response(JSON.stringify({
      error: err.message || err
    }), {
      status: 500,
      headers
    });
  }
});
