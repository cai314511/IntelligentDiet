import test from 'node:test';
import assert from 'node:assert/strict';
import {scopedMenu,hasReferencePhoto} from '../canteen/features/menu-scope.mjs';
for(const [school,a,b] of [['cufe','沙河校区','学院南路校区'],['bjfu','东区','西区'],['tju','北洋园校区','卫津路校区']])test(school+' switching campus clears stale restaurant and hides other campus options',()=>{
 const catalog={restaurants:[{id:1,name:'本校区',campus:a},{id:2,name:'其他校区',campus:b}],dishes:[{id:1,name:'本校区菜',restaurantId:1,campus:a,floor:'一层'},{id:2,name:'其他校区菜',restaurantId:2,campus:b,floor:'二层'}]};
 const f={campus:a,restaurantId:'2',floor:'二层',dishName:'其他校区菜'};
 const result=scopedMenu(catalog,f);assert.deepEqual(result.restaurants.map(r=>r.id),[1]);assert.deepEqual(result.dishes.map(d=>d.id),[1]);assert.equal(f.restaurantId,'');assert.equal(f.floor,'');assert.equal(f.dishName,'');
});
test('reference photos precede placeholders without hiding dishes',()=>{
 const d=[{id:1,image:'/canteen/dish-placeholder.svg'},{id:2,image:'/assets/food.jpg'},{id:3,image:''}];d.sort((a,b)=>Number(hasReferencePhoto(b))-Number(hasReferencePhoto(a)));assert.deepEqual(d.map(x=>x.id),[2,1,3]);
});
