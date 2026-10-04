import { config } from "../config.js";

function responseInput(messages) {
  return messages.flatMap(message => {
    if (message.responseItems) return message.responseItems;
    if (message.role === "tool") return [{ type: "function_call_output", call_id: message.tool_call_id, output: message.content }];
    return [{ role: message.role, content: Array.isArray(message.content)
      ? message.content.map(item => item.type === "image_url" ? { type: "input_image", image_url: item.image_url.url } : { type: "input_text", text: item.text })
      : message.content }];
  });
}

export async function modelRequest(request, { signal, settings = config } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), settings.aiTimeoutMs);
  const requestSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${settings.aiApiKey}` };
  try {
    if (!settings.aiApiKey) throw new Error("请配置 DEEPSEEK_API_KEY");
    const body = {
      model: settings.aiModel, reasoning: { effort: typeof request.tool_choice === "object" ? "none" : settings.aiReasoningEffort || "medium" },
      input: responseInput(request.messages || []), store: false,
      ...(request.tools ? { tools: request.tools.map(tool => ({ type: "function", ...tool.function, strict: false })) } : {}),
      ...(request.tool_choice ? { tool_choice: typeof request.tool_choice === "string" ? request.tool_choice : { type: "function", name: request.tool_choice.function.name } } : {}),
    };
    const response = await fetch(`${settings.aiBaseUrl}/responses`, { method: "POST", signal: requestSignal, headers, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok) {
      const missing = response.status === 404 || /model_not_found|deployment.*not.*found|model.*not.*exist/i.test(JSON.stringify(payload.error || {}));
      if (missing) {
        let models;
        try {
          const listed = await fetch(`${settings.aiBaseUrl}/models`, { signal: requestSignal, headers });
          const result = await listed.json();
          models = listed.ok ? (result.data || []).map(model => model.id).filter(Boolean).join("、") || "列表为空" : `模型列表查询失败（${listed.status}）`;
        } catch { models = "模型列表查询失败"; }
        throw Object.assign(new Error(`DeepSeek 未找到 ${settings.aiModel}。可用模型：${models}。配置未自动更改。`), { status: 502 });
      }
      throw Object.assign(new Error(`DeepSeek 模型请求失败（${response.status}）`), { status: 502 });
    }
    if (payload.status === "incomplete" || payload.error) throw new Error("模型回复未完成，请重试");
    const output = payload.output || [];
    const message = {
      role: "assistant", responseItems: output,
      content: output.filter(item => item.type === "message").flatMap(item => item.content || []).filter(item => item.type === "output_text").map(item => item.text).join("\n"),
      tool_calls: output.filter(item => item.type === "function_call").map(item => ({ id: item.call_id, type: "function", function: { name: item.name, arguments: item.arguments } })),
    };
    return { ok: true, status: response.status, json: async () => ({ choices: [{ message }] }) };
  } finally { clearTimeout(timer); }
}
