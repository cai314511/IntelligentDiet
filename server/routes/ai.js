import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../database.js';

const router = express.Router();

// 获取 API KEY
const getApiKey = () => {
  return process.env.GEMINI_API_KEY || '';
};

// 1. 小智助理智能对话接口
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ code: 400, message: '消息内容不能为空' });
    }

    const apiKey = getApiKey();

    // 如果未配置 API Key，触发高拟真 Mock 降级
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      const responses = {
        '排队': '💡 报告同学！当前一食堂人比较多，预计需要排队 15 分钟，子衿食园和风味餐厅比较空闲哦，只要排 5 分钟，建议您错峰前往～😊',
        '食谱': '💪 收到！我已经通知我们的【AI 营养师】了。您可以在上方点击“AI 营养师”选项卡，花 1 分钟定制您专属的减脂或增肌食谱，我会根据您填写的忌口规则过滤掉雷区菜品哦！',
        '活动': '🎉 哇！我们春季寻味嘉年华正在火热进行中！有“光盘打卡挑战”和“新品试吃会”可以参加。完成打卡还可以累积后勤积分，去兑换免费饮品券呢，快去文创活动页面看看吧！🎨',
        '订单': '📋 正在帮您向后勤数据库查询订单...咦，您刚下过的一笔订单已经在后勤系统登记啦！后勤处的叔叔阿姨们正干劲满满地为您制作，一会儿生成取餐码后记得及时去窗口凭码取餐哦～',
        '座位': '🪑 根据座位传感器反馈：目前二楼轻食轻语区还有 8 个靠窗空余雅座，风味餐厅剩余座位很多，您可以点击“智能点餐”边下单边在线预订专属餐桌！'
      };

      let reply = '';

      // 推荐类提问：基于真实在售菜品库动态生成（数据驱动 mock）
      const RECOMMEND_KEYS = ['推荐', '好吃', '吃什么', '便宜', '特色', '美食'];
      if (RECOMMEND_KEYS.some(k => message.includes(k))) {
        const topDishes = db.prepare(`
          SELECT caipinmingcheng, jiage, caipinfenlei, yueshuxiao
          FROM caipinxinxi
          WHERE kucun > 0 AND shangjia = '是'
          ORDER BY yueshuxiao DESC
          LIMIT 3
        `).all();
        if (topDishes.length > 0) {
          const lines = topDishes.map((d, i) =>
            `${i + 1}. 「${d.caipinmingcheng}」¥${d.jiage}（${d.caipinfenlei}，月售 ${d.yueshuxiao}）`
          ).join('\n');
          reply = `🍽️ 收到！小智刚查了今日真实在售菜单，为你推荐：\n${lines}\n\n都是现做热乎菜，要尝尝吗？😋`;
        }
      }

      if (!reply) {
        for (const [key, value] of Object.entries(responses)) {
          if (message.includes(key)) {
            reply = value;
            break;
          }
        }
      }

      if (!reply) {
        reply = `同学你好！我是智饷食堂的 AI 助理小智。🤖\n\n【本地模拟提示：后端未检测到有效的 GEMINI_API_KEY。若要启用真实的谷歌 Gemini 智能大脑，请在 server/.env 中配置您的 API 密钥。】\n\n我可以帮您实时查询食堂排队、推荐菜品、搭配减脂餐、查看校园文创活动哦！您可以问我“一食堂排队吗”或者“最近有什么美食活动”试试看～`;
      }

      return res.json({ code: 200, reply });
    }

    // 启用真实 Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const systemInstruction = `
你是一个运行在高校智慧食堂系统（名叫“智饷”，位于中央财经大学沙河校区）中的智能AI助理，名字叫“小智”。
你的职责是解答学生关于食堂的排队情况、推荐菜品、健康饮食配比、校园文创活动等各种咨询。
你的对话风格应该：
1. 热情、有礼貌、幽默风趣，称呼对方为“同学”。
2. 回复简明扼要，控制在 150 字以内，避免过于冗长，尽量多使用 emoji（如 🍽️, 💡, 🪑, 💪, 🎉）增加亲切感。
3. 结合“智饷”食堂特色（比如：东区一楼餐厅、子衿食园、风味餐厅、龙马一餐厅、二楼轻食轻语等）。
4. 提示同学可以使用顶部的【AI 营养师】进行专业膳食评估，或者抽取高能美食盲盒。
5. 同学提问如果包含排队，告诉他一食堂拥堵（排队20分钟以上），子衿食园和风味餐厅很空（5分钟内），推荐错峰就餐。
`;

    const prompt = `${systemInstruction}\n\n当前同学的提问："${message}"\n请给出符合你人设的回复：`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const replyText = response.text();

    res.json({ code: 200, reply: replyText.trim() });

  } catch (error) {
    res.status(500).json({ code: 500, message: 'AI 服务暂时开小差了: ' + error.message });
  }
});

// 2. AI 营养师报告生成接口
router.post('/analyze-nutrition', async (req, res) => {
  try {
    const { goals = [], tastes = [], ingredients = [] } = req.body;

    // 从数据库中拉取真实的在售菜品列表，让大模型做出“有据可查”的精准推荐！
    const dishes = db.prepare(`
      SELECT id, caipinmingcheng, caipinfenlei, jiage, pinfen, yingyang, cailiao
      FROM caipinxinxi
      LIMIT 30
    `).all();

    const apiKey = getApiKey();

    // 如果未配置 API Key，触发 Mock 数据降级（返回高精度的 Markdown 点评）
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      const mockReport = `# 💡 个性化营养师膳食分析报告 (模拟模式)

> ⚠️ **本地模拟提示**：由于后端未配置 \`GEMINI_API_KEY\`，本报告由本地专家模板引擎实时渲染生成。配置后可体验大语言模型深度个性化定制报告。

## ⚖️ 宏量营养素评估
针对您选择的目标：**${goals.join('、') || '日常均衡'}**：
*   **碳水化合物**：目前评估偏高（实际摄入 55%）。建议削减精制碳水（如大碗米饭、面条），增加粗粮比重（如燕麦、黑米）。
*   **蛋白质**：目前摄入不足（实际 20%，推荐 30%）。急需增加去皮禽肉、瘦牛肉和豆制品的摄入以维持肌肉代谢。
*   **脂肪**：摄入比例极佳（实际 25%），食堂的低盐低油工艺非常符合您的脂肪控制需求。

## ✍️ AI 深度点评
*   **🌟 做得很棒的地方**：您主动规避了忌口食材（**${ingredients.join('、') || '无'}**）以及不喜好的口味（**${tastes.join('、') || '无'}**），这表明您具备非常清晰的膳食控制意识。
*   **🔧 饮食优化建议**：在规避这些雷区的同时，建议重点补充**维生素 D 和优质脂肪酸**。建议尝试食堂的蒸鱼或高蛋白沙拉。

## 🍽️ 专属食堂定制菜单推荐
根据您**拒绝口味【${tastes.join('，') || '无'}】、忌口食材【${ingredients.join('，') || '无'}】**的规则，小智从我们学校今日菜谱中为您精选了以下菜品：

1.  **减脂鸡肉沙拉** (¥6.5 / 热菜) - ⭐ 4.8
    *   *推荐理由*：高蛋白、低热量！精选去皮鸡胸肉，富含 25g 优质蛋白质，完美契合您的【${goals.join('、') || '健康就餐'}】目标。
2.  **慢烤低脂牛排** (¥22.0 / 热菜) - ⭐ 4.9
    *   *推荐理由*：含有 35g 极佳的动物蛋白与丰富血红素铁，不含任何忌口配料，烹饪过程控油极严，口感扎实，是增力增肌的绝对王者！
3.  **清炖萝卜牛腩粥** (¥8.0 / 汤品) - ⭐ 4.5
    *   *推荐理由*：如果您今天想要清淡一下，这是极好的温补选择。萝卜通气消食，牛腩软烂易吸收，热量仅 180kcal，暖胃又健康。

---
*声明：本报告由智饷食堂 AI 营养师引擎实时生成，仅供就餐参考。*`;

      return res.json({ code: 200, report: mockReport });
    }

    // 启用真实 Gemini API 进行高度个性化报告生成
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' }); // 营养分析使用推理能力更强的 pro 模型

    // 格式化今日食堂菜谱
    const dishesListStr = dishes.map(d => `- [${d.caipinfenlei}] ${d.caipinmingcheng} (ID: ${d.id}, 单价: ¥${d.jiage}, 配料: ${d.cailiao || '无'}, 营养参数: ${d.yingyang || '标准'}, 评分: ${d.pinfen}⭐)`).join('\n');

    const prompt = `
你是一位顶级的后勤营养膳食学与临床健康管理专家。
现在，有一位中央财经大学的学生向你寻求个性化的膳食评估报告。

这位学生的健康画像与忌口规则如下：
- **健康核心目标**：${goals.join('，') || '日常均衡'}
- **避雷的口味**：拒绝 ${tastes.join('，') || '无'}
- **不要的食材（绝对忌口）**：不要 ${ingredients.join('，') || '无'}

我们高校食堂今日提供的真实在售菜谱如下：
${dishesListStr}

请根据该学生的健康目标、口味喜好和【严格的忌口食材规则】，为他生成一份专业、辞藻优美、极具人文关怀的「个性化营养分析报告」。
请**严格按照以下 Markdown 格式**进行输出（你可以加入适当的 Emoji，让报告显得更有温度）：

# 💡 个性化营养师膳食分析报告

## ⚖️ 宏量营养素评估
[分析他的目标，提出合理的碳水、蛋白质、脂肪摄入比例建议。指出为什么他可能失衡，或者给出科学的就餐比例指引]

## ✍️ AI 深度点评
*   **🌟 做得很棒的地方**：[给予积极的鼓励，肯定他的健康饮食理念]
*   **🔧 饮食优化建议**：[针对他排除忌口了某些食材（比如不要${ingredients.join('，')}），指导他应该如何在食堂挑选其他安全替代品来补足微量元素。]

## 🍽️ 专属食堂定制菜单推荐
[请从上面的“我们高校食堂今日提供的真实在售菜谱”中，挑选 3 款【完全不包含他任何忌口食材】、【符合他口味】且【对实现他健康目标非常有用】的真实菜品，列成一个清单，并给出详细的推荐理由。推荐格式如下：]
1.  **[菜品名称]** (¥[价格] / [分类]) - ⭐ [评分]分
    *   *推荐理由*：[用极具感染力且专业严谨的辞藻说明为什么这款菜适合他，并注明它的卡路里/蛋白质优势]
2.  ...

---
*声明：本报告由智饷食堂 AI 营养师引擎实时生成，仅供就餐参考。*
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const reportText = response.text();

    res.json({ code: 200, report: reportText });

  } catch (error) {
    res.status(500).json({ code: 500, message: 'AI 营养师服务暂时故障: ' + error.message });
  }
});

export default router;
