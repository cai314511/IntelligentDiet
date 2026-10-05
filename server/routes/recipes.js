import { acceptsNutritionGoal } from "../services/preferenceFilter.js";
import express from 'express';
import { db } from '../database.js';
import { requireAdmin } from '../middleware/auth.js';

const router=express.Router();
const parse=text=>{try{return JSON.parse(text||'[]')}catch{return []}};
function recipesFor(schoolId) {
  return db.prepare(`SELECT id,school_id AS schoolId,title,goal,description,dish_ids_json AS rawDishIds,tips_json AS rawTips
    FROM recipes WHERE school_id IN ('all',?) ORDER BY id`).all(schoolId).map(row=>{
      const ids=parse(row.rawDishIds);
      const meals=ids.map(id=>db.prepare(`SELECT id,caipinmingcheng AS name,jiage AS price,ingredients_json AS rawIngredients,portion_g AS portionG,nutrition_json AS rawNutrition
        FROM caipinxinxi WHERE id=? AND school_id IN ('all',?)`).get(id,schoolId)).filter(Boolean).map(d=>({...d,price:Number(d.price),ingredients:parse(d.rawIngredients),nutrition:parse(d.rawNutrition)}));
      return {id:row.id,schoolId:row.schoolId,title:row.title,goal:row.goal,description:row.description,dishIds:ids,tips:parse(row.rawTips),meals};
    }).filter(recipe => recipe.meals.length && recipe.meals.every(d => acceptsNutritionGoal(d,recipe.goal)));
}
function validSchool(id){return Boolean(db.prepare('SELECT 1 FROM universities WHERE id=?').get(id));}

router.get('/',(req,res)=>{
  const schoolId=String(req.query.schoolId||'cufe');
  if(!validSchool(schoolId)) return res.status(400).json({code:400,message:'请选择有效学校'});
  res.json({code:200,data:recipesFor(schoolId)});
});

router.get('/:id',(req,res)=>{
  const schoolId=String(req.query.schoolId||'cufe');
  if(!validSchool(schoolId)) return res.status(400).json({code:400,message:'请选择有效学校'});
  const recipe=recipesFor(schoolId).find(row=>row.id===Number(req.params.id));
  if(!recipe) return res.status(404).json({code:404,message:'食谱不存在'});
  res.json({code:200,data:recipe});
});

router.post('/',requireAdmin,(req,res)=>{
  const {title,goal,description,dishIds=[],tips=[]}=req.body||{};
  if(typeof title!=='string'||!title.trim()||title.length>100||typeof goal!=='string'||!goal.trim()||typeof description!=='string'||!description.trim()||description.length>2000||!Array.isArray(dishIds)||dishIds.length>20||!Array.isArray(tips)||tips.length>20) return res.status(400).json({code:400,message:'食谱信息格式无效'});
  const ids=dishIds.map(Number);
  if(ids.some(id=>!Number.isSafeInteger(id)||id<1)) return res.status(400).json({code:400,message:'食谱菜品编号无效'});
  const count=ids.length?db.prepare(`SELECT COUNT(*) AS count FROM caipinxinxi WHERE school_id=? AND shangjia='是' AND id IN (${ids.map(()=>'?').join(',')})`).get(req.user.schoolId,...ids).count:0;
  if(count!==ids.length) return res.status(400).json({code:400,message:'食谱包含当前学校未上架的菜品'});
  const result=db.prepare(`INSERT INTO recipes(school_id,title,goal,description,dish_ids_json,tips_json) VALUES(?,?,?,?,?,?)`).run(req.user.schoolId,title.trim(),goal.trim(),description.trim(),JSON.stringify(ids),JSON.stringify(tips));
  res.status(201).json({code:200,message:'食谱已创建',data:{id:result.lastInsertRowid}});
});

export default router;
