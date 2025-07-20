import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function fetchExplanation(llm: "openai" | "gemini", question: string, selectedOption: string, correctOption: string) {
    // Placeholder for explanation generation
    return `Trust me bro, the correct answer is ${correctOption}.`;
}

Deno.serve(async (req) => {
  try {
    const { question_id, selected_option, llm = "gemini", username } = await req.json();

    // Get question from DB
    const { data: question } = await supabase
      .from("questions")
      .select("*")
      .eq("id", question_id)
      .single();

    if (!question) throw new Error("Question not found");

    const isCorrect = selected_option === question.correct_option;
    const explanation = await fetchExplanation(
      llm,
      question.question_text,
      question.options[selected_option],
      question.options[question.correct_option]
    );

    // Store answer and update stats
    await supabase.from("answers").insert([{
      question_id,
      selected_option,
      is_correct: isCorrect,
      explanation
    }]);

    // Update stats
    const stats = await supabase
      .from("player_stats")
      .select("*")
      .eq("username", username)
      .single();

    if (stats.data) {
      await supabase
        .from("player_stats")
        .update({
          correct_count: stats.data.correct_count + (isCorrect ? 1 : 0),
          incorrect_count: stats.data.incorrect_count + (isCorrect ? 0 : 1),
          updated_at: new Date().toISOString()
        })
        .eq("username", username);
    } else {
      await supabase
        .from("player_stats")
        .insert([{
          username,
          correct_count: isCorrect ? 1 : 0,
          incorrect_count: isCorrect ? 0 : 1
        }]);
    }

    // Todo: Broadcast result via Supabase Realtime

    return new Response(
      JSON.stringify({
        is_correct: isCorrect,
        explanation,
        correct_option: question.correct_option
      }), { status: 200 }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || err }), { status: 500 });
  }
});