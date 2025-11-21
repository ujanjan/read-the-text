export interface Question {
  id: number;
  question: string;
  choices: string[];
  correctAnswer: number;
}

export interface Passage {
  id: string;
  title: string;
  text: string;
  questions: Question[];
}

export interface PassagesData {
  passages: Passage[];
}
