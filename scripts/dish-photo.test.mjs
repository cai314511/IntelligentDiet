import test from 'node:test';
import assert from 'node:assert/strict';
import {dishImage,dishPhoto} from '../shared/dish-photo.js';
test('current catalog images replace stale task/order snapshots by dish id',()=>{
 const menu=[{id:5,name:'鸭血豆腐',image:'/assets/zhongcai/鸭血豆腐.png'}];
 assert.equal(dishImage({id:99,caipinxinxiid:5,tupian:'/canteen/dish-placeholder.svg'},menu),menu[0].image);
 assert.equal(dishImage({id:5,image:''},menu),menu[0].image);
});
test('manual nutrition record ids cannot be confused with catalog dish ids',()=>{
 const menu=[{id:5,name:'鸡蛋',image:'/assets/zhongcai/鸡蛋.png'}];
 assert.equal(dishImage({id:5,dish_id:null,name:'其他菜'},menu),'');
 assert.equal(dishImage({id:5,dish_id:null,name:'鸡蛋'},menu),menu[0].image);
});
test('missing images stay blank, unsafe URLs are not rendered, names are escaped',()=>{
 assert.equal(dishImage({image:'javascript:alert(1)'}),'');
 assert.equal(dishImage({image:'/canteen/dish-placeholder.svg'}),'');
 assert.doesNotMatch(dishPhoto({name:'无图菜品'}),/<img /);
 assert.match(dishPhoto({name:'<菜品>',image:'/assets/food.png'}),/alt="&lt;菜品&gt;"/);
});
