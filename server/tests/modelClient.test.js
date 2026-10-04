import test from "node:test";
import assert from "node:assert/strict";
import { modelRequest } from "../services/modelClient.js";
const settings = { aiBaseUrl:"https://test-openai-allunion-eastus2.services.ai.azure.com/openai/v1", aiApiKey:"test-only", aiModel:"gpt-6-luna", aiReasoningEffort:"medium", aiTimeoutMs:1000 };
test("模型不存在先查询同一Azure模型列表，不替换模型或降级接口", async () => {
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
    assert.equal(body.model,"gpt-6-luna");
    assert.equal(body.reasoning.effort,"medium");
    assert.equal(settings.aiModel,"gpt-6-luna");
  } finally {globalThis.fetch=original;}
});
