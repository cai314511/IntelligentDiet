import test from 'node:test';
import assert from 'node:assert/strict';
import {cufeCulturePage,isCufeCultureAccount} from '../canteen/features/cufe-culture.js';
test('CUFE culture artwork requires a logged-in CUFE account',()=>{
 assert.equal(isCufeCultureAccount({token:'test',user:{school_id:'cufe'}}),true);
 for(const school_id of ['bjfu','tju'])assert.equal(isCufeCultureAccount({token:'test',user:{school_id}}),false);
 assert.equal(isCufeCultureAccount({user:{school_id:'cufe'}}),false);
 assert.equal(isCufeCultureAccount(null),false);
});
test('live content, original action IDs, points and order history survive the themed layout',()=>{
 const html=cufeCulturePage({activities:[{id:701,title:'新增活动 <测试>',description:'实际描述',campus:'沙河校区',location:'礼堂'}],items:[{id:901,title:'中财校园风物笔记本',description:'真实商品',price:23.5,stock:7}],points:{balance:123,redemptions:[{title:'已兑换商品',status:'待领取'}]},orders:[{title:'历史商品',quantity:2,total:47,status:'已支付'}],signups:[{title:'历史报名',signupStatus:'已报名'}]});
 assert.ok(html.includes('新增活动 &lt;测试&gt;'));
 for(const action of ['buy','redeem'])assert.ok(html.includes(`data-action="${action}" data-id="901"`));
 assert.ok(html.includes('data-action="join" data-id="701"'));
 for(const text of ['¥23.50','库存 7','123','已兑换商品','待领取','历史商品','已支付','历史报名','已报名'])assert.ok(html.includes(text),text);
 assert.ok(html.indexOf('cufe-culture-events')<html.indexOf('cufe-culture-products'));
 assert.ok(html.includes(encodeURIComponent('中财校园风物笔记本.png')));
});
