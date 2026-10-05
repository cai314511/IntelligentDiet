import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptsProfile} from '../services/preferenceFilter.js';
const dish={name:'香辣鸡肉',ingredients:['鸡肉','香菜'],allergens:[],tasteTags:['咸鲜','中辣'],spiceLevel:'中辣'};
test('disliked ingredients and tastes are excluded even when conversation constraints omit them',()=>{
 assert.equal(acceptsProfile(dish,{portrait:{dislikes:['香菜']}}),false);
 assert.equal(acceptsProfile(dish,{tastes:['不喜欢咸鲜']}),false);
 assert.equal(acceptsProfile(dish,{tastes:['不辣']}),false);
 assert.equal(acceptsProfile(dish,{exclusions:['鸡肉']}),false);
 assert.equal(acceptsProfile(dish,{tastes:['微辣']}),true);
});
test('allergy metadata remains a hard restriction',()=>{
 assert.equal(acceptsProfile({...dish,allergens:['花生']},{portrait:{allergies:['花生']}}),false);
 assert.equal(acceptsProfile({...dish,name:'清蒸鸡肉',ingredients:['鸡肉'],spiceLevel:'不辣',tasteTags:['清淡']},{tastes:['不辣'],portrait:{dislikes:['香菜']}}),true);
});

test('fat-loss eligibility is numerical and precedes recommendation sorting',()=>{
 const healthy={...dish,portionG:450,nutrition:{calories:520,protein:32,carbs:70,fat:12}};
 assert.equal(acceptsProfile(healthy,{goal:'减脂增肌'}),true);
 assert.equal(acceptsProfile({...healthy,name:'减脂轻食',nutrition:{...healthy.nutrition,calories:950,fat:55}},{goal:'低脂'}),false);
 assert.equal(acceptsProfile({...healthy,portionG:100},{goal:'减脂'}),false);
 assert.equal(acceptsProfile({...healthy,nutrition:{...healthy.nutrition,confidence:'low'}},{goal:'减脂'}),false);
 assert.equal(acceptsProfile({...healthy,nutrition:{}},{goal:'低脂'}),false);
 assert.equal(acceptsProfile({...healthy,nutrition:{...healthy.nutrition,calories:950,fat:55}},{goal:'均衡饮食'}),true);
});
