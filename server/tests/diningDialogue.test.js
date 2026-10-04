import test from "node:test";
import assert from "node:assert/strict";
import { diningTurn, diningSystemPrompt } from "../services/diningDialogue.js";
const settings = { aiBaseUrl:"https://model.invalid/v1", aiApiKey:"test", aiModel:"test-model", aiTimeoutMs:1000 };
const data = { restaurants:[{id:1,name:"一食堂"}], dishes:[{id:2,name:"米饭",restaurantId:1,forSale:true}] };

test("模型主动生成开场与追问，完整条件才允许准备方案", async () => {
  const old = globalThis.fetch;
  let captured;
  let turn = { reply:"今天想来点清淡的还是热乎的？",ready:false,constraints:{} };
  globalThis.fetch = async (url, options) => {
    captured = JSON.parse(options.body);
    return {ok:true,json:async()=>({output:[{type:"function_call",call_id:"turn",name:"dining_turn",arguments:JSON.stringify(turn)}]})};
  };
  try {
    const start = await diningTurn({ message:"", data },settings);
    assert.equal(start.reply,turn.reply);
    assert.equal(start.ready,false);
    assert.equal(captured.input[0].content,diningSystemPrompt);
    turn = {reply:"我来为你找符合要求的方案。",ready:true,constraints:{budget:30,people:1,startsAt:"2026-10-04T12:00:00+08:00",reserve:false,dishId:2}};
    const ready = await diningTurn({message:"明天十二点，一个人，30元，不预约",history:[{role:"assistant",content:start.reply}],data},settings);
    assert.equal(ready.ready,true);
    assert.equal(captured.input[2].content,start.reply);
    turn.constraints.dishId = 999;
    await assert.rejects(()=>diningTurn({message:"随便",data},settings),/不在当前菜单/);
    delete turn.constraints.dishId;
    delete turn.constraints.people;
    await assert.rejects(()=>diningTurn({message:"随便",data},settings),/尚未补齐/);
  } finally { globalThis.fetch = old; }
});
test("模型配置为空时明确返回未配置，不伪造对话", async () => {
  await assert.rejects(()=>diningTurn({message:"",data},{...settings,aiApiKey:""}),e=>e.status===503);
});
