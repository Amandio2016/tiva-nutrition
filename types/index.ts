export type Goal =
  | "ganhar_massa"
  | "emagrecer"
  | "manter_peso"
  | "melhorar_performance";

export type ActivityLevel =
  | "sedentario"
  | "leve"
  | "moderado"
  | "ativo"
  | "muito_ativo";

export type Profile = {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  goal: Goal;
  age: number;
  weight_kg: number;
  height_cm: number;
  activity_level: ActivityLevel;
  job_type: "escritório" | "trabalho_fisico" | "misto";
  sleep_hours: number;
  training_days: number;
  available_foods: string[];
  health_notes: string;
  onboarding_completed: boolean;
  plan_generated: boolean;
  created_at: string;
};

export type MealItem = {
  name: string;
  time: string;
  emoji: string;
  items: string[];
  tip: string;
};

export type TrainingDay = {
  day: string;
  focus: string;
  exercises: {
    name: string;
    sets: number;
    reps: string;
    rest: string;
    tip: string;
  }[];
};

export type Supplement = {
  name: string;
  dose: string;
  timing: string;
  reason: string;
  emoji: string;
  priority: "essencial" | "recomendado" | "opcional";
};

export type DailyRoutine = {
  wake_time: string;
  sleep_time: string;
  schedule: {
    time: string;
    activity: string;
    emoji: string;
    tip: string;
  }[];
};

export type AvoidItem = {
  category: "alimento" | "habito" | "comportamento";
  item: string;
  reason: string;
  emoji: string;
};

export type GeneratedPlan = {
  user_goal_summary: string;
  weekly_calories: number;
  daily_protein_g: number;
  weekly_menu: { [day: string]: MealItem[] };
  supplements: Supplement[];
  daily_routine: DailyRoutine;
  avoid_list: AvoidItem[];
  training_plan: TrainingDay[];
  coach_message: string;
};
