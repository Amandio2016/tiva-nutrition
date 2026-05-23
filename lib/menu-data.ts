export type Meal = {
  name: string;
  time: string; // HH:MM
  emoji: string;
  items: string[];
  tip: string;
  notificationTime: number; // minutes before meal
};

export type DayMenu = {
  day: string;
  dayShort: string;
  dayIndex: number; // 0 = Monday
  mainProtein: string;
  meals: Meal[];
};

export type NightAlert = {
  time: string; // HH:MM
  days: number[]; // day indices (0=Mon, 6=Sun), empty = every day
  message: string;
  emoji: string;
};

const BASE_LUNCH_DINNER_ITEMS = (protein: string): string[] => [
  protein,
  "Arroz branco ou xima",
  "Feijão cozido (manteiga ou feijão nhemba)",
  "Legumes salteados (couve, cenoura, tomate ou abóbora)",
];

export const weeklyMenu: DayMenu[] = [
  {
    day: "Segunda-feira",
    dayShort: "Seg",
    dayIndex: 0,
    mainProtein: "Frango guizado",
    meals: [
      {
        name: "Matabicho",
        time: "06:30",
        emoji: "🌅",
        items: [
          "Somo de malamba com leite (300 ml)",
          "2 ovos cozidos ou mexidos",
          "1 banana ou manga",
          "Creatina 5 g (misturar no somo)",
        ],
        tip: "Toma a creatina sempre a esta hora para consistência. O somo dá carboidratos rápidos para o treino matinal.",
        notificationTime: 15,
      },
      {
        name: "Lanche da Manhã",
        time: "10:00",
        emoji: "🍌",
        items: [
          "1 fruta da época (banana, manga ou papaia)",
          "Punhado de amendoim (30–40 g)",
        ],
        tip: "O amendoim dá gordura saudável e proteína que mantém a saciedade até ao almoço.",
        notificationTime: 10,
      },
      {
        name: "Almoço",
        time: "12:30",
        emoji: "🍽️",
        items: BASE_LUNCH_DINNER_ITEMS("Frango guizado (150–200 g, sem pele)"),
        tip: "Guiza o frango com tomate, cebola e alho — sem óleo em excesso. Pesa a proteína crua para controlar melhor.",
        notificationTime: 20,
      },
      {
        name: "Jantar",
        time: "19:30",
        emoji: "🌙",
        items: BASE_LUNCH_DINNER_ITEMS("Frango guizado (sobras do almoço, 120–150 g)"),
        tip: "Reduz a porção de arroz/xima ao jantar e aumenta os legumes para digestão mais fácil antes de dormir.",
        notificationTime: 20,
      },
      {
        name: "Snack Noturno",
        time: "21:00",
        emoji: "🥚",
        items: [
          "1 ovo cozido",
          "1 fruta pequena (banana ou laranja)",
        ],
        tip: "O ovo ao deitar fornece proteína de digestão lenta para recuperação muscular durante o sono.",
        notificationTime: 10,
      },
    ],
  },
  {
    day: "Terça-feira",
    dayShort: "Ter",
    dayIndex: 1,
    mainProtein: "Atum em lata",
    meals: [
      {
        name: "Matabicho",
        time: "06:30",
        emoji: "🌅",
        items: [
          "Somo de malamba com leite (300 ml)",
          "2 ovos cozidos ou mexidos",
          "1 banana ou papaia",
          "Creatina 5 g (misturar no somo)",
        ],
        tip: "Alterna entre ovo cozido e mexido para não enjoar. O somo de malamba é rico em potássio.",
        notificationTime: 15,
      },
      {
        name: "Lanche da Manhã",
        time: "10:00",
        emoji: "🍌",
        items: [
          "1 fruta da época",
          "Punhado de amendoim (30–40 g)",
        ],
        tip: "Mastigar bem o amendoim ajuda na absorção das gorduras saudáveis.",
        notificationTime: 10,
      },
      {
        name: "Almoço",
        time: "12:30",
        emoji: "🐟",
        items: BASE_LUNCH_DINNER_ITEMS("Atum em lata ao natural (1 lata = ~170 g, escorre bem)"),
        tip: "Prefere atum ao natural em vez de atum em óleo. Mistura com tomate e cebola picada para mais sabor.",
        notificationTime: 20,
      },
      {
        name: "Jantar",
        time: "19:30",
        emoji: "🌙",
        items: BASE_LUNCH_DINNER_ITEMS("Atum em lata (½ lata) com ovo cozido (1 ovo)"),
        tip: "Combinar atum com ovo no jantar garante aminoácidos completos para recuperação noturna.",
        notificationTime: 20,
      },
      {
        name: "Snack Noturno",
        time: "21:00",
        emoji: "🥚",
        items: [
          "1 ovo cozido",
          "Somo de malamba (200 ml, sem açúcar adicional)",
        ],
        tip: "Somo natural sem açúcar adicionado. Se tiveres proteína em pó, é o momento ideal.",
        notificationTime: 10,
      },
    ],
  },
  {
    day: "Quarta-feira",
    dayShort: "Qua",
    dayIndex: 2,
    mainProtein: "Frango assado",
    meals: [
      {
        name: "Matabicho",
        time: "06:30",
        emoji: "🌅",
        items: [
          "Somo de malamba com leite (300 ml)",
          "2 ovos mexidos",
          "1 manga ou banana",
          "Creatina 5 g (misturar no somo)",
        ],
        tip: "A manga é rica em vitamina C que ajuda na absorção do ferro da carne. Boa escolha a meio da semana.",
        notificationTime: 15,
      },
      {
        name: "Lanche da Manhã",
        time: "10:00",
        emoji: "🥜",
        items: [
          "1 fruta da época",
          "Punhado de amendoim (30–40 g)",
        ],
        tip: "Se tiveres amendoim torrado em casa, é mais saboroso e sem sal em excesso.",
        notificationTime: 10,
      },
      {
        name: "Almoço",
        time: "12:30",
        emoji: "🍗",
        items: BASE_LUNCH_DINNER_ITEMS("Frango assado (150–200 g, coxa ou peito, sem pele)"),
        tip: "Assa com limão, alho e piri-piri. Sem fritura — o forno conserva mais proteína e tem menos gordura.",
        notificationTime: 20,
      },
      {
        name: "Jantar",
        time: "19:30",
        emoji: "🌙",
        items: BASE_LUNCH_DINNER_ITEMS("Frango assado (sobras, 120–150 g)"),
        tip: "Guarda sempre uma porção extra ao assar. Poupa tempo e garante refeição pronta ao jantar.",
        notificationTime: 20,
      },
      {
        name: "Snack Noturno",
        time: "21:00",
        emoji: "🥚",
        items: [
          "1 ovo cozido",
          "1 fruta pequena",
        ],
        tip: "Hidrata bem antes de dormir. A água é essencial para síntese proteica.",
        notificationTime: 10,
      },
    ],
  },
  {
    day: "Quinta-feira",
    dayShort: "Qui",
    dayIndex: 3,
    mainProtein: "Peixe fresco (carapau ou tilápia)",
    meals: [
      {
        name: "Matabicho",
        time: "06:30",
        emoji: "🌅",
        items: [
          "Somo de malamba com leite (300 ml)",
          "2 ovos cozidos",
          "1 banana",
          "Creatina 5 g (misturar no somo)",
        ],
        tip: "Quinta é um ótimo dia para dia de treino pesado — o peixe fresco dá ómega-3 para recuperação articular.",
        notificationTime: 15,
      },
      {
        name: "Lanche da Manhã",
        time: "10:00",
        emoji: "🍌",
        items: [
          "1 fruta da época",
          "Punhado de amendoim (30–40 g)",
        ],
        tip: "Se possível, adiciona uma fatia de pão de trigo integral para carboidratos extras num dia de treino.",
        notificationTime: 10,
      },
      {
        name: "Almoço",
        time: "12:30",
        emoji: "🐠",
        items: BASE_LUNCH_DINNER_ITEMS("Carapau ou tilápia grelhado/cozido (150–200 g)"),
        tip: "Carapau é mais económico e rico em ómega-3. Grelha com limão e sal grosso — sem muito óleo.",
        notificationTime: 20,
      },
      {
        name: "Jantar",
        time: "19:30",
        emoji: "🌙",
        items: BASE_LUNCH_DINNER_ITEMS("Peixe fresco (sobras ou segunda postura, 120–150 g)"),
        tip: "O peixe fresco tem proteína de alta qualidade e é mais leve para digestão noturna do que a carne vermelha.",
        notificationTime: 20,
      },
      {
        name: "Snack Noturno",
        time: "21:00",
        emoji: "🥚",
        items: [
          "1 ovo cozido",
          "1 fruta pequena (laranja ou banana)",
        ],
        tip: "A laranja tem vitamina C que melhora absorção de ferro. Boa combinação com peixe ao longo do dia.",
        notificationTime: 10,
      },
    ],
  },
  {
    day: "Sexta-feira",
    dayShort: "Sex",
    dayIndex: 4,
    mainProtein: "Frango guizado + ovos extra",
    meals: [
      {
        name: "Matabicho",
        time: "06:30",
        emoji: "🌅",
        items: [
          "Somo de malamba com leite (300 ml)",
          "3 ovos cozidos ou mexidos (extra proteína!)",
          "1 banana ou manga",
          "Creatina 5 g (misturar no somo)",
        ],
        tip: "Sexta é dia de mais proteína no matabicho — 3 ovos para suportar o treino do fim de semana. Carrega bem!",
        notificationTime: 15,
      },
      {
        name: "Lanche da Manhã",
        time: "10:00",
        emoji: "🥜",
        items: [
          "1 fruta da época",
          "Punhado de amendoim (40–50 g, porção maior)",
        ],
        tip: "Aumenta ligeiramente o amendoim na sexta para energia extra antes do fim de semana ativo.",
        notificationTime: 10,
      },
      {
        name: "Almoço",
        time: "12:30",
        emoji: "🍗",
        items: BASE_LUNCH_DINNER_ITEMS("Frango guizado (150–200 g, com molho rico em tomate e cebola)"),
        tip: "Cozinha quantidade dupla ao almoço de sexta para ter jantar pronto e reduzir stress ao fim do dia.",
        notificationTime: 20,
      },
      {
        name: "Jantar",
        time: "19:30",
        emoji: "🌙",
        items: BASE_LUNCH_DINNER_ITEMS("Frango guizado (sobras) + 1 ovo cozido extra"),
        tip: "O ovo extra no jantar de sexta compensa o desgaste da semana e prepara os músculos para o fim de semana.",
        notificationTime: 20,
      },
      {
        name: "Snack Noturno",
        time: "21:00",
        emoji: "🥚",
        items: [
          "1 ovo cozido",
          "Somo de malamba (200 ml)",
        ],
        tip: "Descansa bem esta noite — o sono é quando os músculos crescem. Evita ecrãs após as 22h.",
        notificationTime: 10,
      },
    ],
  },
  {
    day: "Sábado",
    dayShort: "Sáb",
    dayIndex: 5,
    mainProtein: "Carne de vaca ou camarão (dia especial)",
    meals: [
      {
        name: "Matabicho",
        time: "06:30",
        emoji: "🌅",
        items: [
          "Somo de malamba com leite (300 ml)",
          "2 ovos cozidos ou mexidos",
          "1 fruta grande (papaia ou manga)",
          "Creatina 5 g (misturar no somo)",
        ],
        tip: "Sábado é dia especial! Relaxa a refeição mas mantém a creatina — a consistência diária é o que funciona.",
        notificationTime: 15,
      },
      {
        name: "Lanche da Manhã",
        time: "10:00",
        emoji: "🍌",
        items: [
          "1 fruta da época",
          "Punhado de amendoim (30–40 g)",
        ],
        tip: "Mantém o lanche mesmo no fim de semana. A rotina alimentar não tira folga aos sábados.",
        notificationTime: 10,
      },
      {
        name: "Almoço",
        time: "12:30",
        emoji: "🥩",
        items: BASE_LUNCH_DINNER_ITEMS("Carne de vaca guizada ou camarão salteado (150–200 g)"),
        tip: "A carne de vaca dá creatina e ferro naturais. Camarão é mais magro e rico em zinco — bom para testosterona.",
        notificationTime: 20,
      },
      {
        name: "Jantar",
        time: "19:30",
        emoji: "🌙",
        items: BASE_LUNCH_DINNER_ITEMS("Carne de vaca ou camarão (sobras, 120–150 g)"),
        tip: "Aproveita o jantar de sábado para uma refeição mais descontraída com a família — a proteína mantém-se.",
        notificationTime: 20,
      },
      {
        name: "Snack Noturno",
        time: "21:00",
        emoji: "🥚",
        items: [
          "1 ovo cozido",
          "1 fruta à escolha",
        ],
        tip: "Bebe 500 ml de água antes de dormir. A hidratação é essencial para ganho muscular.",
        notificationTime: 10,
      },
    ],
  },
  {
    day: "Domingo",
    dayShort: "Dom",
    dayIndex: 6,
    mainProtein: "Frango assado (cozinha extra para Segunda)",
    meals: [
      {
        name: "Matabicho",
        time: "06:30",
        emoji: "🌅",
        items: [
          "Somo de malamba com leite (300 ml)",
          "2 ovos cozidos",
          "1 banana ou papaia",
          "Creatina 5 g (misturar no somo)",
        ],
        tip: "Domingo é dia de preparação! Após o matabicho, planeia as compras e a cozinha da semana.",
        notificationTime: 15,
      },
      {
        name: "Lanche da Manhã",
        time: "10:00",
        emoji: "🥜",
        items: [
          "1 fruta da época",
          "Punhado de amendoim (30–40 g)",
        ],
        tip: "Aproveita para comprar amendoim a granel — é mais económico e dura toda a semana.",
        notificationTime: 10,
      },
      {
        name: "Almoço",
        time: "12:30",
        emoji: "🍗",
        items: [
          "Frango assado (150–200 g para hoje)",
          "EXTRA: 300–400 g de frango adicional para Segunda-feira",
          "Arroz branco ou xima (cozinha dobro — guarda metade para Segunda)",
          "Feijão cozido",
          "Legumes salteados",
        ],
        tip: "Assa 1 frango inteiro hoje! Come metade agora e guarda o resto em marmita para Segunda. Poupa tempo e dinheiro.",
        notificationTime: 20,
      },
      {
        name: "Jantar",
        time: "19:30",
        emoji: "🌙",
        items: BASE_LUNCH_DINNER_ITEMS("Frango assado (sobras de hoje, 120–150 g)"),
        tip: "Verifica o stock: ovos, amendoim, feijão, arroz, frutas. Faz lista de compras para segunda-feira.",
        notificationTime: 20,
      },
      {
        name: "Snack Noturno",
        time: "21:00",
        emoji: "🥚",
        items: [
          "1 ovo cozido",
          "Somo de malamba (200 ml)",
        ],
        tip: "Prepara tudo para Segunda: marmita pronta, somo preparado, creatina medida. Amanhã começa forte!",
        notificationTime: 10,
      },
    ],
  },
];

export const nightAlerts: NightAlert[] = [
  {
    time: "20:00",
    days: [], // empty = every day
    message: "Prepara a marmita para amanhã!",
    emoji: "🥡",
  },
  {
    time: "21:30",
    days: [6], // Sunday only
    message: "Cozinha extra de arroz e frango para Segunda e Terça!",
    emoji: "🍚",
  },
];

export const dailyCreatineGoal = 5; // grams

export const weeklyStats = {
  totalMealsPerDay: 5,
  targetProteinPerDay: "120–150 g",
  targetCaloriesPerDay: "2400–2800 kcal",
  waterGoalLiters: 3,
  creatineDailyGrams: dailyCreatineGoal,
};
