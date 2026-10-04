import { targetFor } from "./support/target.js";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import request from "supertest";
process.env.DB_PATH = ":memory:";
let selectedId,
  mode = "plan";
const provider = http.createServer(async (req, res) => {
  let raw = "";
  for await (const part of req) raw += part;
  const body = JSON.parse(raw);
  assert.equal(req.headers.authorization, "Bearer provider-test");
  let name, args;
  if (mode === "plan") {
    name = "prepare_meal_plan";
    args = { budget: 30, people: 2, reserve: true, exclusions: ["小麦"] };
    assert.equal(body.tool_choice.name, name);
  } else {
    name = "record_meal";
    args = {
      items: [
        { dishId: selectedId, grams: 150 },
        { dishId: 999999, grams: 300 },
      ],
    };
    assert.equal(body.input.at(-1).content[1].type, "input_image");
  }
  res.setHeader("content-type", "application/json");
  res.end(
    JSON.stringify({
      output: [{type:"function_call",call_id:"c1",name,arguments:JSON.stringify(args)}],
    }),
  );
});
await new Promise((r) => provider.listen(0, "127.0.0.1", r));
process.env.AI_BASE_URL = `http://127.0.0.1:${provider.address().port}/v1`;
process.env.AZURE_OPENAI_API_KEY = "provider-test";
process.env.AI_MODEL = "compatible-test";
const realFetch = globalThis.fetch;
globalThis.fetch = (url, options) => {
  assert.equal(url, "https://test-openai-allunion-eastus2.services.ai.azure.com/openai/v1/responses");
  const body = JSON.parse(options.body);
  assert.equal(body.model, "gpt-6-luna");
  assert.equal(body.reasoning.effort, "medium");
  return realFetch(`http://127.0.0.1:${provider.address().port}/responses`, options);
};
const { default: app } = await import("../app.js");
const target = await targetFor(app);
const { db } = await import("../database.js");
after(() => provider.close());
test("兼容模型规划调用转成真实目录方案，不直接写订单或支付", async () => {
  const login = await request(target)
    .post("/api/users/development-session")
    .timeout({ deadline: 5000 })
    .send({ schoolId: "cufe" });
  const token = login.body.data.token;
  const r = await request(target)
    .post("/api/tasks")
    .timeout({ deadline: 5000 })
    .set("Authorization", `Bearer ${token}`)
    .send({ message: "30元两个人午餐并安排座位" });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.mode, "agent");
  assert.equal(r.body.data.constraints.people, 2);
  assert.ok(r.body.data.total <= 30);
  assert.ok(r.body.data.items.every((d) => !d.allergens.includes("小麦")));
  assert.equal(db.prepare("SELECT count(*) n FROM orders").get().n, 0);
  selectedId = r.body.data.items[0].id;
  mode = "image";
  const recognized = await request(target)
    .post("/api/nutrition/recognize")
    .timeout({ deadline: 5000 })
    .set("Authorization", `Bearer ${token}`)
    .send({ image: "data:image/png;base64,YQ==" });
  assert.equal(recognized.status, 200);
  assert.equal(recognized.body.data.requiresReview, true);
  assert.deepEqual(recognized.body.data.items, [
    { dishId: selectedId, grams: 150 },
  ]);
  assert.equal(db.prepare("SELECT count(*) n FROM food_records").get().n, 0);
});
