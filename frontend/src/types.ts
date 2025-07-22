export interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_option: number;
  created_at: string;  
}

export interface Feedback {
  correct: boolean;
  explanation: string;
}

export interface PlayerStats {
  correct: number;
  incorrect: number;
}