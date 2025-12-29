
export interface UserData {
  age: number;
  gender: 'male' | 'female' | 'other';
  weight: number;
  height: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'lose' | 'maintain' | 'gain';
  restrictions: string[];
  allergies: string;
  dislikedFoods: string;
  medicalConditions: string;
  extraNotes: string;
}

export interface Meal {
  id: string; // Unique ID for favorite tracking
  time: string;
  dish: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTime?: string;
  servings?: string;
  ingredients?: string[];
  alternatives?: string[];
}

export interface DayPlan {
  day: string;
  meals: Meal[];
}

export interface DietPlan {
  summary: string;
  dailyCalories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  weeklyPlan: DayPlan[];
  tips: string[];
}

export interface AIResponse {
  type: 'questions' | 'plan';
  questions?: string[];
  plan?: DietPlan;
}

export interface WeightEntry {
  date: string; // YYYY-MM-DD
  weight: number;
}