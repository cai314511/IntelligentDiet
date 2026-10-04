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
    turn = {reply:"我来为你找符合要求的方案。",ready:true,constraints:{budget:30,people:1,startsAt:new Date(Date.now()+86400000).toISOString(),reserve:false,dishId:2}};
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

test("过去时间回到追问，取消意图不能执行，校区饮食范围校验", async () => {
  const old = globalThis.fetch;
  let turn;
  globalThis.fetch = async () => ({ok:true,json:async()=>({output:[{type:'function_call',call_id:'t',name:'dining_turn',arguments:JSON.stringify(turn)}]})});
  try {
    turn={reply:'准备方案',ready:true,constraints:{budget:30,people:1,reserve:false,startsAt:'2000-01-01T12:00:00+08:00'}};
    const past=await diningTurn({message:'昨天',data},settings);
    assert.equal(past.ready,false);assert.equal(past.constraints.startsAt,undefined);assert.match(past.reply,/已经过去/);
    turn={reply:'取消',intent:'cancel',ready:true,constraints:{}};
    assert.equal((await diningTurn({message:'取消',data},settings)).ready,false);
    turn={reply:'查询',ready:false,constraints:{campus:'不存在校区'}};
    await assert.rejects(()=>diningTurn({message:'查询',data},settings),/校区不在/);
    turn={reply:'当前排队9分钟',intent:'answer',ready:true,constraints:{}};
    assert.equal((await diningTurn({message:'排队多久',data},settings)).ready,false);
    turn.constraints={dietary:'错误标签'};
    await assert.rejects(()=>diningTurn({message:'查询',data},settings),/饮食限制无效/);
  }finally{globalThis.fetch=old;}
});

test("多种明确菜品需求不静默丢弃其中一种",async()=>{
  const old=globalThis.fetch;
  globalThis.fetch=async()=>({ok:true,json:async()=>({output:[{type:'function_call',call_id:'t',name:'dining_turn',arguments:JSON.stringify({reply:'准备',ready:true,intent:'plan',constraints:{people:1,budget:40,reserve:false,startsAt:new Date(Date.now()+86400000).toISOString(),dishId:2}})}]})});
  try {
    const r=await diningTurn({message:'同时要一份米饭和一份牛肉饭',data:{restaurants:data.restaurants,dishes:[...data.dishes,{id:3,name:'牛肉饭',forSale:true,restaurantId:1}]}},settings);
    assert.equal(r.ready,false);assert.equal(r.constraints.dishId,undefined);
  }finally{globalThis.fetch=old;}
});
