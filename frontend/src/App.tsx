import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Question, Feedback, PlayerStats } from './types';
import './App.css';

const TIMER_SECONDS = 10;

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL as string,
  process.env.REACT_APP_SUPABASE_ANON_KEY as string
);

const App: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [question, setQuestion] = useState<any | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<any | null>(null);
  const [score, setScore] = useState<PlayerStats>({ correct: 0, incorrect: 0 });
  const [timer, setTimer] = useState<number>(TIMER_SECONDS);
  const [topScores, setTopScores] = useState<any[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  async function fetchQuestion(): Promise<void> {
    // setSelected(null); setFeedback(null); setTimer(TIMER_SECONDS);
    const { data, error } = await supabase.functions.invoke('generate-question', {
      body: { llm: "gemini" },
    });
    if (error) {
      console.error('Error fetching question:', error);
      return;
    }
    else{
      let json_data = JSON.parse(data);
      console.log("question: " + JSON.stringify(json_data.question));
      setQuestion(json_data.question);
      console.log("here")
    }
    setSelected(null); setFeedback(null); setTimer(TIMER_SECONDS);
    
  }

  async function submitAnswer(optionIdx: number): Promise<void> {
    setSelected(optionIdx);
    const { data, error } = await supabase.functions.invoke('submit-answer', {
      body: {
        question_id: question?.id,
        selected_option: optionIdx, // Adjust for 0-based index
        llm: "gemini",
        username,
      },
    });
    if (error) {
      console.error('Error submitting answer:', error);
      return;
    }
    let json_data = JSON.parse(data);
    console.log("question: " + JSON.stringify(json_data));
    console.log("explanation: " + json_data.explanation);
    console.log("is_correct: " + json_data.is_correct);
    setFeedback({ correct: json_data.is_correct, explanation: json_data.explanation });
    setScore((prev) => ({
      correct: prev.correct + (json_data.is_correct ? 1 : 0),
      incorrect: prev.incorrect + (json_data.is_correct ? 0 : 1),
    }));
  }

  async function fetchTopScores(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('player_stats')
        .select('username, correct_count, incorrect_count')
        .order('correct_count', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('Error fetching top scores:', error);
        return;
      }
      else{
        setTopScores(data);
      }
    } catch (error) {
      console.error('Error fetching top scores:', error);
    }
  }

  useEffect(() => {
    fetchTopScores();
  }, []);

  useEffect(() => {
    if (!gameStarted || feedback) return;
    if (timer === 0 && question && selected == null) {
      submitAnswer(-1);
    }
    timerRef.current = setTimeout(() => setTimer((t) => t - 1), 3000);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current as NodeJS.Timeout);
      }
    };
  }, [timer, gameStarted, feedback, question, selected]);

  function startGame(): void {
    setGameStarted(true);
    setScore({ correct: 0, incorrect: 0 });
    fetchQuestion();
  }

  function nextQuestion(): void {
    fetchQuestion();
  }

  function resetGame(): void {
    setGameStarted(false);
    setQuestion(null);
    setScore({ correct: 0, incorrect: 0 });
  }

  return (
    <div className="retro-bg">
      {!gameStarted ? (
        <div className="landing">
          <h1>AI Trivia Arena - SupaQuiz</h1>
          <input
            placeholder="Enter username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <button onClick={startGame} disabled={!username}>Start Game</button>
          
          <div className="top-scores">
            <h2>🏆 Top Scores</h2>
            {topScores.length > 0 ? (
              <div className="scores-list">
                <div className="scores-header">
                  <span className="rank-header">Rank</span>
                  <span className="username-header">Player</span>
                  <span className="score-header">Score</span>
                </div>
                {topScores.map((player, index) => (
                  <div key={index} className="score-item">
                    <span className="rank">#{index + 1}</span>
                    <span className="username">{player.username}</span>
                    <span className="score">{player.correct_count}/{player.correct_count + player.incorrect_count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-scores">No scores yet. Be the first!</div>
            )}
          </div>
        </div>
      ) : (
        <div className="game">
          <div className="scoreboard">Score: {score.correct} / {score.correct + score.incorrect}</div>
          <button className="reset-btn" onClick={resetGame}>Reset</button>
          <div className="game-container">
            <div className="player-info">Player: {username}</div>
          </div>
          <div>Question: {question?.question_text}</div>
          {question && (
            <div className="question-card">
              <div className="timer">{timer}s</div>
              <div className="question">{question.question_text}</div>
              <div className="options">
                {question.options.split(',').map((opt: string, idx: number) => (
                  <button
                    key={idx}
                    className={`option-btn ${selected === idx ? (feedback?.correct ? 'correct' : 'wrong') : ''}`}
                    disabled={!!feedback || selected !== null}
                    onClick={() => submitAnswer(idx)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {feedback && (
                <div className={`explanation ${feedback.correct ? 'correct' : 'wrong'}`}>
                  {feedback.correct ? '🎉 Correct! ' : '❌ Wrong! '}
                  {feedback.explanation}
                  <button onClick={nextQuestion}>Next Question</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;