import { createClient } from 'npm:@supabase/supabase-js@2';
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
function buildExplanationPrompt(question, selected, correct) {
  return `Given the trivia question: "${question}"
    Selected answer: "${selected}"
    Correct answer: "${correct}"
    Explain in 2-3 sentences why the correct answer is correct. Do not mention the option letters`;
}
async function fetchExplanation(llm, question, selectedOption, correctOption) {
  const prompt = buildExplanationPrompt(question, selectedOption, correctOption);
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
  // Just return the explanation text (rawContent) as a string
  return rawContent;
}
Deno.serve(async (req)=>{
  try {
    const { question_id, selected_option, llm = "gemini", username } = await req.json();
    // Get question from DB
    const { data: question } = await supabase.from("questions").select("*").eq("id", question_id).single();
    if (!question) throw new Error("Question not found");
    const isCorrect = selected_option === question.correct_option ? 1 : 0;
    const correctOptionText = (question.options).split(',')[question.correct_option];
    const selectedOptionText = (question.options).split(',')[selected_option];
    const explanation = await fetchExplanation(llm, question.question_text, selectedOptionText, correctOptionText);
    // Store answer and update stats
    await supabase.from("answers").insert([
      {
        question_id,
        selected_option,
        is_correct: isCorrect,
        explanation
      }
    ]);
    // Update stats
    const stats = await supabase.from("player_stats").select("*").eq("username", username).single;
    if (stats.data) {
      await supabase.from("player_stats").update({
        correct_count: stats.data.correct_count + isCorrect,
        incorrect_count: stats.data.incorrect_count + (isCorrect ? 0 : 1),
        updated_at: new Date().toISOString()
      }).eq("username", username);
    } else {
      await supabase.from("player_stats").insert([
        {
          username,
          correct_count: isCorrect,
          incorrect_count: isCorrect ? 0 : 1
        }
      ]);
    }
    // Todo: Broadcast result via Supabase Realtime
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
      is_correct: isCorrect,
      explanation,
      correct_option: question.correct_option
    }), {
      status: 200,
      headers
    });
  } catch (err) {
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
