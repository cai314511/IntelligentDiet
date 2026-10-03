import fs from "fs";
import path from "path";
import { config } from "./config.js";

const menuPath = path.join(config.userDataDir, "menu_catalog.csv");
const operationsPath = path.join(config.userDataDir, "operations_seed.json");

function parseCsv(source) {
  const rows = [];
  let row = [],
    field = "",
    quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted && char === '"' && source[i + 1] === '"') {
      field += '"';
      i++;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else field += char;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows.shift();
  return rows.map((values) =>
    Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""])),
  );
}

const restaurants = [
  [
    "cufe",
    "学院南路校区",
    "地下民族食堂",
    "清真风味",
    "清真餐饮与地方风味窗口",
  ],
  ["cufe", "沙河校区", "东区三层食堂", "风味餐厅", "多地区风味与特色餐品"],
  ["cufe", "沙河校区", "东区食堂", "学生餐厅", "大众餐饮与自选菜品"],
  ["cufe", "沙河校区", "西区食堂", "学生餐厅", "主食、热菜及风味档口"],
  ["tju", "卫津路校区", "梅园餐厅", "学生餐厅", "大众餐饮、面点与特色菜品"],
  ["tju", "北洋园校区", "棠园餐厅", "学生餐厅", "大众餐饮与地方风味窗口"],
  ["tju", "北洋园校区", "菊园餐厅", "学生餐厅", "大众餐饮、轻食与健身餐"],
  ["tju", "卫津路校区", "学一食堂", "学生餐厅", "日常主副食与风味窗口"],
  ["bjfu", "东区", "学一食堂", "学生餐厅", "智慧自选、铁板饭与特色主食"],
  ["bjfu", "东区", "学二食堂", "学生餐厅", "多风味档口与日常餐食"],
  ["bjfu", "东区", "清真食堂", "清真风味", "清真餐食与地方风味"],
  ["bjfu", "东区", "禾园餐厅", "学生餐厅", "日常主副食与简餐"],
  ["bjfu", "东区", "烘焙坊", "烘焙甜品", "面包、蛋糕与酥点"],
];

const activities = [
  [
    "cufe",
    "首届文创设计大赛",
    "围绕财经特色校园文化开展作品征集与评审，获奖作品涵盖入学文创、校园文具、校园风物与数字互动等方向。",
    "校园文化",
    "学院南路校区",
    "2026-04-27",
    "2026-06-12",
    "宣传部、文化与传媒学院",
    "https://xcb.cufe.edu.cn/info/1019/1629.htm",
  ],
  [
    "tju",
    "2026年秋季社团文化节",
    "卫津路校区与北洋园校区设有社团纳新、互动体验与文艺展演，覆盖学术科技、文化艺术与体育竞技。",
    "校园活动",
    "卫津路校区、北洋园校区",
    "2026-09-19",
    "2026-09-19",
    "天津大学新闻网、校团委",
    "https://news.tju.edu.cn/info/1003/613539.htm",
  ],
  [
    "bjfu",
    "2026年毕业季·林家大集",
    "毕业季系列活动融入跳蚤市场与校友文化区，校园景观和打卡点由学生参与设计。",
    "校园文化",
    "北京林业大学校园",
    "2026-06-01",
    "2026-06-11",
    "国家林业和草原局",
    "https://www.forestry.gov.cn/c/www/lcdt/676129.jhtml",
  ],
  [
    "cufe",
    "中财校园文化与文创展",
    "集中展示校园文化主题的学生设计作品，包括四季校园、龙马意象、校园风物与文具等创作方向。",
    "文创展览",
    "校园文化空间",
    "2026-06-10",
    "2026-06-12",
    "中央财经大学宣传部",
    "https://xcb.cufe.edu.cn/info/1019/1629.htm",
  ],
  [
    "tju",
    "月满北洋·校园月饼文化",
    "以北洋校园地标与学校标识为设计灵感，呈现五仁、黑芝麻、莲蓉蛋黄等传统口味及节令礼盒。",
    "饮食文化",
    "卫津路校区、北洋园校区",
    "2025-09-01",
    "2025-10-06",
    "天津大学",
    "https://www.tju.edu.cn/info/1026/8505.htm",
  ],
];

const culturalItems = [
  [
    "cufe",
    "龙马时藏——中财文创文具",
    "文具设计",
    "以“龙马担乾坤”校园意象为灵感的文创作品展示。",
    28,
    "中央财经大学文创设计大赛作品公示",
    "https://xcb.cufe.edu.cn/info/1019/1629.htm",
  ],
  [
    "cufe",
    "四季中财·逐光而行",
    "校园纪念",
    "以校园四季与入学记忆为主题的文创系列设计。",
    39,
    "中央财经大学文创设计大赛作品公示",
    "https://xcb.cufe.edu.cn/info/1019/1629.htm",
  ],
  [
    "cufe",
    "中财校园风物笔记本",
    "文具设计",
    "收录校园风物主题的设计灵感与随笔空间。",
    22,
    "中央财经大学文创设计大赛作品公示",
    "https://xcb.cufe.edu.cn/info/1019/1629.htm",
  ],
  [
    "tju",
    "月满北洋主题月饼礼盒",
    "节令美食",
    "以校徽、校训与北洋纪念亭等元素呈现校园节令礼盒。",
    68,
    "天津大学文创月饼报道",
    "https://www.tju.edu.cn/info/1026/8505.htm",
  ],
  [
    "tju",
    "飨月天大书签礼盒",
    "节令纪念",
    "以校园景观为主题的节令礼盒设计，包含北洋园林意象。",
    58,
    "天津大学文创月饼报道",
    "https://www.tju.edu.cn/info/1026/8505.htm",
  ],
  [
    "bjfu",
    "四季北林植物观察手账",
    "自然主题",
    "以校园植物观察、季节记录与自然笔记为主题的校园生活文创。",
    32,
    "北京林业大学校园与毕业季文化报道",
    "https://www.forestry.gov.cn/c/www/lcdt/676129.jhtml",
  ],
  [
    "bjfu",
    "林家大集纪念明信片",
    "校园纪念",
    "以毕业季校园景观与市集记忆为主题的纪念设计。",
    16,
    "北京林业大学2026年毕业季报道",
    "https://www.forestry.gov.cn/c/www/lcdt/676129.jhtml",
  ],
];

const recipeTemplates = [
  [
    "均衡午餐组合",
    "均衡搭配",
    "主食、蛋白质菜品和蔬菜搭配，适合日常午餐。",
    ["饭", "鸡", "蛋", "肉", "鱼"],
    ["蔬菜", "青菜", "豆腐", "木耳"],
  ],
  [
    "轻食高蛋白组合",
    "轻食",
    "优先选择含蛋白质的菜品，并搭配蔬菜与主食。",
    ["鸡", "虾", "鱼", "牛", "豆腐"],
    ["沙拉", "蔬菜", "青菜", "菌菇"],
  ],
  [
    "主食与热汤组合",
    "日常均衡",
    "热汤或汤品搭配主食与一份蔬菜，按食量调整份量。",
    ["汤", "粥", "面", "饭"],
    ["青菜", "蔬菜", "豆腐", "菌菇"],
  ],
];

export function seedReferenceData(database, { refreshMenu = false } = {}) {
  const insertRestaurant = database.prepare(`INSERT OR IGNORE INTO restaurants
    (school_id,campus,name,category,description,opening_hours,queue_minutes,queue_count,total_seats,available_seats)
    VALUES(?,?,?,?,?,'06:50-21:30',?,?,?,?)`);
  const insertSeat = database.prepare(
    "INSERT OR IGNORE INTO restaurant_seats(restaurant_id,seat_label,seat_type) VALUES(?,?,?)",
  );
  const addRestaurant = database.transaction(() => {
    for (const [schoolId, campus, name, category, description] of restaurants) {
      insertRestaurant.run(
        schoolId,
        campus,
        name,
        category,
        description,
        4 + ((name.length * 3) % 13),
        14 + ((campus.length * 5) % 38),
        120,
        36 + ((name.length * 7) % 65),
      );
      const restaurant = database
        .prepare(
          "SELECT id FROM restaurants WHERE school_id=? AND campus=? AND name=?",
        )
        .get(schoolId, campus, name);
      const existing = database
        .prepare(
          "SELECT COUNT(*) AS count FROM restaurant_seats WHERE restaurant_id=?",
        )
        .get(restaurant.id).count;
      if (!existing)
        for (let i = 1; i <= 24; i++)
          insertSeat.run(
            restaurant.id,
            `${String.fromCharCode(64 + Math.ceil(i / 12))}-${String(i).padStart(2, "0")}`,
            i % 5 === 0 ? "4人座" : "2人座",
          );
    }
  });
  addRestaurant();

  const addActivity = database.prepare(`INSERT OR IGNORE INTO activities
    (school_id,title,description,category,campus,starts_at,ends_at,location,source_name,source_url,status,capacity)
    VALUES(?,?,?,?,?,?,?,?,?,?,'published',0)`);
  for (const [
    schoolId,
    title,
    description,
    category,
    campus,
    starts,
    ends,
    sourceName,
    sourceUrl,
  ] of activities) {
    addActivity.run(
      schoolId,
      title,
      description,
      category,
      campus,
      starts,
      ends,
      campus,
      sourceName,
      sourceUrl,
    );
  }

  const addCulture = database.prepare(`INSERT OR IGNORE INTO cultural_items
    (school_id,title,category,description,price,image,campus,source_name,source_url)
    VALUES(?,?,?,?,?,'','',?,?)`);
  for (const [
    schoolId,
    title,
    category,
    description,
    price,
    sourceName,
    sourceUrl,
  ] of culturalItems) {
    addCulture.run(
      schoolId,
      title,
      category,
      description,
      price,
      sourceName,
      sourceUrl,
    );
  }

  if (fs.existsSync(operationsPath)) {
    const operationRows = JSON.parse(fs.readFileSync(operationsPath, "utf8"));
    const addOperation =
      database.prepare(`INSERT OR IGNORE INTO operations_records(school_id,type,title,payload_json,status)
      VALUES(?,?,?,?,?)`);
    const seedOperations = database.transaction(() => {
      for (const row of operationRows)
        addOperation.run(
          row.schoolId,
          row.type,
          row.title,
          JSON.stringify(row.payload),
          row.status || "运行中",
        );
    });
    seedOperations();
  }

  const rows = fs.existsSync(menuPath)
    ? parseCsv(fs.readFileSync(menuPath, "utf8"))
    : [];
  for (const item of rows) {
    insertRestaurant.run(
      item.school_id,
      item.campus,
      item.restaurant,
      "学生餐厅",
      "校园餐饮窗口",
      8,
      20,
      24,
      24,
    );
    const r = database
      .prepare(
        "SELECT id FROM restaurants WHERE school_id=? AND campus=? AND name=?",
      )
      .get(item.school_id, item.campus, item.restaurant);
    if (
      !database
        .prepare("SELECT 1 FROM restaurant_seats WHERE restaurant_id=?")
        .get(r.id)
    )
      for (let i = 1; i <= 24; i++)
        insertSeat.run(r.id, `A-${String(i).padStart(2, "0")}`, "2人座");
  }
  const addCategory = database.prepare(
    "INSERT OR IGNORE INTO caipinfenlei(caipinfenlei) VALUES(?)",
  );
  const findDish = database.prepare(
    "SELECT id,source_key FROM caipinxinxi WHERE source_key=? OR (source_key IS NULL AND school_id=? AND caipinmingcheng=? AND campus=? AND restaurant_name=?) LIMIT 1",
  );
  const insertDish = database.prepare(`INSERT INTO caipinxinxi
    (caipinmingcheng,caipinfenlei,tupian,cailiao,guige,jiage,yingyang,yueshuxiao,pinfen,kucun,shangjia,school_id,
     ingredients_json,allergens_json,nutrition_json,portion_g,data_source,source_url,campus,restaurant_name,price_unit,
     taste_tags_json,dietary_tags_json,spice_level,source_date,source_kind,price_basis,nutrition_basis)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const updateDish =
    database.prepare(`UPDATE caipinxinxi SET caipinfenlei=?,cailiao=?,guige=?,jiage=?,yingyang=?,shangjia=?,
    ingredients_json=?,allergens_json=?,nutrition_json=?,portion_g=?,data_source=?,source_url=?,campus=?,restaurant_name=?,price_unit=?,
    taste_tags_json=?,dietary_tags_json=?,spice_level=?,source_date=?,source_kind=?,price_basis=?,nutrition_basis=?,
    tupian=CASE WHEN ?<>'' THEN ? ELSE tupian END WHERE id=?`);
  const parseList = (value) => {
    try {
      return JSON.parse(value || "[]");
    } catch {
      return [];
    }
  };
  const seedMenu = database.transaction(() => {
    for (const item of rows) {
      addCategory.run(item.category);
      const nutrition = {
        calories: Number(item.calories_kcal),
        protein: Number(item.protein_g),
        carbs: Number(item.carbs_g),
        fat: Number(item.fat_g),
        fiber: Number(item.fiber_g),
        sodium: Number(item.sodium_mg),
        basis: item.nutrition_basis,
      };
      const ingredients = parseList(item.ingredients_json || item.ingredients);
      const allergens = parseList(item.allergens_json || item.allergens);
      const tasteTags = parseList(item.taste_tags_json || item.taste_tags);
      const dietaryTags = parseList(
        item.dietary_tags_json || item.dietary_tags,
      );
      const image = item.image_url || "";
      const nutritionText = `每份约 ${nutrition.calories} kcal · 蛋白质 ${nutrition.protein}g · 碳水 ${nutrition.carbs}g · 脂肪 ${nutrition.fat}g`;
      const availability = item.availability === "下架" ? "否" : "是";
      const values = [
        item.category,
        ingredients.join("，"),
        item.portion_label,
        Number(item.price),
        nutritionText,
        availability,
        JSON.stringify(ingredients),
        JSON.stringify(allergens),
        JSON.stringify(nutrition),
        Number(item.portion_g),
        item.source_name,
        item.source_url,
        item.campus,
        item.restaurant,
        item.price_unit || "元/份",
        JSON.stringify(tasteTags),
        JSON.stringify(dietaryTags),
        item.spice_level,
        item.source_date,
        item.source_kind,
        item.price_basis,
        item.nutrition_basis,
        image,
        image,
      ];
      const sourceKey = JSON.stringify([
        item.school_id,
        item.campus,
        item.restaurant,
        item.dish_name,
      ]);
      const existing = findDish.get(
        sourceKey,
        item.school_id,
        item.dish_name,
        item.campus,
        item.restaurant,
      );
      if (existing) {
        if (refreshMenu) updateDish.run(...values, existing.id);
        database
          .prepare("UPDATE caipinxinxi SET source_key=? WHERE id=?")
          .run(sourceKey, existing.id);
      } else {
        const added = insertDish.run(
          item.dish_name,
          item.category,
          image,
          values[1],
          values[2],
          values[3],
          values[4],
          0,
          0,
          50,
          availability,
          item.school_id,
          values[6],
          values[7],
          values[8],
          values[9],
          values[10],
          values[11],
          values[12],
          values[13],
          values[14],
          values[15],
          values[16],
          values[17],
          values[18],
          values[19],
          values[20],
          values[21],
        );
        database
          .prepare("UPDATE caipinxinxi SET source_key=? WHERE id=?")
          .run(sourceKey, added.lastInsertRowid);
      }
    }
  });
  if (rows.length) seedMenu();
  console.log(`✓ 已载入 ${rows.length} 条校园菜单记录`);
  const addRecipe =
    database.prepare(`INSERT OR IGNORE INTO recipes(school_id,title,goal,description,dish_ids_json,tips_json)
    VALUES(?,?,?,?,?,?)`);
  const schools = database.prepare("SELECT id,name FROM universities").all();
  for (const school of schools) {
    const dishes = database
      .prepare(
        `SELECT id,caipinmingcheng AS name,cailiao AS ingredients,caipinfenlei AS category
      FROM caipinxinxi WHERE school_id=? AND shangjia='是' ORDER BY id`,
      )
      .all(school.id);
    for (const [
      title,
      goal,
      description,
      preferredA,
      preferredB,
    ] of recipeTemplates) {
      const choose = (keywords) =>
        dishes.find((d) =>
          keywords.some((word) =>
            `${d.name} ${d.ingredients} ${d.category}`.includes(word),
          ),
        );
      const selected = [
        choose(preferredA),
        choose(preferredB),
        dishes.find(
          (d) =>
            ![choose(preferredA)?.id, choose(preferredB)?.id].includes(d.id),
        ),
      ].filter(Boolean);
      const ids = [...new Set(selected.map((d) => d.id))].slice(0, 3);
      if (ids.length)
        addRecipe.run(
          school.id,
          `${school.name}${title}`,
          goal,
          description,
          JSON.stringify(ids),
          JSON.stringify([
            "按个人食量调整主食份量。",
            "下单前查看菜品食材与过敏原信息。",
          ]),
        );
    }
  }
}
