import test from "node:test";
import assert from "node:assert/strict";
import { modelRequest } from "../services/modelClient.js";
const settings = { aiBaseUrl:"https://api.deepseek.com", aiApiKey:"test-only", aiModel:"deepseek-v4-flash", aiReasoningEffort:"medium", aiTimeoutMs:1000 };
test("模型不存在先查询同一DeepSeek模型列表，不替换模型或降级接口", async () => {
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({url,options});
    return requests.length === 1
      ? {ok:false,status:404,json:async()=>({error:{code:"model_not_found"}})}
      : {ok:true,status:200,json:async()=>({data:[{id:"another-deployment"}]})};
  };
  try {
    await assert.rejects(()=>modelRequest({messages:[{role:"user",content:"Hello"}]},{settings}),/another-deployment.*配置未自动更改/);
    assert.deepEqual(requests.map(x=>x.url),[settings.aiBaseUrl+"/responses",settings.aiBaseUrl+"/models"]);
    const body = JSON.parse(requests[0].options.body);
    assert.equal(body.model,"deepseek-v4-flash");
    assert.equal(body.reasoning.effort,"medium");
    assert.equal(settings.aiModel,"deepseek-v4-flash");
  } finally {globalThis.fetch=original;}
});

test("指定工具请求关闭推理以兼容DeepSeek", async () => {
  const original = globalThis.fetch;
  let body;
  globalThis.fetch = async (_url, options) => {
    body = JSON.parse(options.body);
    return {ok:true,status:200,json:async()=>({output:[]})};
  };
  try {
    await modelRequest({messages:[{role:"user",content:"你好"}],tool_choice:{type:"function",function:{name:"dining_turn"}}},{settings});
    assert.equal(body.reasoning.effort,"none");
    assert.deepEqual(body.tool_choice,{type:"function",name:"dining_turn"});
  } finally {globalThis.fetch=original;}
});
