import test from 'node:test';
import assert from 'node:assert/strict';
import {bjfuCulturePage,isBjfuCultureAccount} from '../canteen/features/bjfu-culture.js';
test('BJFU culture layout is bound only to logged-in BJFU accounts',()=>{
 assert.equal(isBjfuCultureAccount({token:'test',user:{school_id:'bjfu'}}),true);
 for(const school_id of ['cufe','tju']) assert.equal(isBjfuCultureAccount({token:'test',user:{school_id}}),false);
 assert.equal(isBjfuCultureAccount({user:{school_id:'bjfu'}}),false);
});
test('BJFU layout keeps existing live activities, products, action IDs and point histories',()=>{
 const html=bjfuCulturePage({activities:[{id:11,title:'实际活动 <测试>',description:'台账内容'}],items:[{id:22,title:'四季北林·森语同行',price:128,stock:4},{id:23,title:'原有商品',price:16,stock:8}],points:{balance:320,redemptions:[{title:'历史兑换',status:'待领取'}]},orders:[{title:'历史订单',quantity:1,total:16,status:'已支付'}],signups:[]});
 for(const text of ['实际活动 &lt;测试&gt;','台账内容','原有商品','库存 4','¥128.00','320','历史兑换','历史订单'])assert.ok(html.includes(text),text);
 for(const action of ['buy','redeem'])assert.ok(html.includes(`data-action="${action}" data-id="22"`));
 assert.ok(html.includes('data-action="join" data-id="11"'));
 assert.ok(html.includes('culture-seasons.png'));
 assert.ok(html.indexOf('bjfu-culture-events')<html.indexOf('bjfu-culture-products'));
});
