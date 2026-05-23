import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Extend serverless timeout for Vercel (hobby = 60s, pro = 300s)
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Harris-Benedict (male formula — profile lacks sex field) ──────────────────
// Male:  88.362 + (13.397 × kg) + (4.799 × cm) − (5.677 × age)
// Using male as default for this athletic/muscle-gain context.
function harrisBenedict(weight_kg: number, height_cm: number, age: number): number {
  return Math.round(88.362 + 13.397 * weight_kg + 4.799 * height_cm - 5.677 * age);
}

const ACTIVITY_FACTOR: Record<string, number> = {
  sedentario:  1.2,
  leve:        1.375,
  moderado:    1.55,
  ativo:       1.725,
  muito_ativo: 1.9,
};

// Physical job adds real extra expenditure on top of the activity multiplier
const JOB_KCAL_BONUS: Record<string, number> = {
  escritório:      0,
  trabalho_fisico: 200,
  misto:           100,
};

function calcTDEE(tmb: number, activity_level: string, job_type: string): number {
  const factor = ACTIVITY_FACTOR[activity_level] ?? 1.55;
  const bonus  = JOB_KCAL_BONUS[job_type] ?? 0;
  return Math.round(tmb * factor + bonus);
}

function calorieTarget(tdee: number, goal: string): number {
  const delta: Record<string, number> = {
    ganhar_massa:         +300,
    emagrecer:            -400,
    manter_peso:             0,
    melhorar_performance: +100,
  };
  return tdee + (delta[goal] ?? 0);
}

function proteinTarget(weight_kg: number, goal: string): number {
  const ratio: Record<string, number> = {
    ganhar_massa:         2.0,
    emagrecer:            1.2,
    manter_peso:          1.5,
    melhorar_performance: 1.8,
  };
  return Math.round(weight_kg * (ratio[goal] ?? 1.5));
}

// ── System prompt (exact, as specified) ──────────────────────────────────────

const SYSTEM_PROMPT = `És um coach de saúde e performance especializado em atletas moçambicanos e africanos. Conheces bem os alimentos locais de Moçambique: somo de malamba, xima, matapa, camarão, peixe fresco, feijão nhemba, etc.

Crias planos práticos, realistas e baseados em evidência científica.
Consideras o contexto económico e cultural moçambicano.
Usas linguagem motivadora mas directa, em Português de Moçambique.

CRÍTICO: Respondes APENAS com JSON válido. Nenhum texto antes ou depois.
Nenhum markdown. Nenhum bloco de código. Apenas o objecto JSON puro.`;

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Não autenticado" },
      { status: 401 }
    );
  }

  // Try DB first; fall back to request body to handle read-replica lag right after onboarding upsert
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let profile: Record<string, any> | null = null;
  const { data: dbProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (dbProfile) {
    profile = dbProfile;
  } else {
    const body = await request.json().catch(() => ({}));
    if (body.name && body.goal) {
      profile = { id: user.id, email: user.email ?? "", avatar_url: "", ...body };
    }
  }

  if (!profile) {
    return NextResponse.json(
      { success: false, error: "Perfil não encontrado" },
      { status: 404 }
    );
  }

  // ── Server-side nutritional calculations ──────────────────────────────────

  const tmb           = harrisBenedict(profile.weight_kg, profile.height_cm, profile.age);
  const tdee          = calcTDEE(tmb, profile.activity_level, profile.job_type);
  const targetKcal    = calorieTarget(tdee, profile.goal);
  const targetProtein = proteinTarget(profile.weight_kg, profile.goal);

  const userPrompt = buildPrompt(profile, { tmb, tdee, targetKcal, targetProtein });

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: userPrompt },
      ],
    });

    const rawText = (message.content[0] as { type: "text"; text: string }).text;
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Resposta inválida da IA");
    const plan = JSON.parse(jsonMatch[0]);

    // ── Persist to Supabase ─────────────────────────────────────────────────

    await supabase
      .from("generated_plans")
      .insert({ user_id: user.id, plan_data: plan });

    await supabase
      .from("profiles")
      .update({ plan_generated: true })
      .eq("id", user.id);

    return NextResponse.json({ success: true, plan });
  } catch (err) {
    console.error("[generate-plan]", err);
    const msg = err instanceof Error ? err.message : "Erro ao gerar plano";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  p: Record<string, any>,
  calc: { tmb: number; tdee: number; targetKcal: number; targetProtein: number }
): string {
  const foods =
    Array.isArray(p.available_foods) && p.available_foods.length > 0
      ? p.available_foods.join(", ")
      : "frango, ovos, arroz, feijão, banana, legumes básicos";

  const goalLabel: Record<string, string> = {
    ganhar_massa:         "Ganhar massa muscular",
    emagrecer:            "Emagrecer",
    manter_peso:          "Manter o peso",
    melhorar_performance: "Melhorar a performance",
  };

  const kcalDelta = calc.targetKcal - calc.tdee;
  const deltaLabel =
    kcalDelta > 0
      ? `surplus de +${kcalDelta} kcal`
      : kcalDelta < 0
      ? `défice de ${kcalDelta} kcal`
      : "manutenção calórica";

  return `DADOS DO UTILIZADOR:
Nome: ${p.name}
Objetivo: ${goalLabel[p.goal] ?? p.goal}
Idade: ${p.age} anos | Peso: ${p.weight_kg} kg | Altura: ${p.height_cm} cm
Nível de actividade: ${p.activity_level}
Tipo de trabalho: ${p.job_type}
Horas de sono: ${p.sleep_hours}h/noite
Dias de treino/semana: ${p.training_days}
Alimentos disponíveis: ${foods}
Notas de saúde: ${p.health_notes || "nenhuma"}

CÁLCULOS NUTRICIONAIS (Harris-Benedict):
TMB (Taxa Metabólica Basal): ${calc.tmb} kcal/dia
TDEE (Gasto Total com Actividade + Trabalho): ${calc.tdee} kcal/dia
Calorias alvo: ${calc.targetKcal} kcal/dia (${deltaLabel})
Proteína alvo: ${calc.targetProtein} g/dia

TAREFA: Gera um plano completo e personalizado para ${p.name}.
Usa APENAS os alimentos disponíveis: ${foods}.

Devolve EXACTAMENTE este JSON (texto em Português de Moçambique):

{
  "user_goal_summary": "Resumo personalizado de 2-3 frases sobre a situação e objectivo de ${p.name}",
  "weekly_calories": ${calc.targetKcal},
  "daily_protein_g": ${calc.targetProtein},
  "weekly_menu": {
    "Segunda": [
      { "name": "Matabicho", "time": "07:00", "emoji": "🌅", "items": ["item 1", "item 2", "item 3"], "tip": "dica" },
      { "name": "Almoço",    "time": "13:00", "emoji": "🍽️", "items": ["item 1", "item 2", "item 3"], "tip": "dica" },
      { "name": "Lanche",    "time": "16:30", "emoji": "🥜", "items": ["item 1", "item 2"],            "tip": "dica" },
      { "name": "Jantar",    "time": "20:00", "emoji": "🌙", "items": ["item 1", "item 2", "item 3"], "tip": "dica" }
    ],
    "Terça":   [ ...4 refeições com o mesmo formato... ],
    "Quarta":  [ ...4 refeições... ],
    "Quinta":  [ ...4 refeições... ],
    "Sexta":   [ ...4 refeições... ],
    "Sábado":  [ ...4 refeições... ],
    "Domingo": [ ...4 refeições... ]
  },
  "supplements": [
    { "name": "Creatina", "dose": "5g/dia", "timing": "Após treino", "reason": "Aumenta força", "emoji": "💊", "priority": "essencial" },
    { "name": "...", "dose": "...", "timing": "...", "reason": "...", "emoji": "💊", "priority": "essencial" },
    { "name": "...", "dose": "...", "timing": "...", "reason": "...", "emoji": "🌿", "priority": "recomendado" },
    { "name": "...", "dose": "...", "timing": "...", "reason": "...", "emoji": "💊", "priority": "opcional" }
  ],
  "daily_routine": {
    "wake_time": "06:00",
    "sleep_time": "22:30",
    "schedule": [
      { "time": "06:00", "activity": "Acordar e hidratar", "emoji": "⏰", "tip": "Bebe 500ml de água" },
      ...mais 5-7 entradas cobrindo o dia...
    ]
  },
  "avoid_list": [
    { "category": "alimento",      "item": "...", "reason": "...", "emoji": "🍔" },
    { "category": "alimento",      "item": "...", "reason": "...", "emoji": "🥤" },
    { "category": "habito",        "item": "...", "reason": "...", "emoji": "📵" },
    { "category": "comportamento", "item": "...", "reason": "...", "emoji": "🧠" }
  ],
  "training_plan": [
    { "day": "Segunda", "focus": "Peito e Tríceps",
      "exercises": [
        { "name": "Flexões", "sets": 4, "reps": "10-15", "rest": "60s", "tip": "dica" },
        { "name": "...", "sets": 3, "reps": "...", "rest": "...", "tip": "..." },
        { "name": "...", "sets": 3, "reps": "...", "rest": "...", "tip": "..." }
      ]
    },
    ...total de ${p.training_days} dias de treino...
  ],
  "coach_message": "Mensagem motivadora e personalizada para ${p.name} do teu coach IA — menciona o objectivo específico e encoraja a acção imediata"
}

REGRAS OBRIGATÓRIAS:
- weekly_menu: exactamente 5 refeições × 7 dias = 35 entradas
- training_plan: exactamente ${p.training_days} dias (escolhe os melhores dias da semana)
- avoid_list: mínimo 2 itens por categoria (alimento, habito, comportamento)
- supplements: mínimo 2 essencial, 2 recomendado, 1 opcional
- daily_routine.schedule: 8-12 entradas de 06:00 até ao sono
- Usa APENAS: ${foods}
- weekly_calories deve ser ${calc.targetKcal} e daily_protein_g deve ser ${calc.targetProtein}
- Cada refeição deve atingir a proteína diária quando somada (${calc.targetProtein}g total)`;
}
