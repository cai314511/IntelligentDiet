"""Recompute CSV from audited, explicitly assumed recipes; original order/identity remains stable."""
import csv, json, pathlib, collections
ROOT=pathlib.Path(__file__).resolve().parents[1]
PATH=ROOT/'userdata/menu_catalog.csv'
AUDIT=ROOT/'userdata/menu_audit'
model=json.loads((AUDIT/'nutrition_model.json').read_text())
locations=json.loads((AUDIT/'locations.json').read_text())
candidates=json.loads((AUDIT/'candidates.json').read_text())
rows=list(csv.DictReader(PATH.open()))
fields=list(rows[0])
for f in ['source_identity','floor','window_name','location_basis','nutrition_status','calories_per_100g','protein_per_100g','carbs_per_100g','fat_per_100g','nutrition_recipe','nutrition_source_url']:
 if f not in fields:fields.append(f)
loc={tuple(m['identity']):m for m in locations}
for r in rows:
 identity=json.loads(r['source_identity']) if r.get('source_identity') else [r['school_id'],r['campus'],r['restaurant'],r['dish_name']]
 r['source_identity']=json.dumps(identity,ensure_ascii=False,separators=(',',':'))
 if tuple(identity) in loc:
  m=loc[tuple(identity)];r.update(restaurant=m['restaurant'],campus=m['campus'],floor=m['floor'],window_name=m['window'],location_basis=m['evidenceKind'])
  if m['sourceUrl']!=r['source_url']:
   r['source_url']=m['sourceUrl'];r['source_name']=m.get('sourceName','北洋维基北洋园食堂');r['source_kind']=m['evidenceKind']
# User authorized clearly labelled reference prices. Match same named product if possible, otherwise category proxy.
price_defaults={'主食':8,'早餐':4,'热菜':12,'面食':14,'套餐':18,'汤品':10,'甜品':8,'饮品':6,'轻食':18,'自选':15}
labels={'grain':'谷物/面粉（干）','rice':'熟米饭','noodle':'面制品','bean':'杂豆（干）','starch':'淀粉/粉条（干）','pastry':'糕点或油炸食品','potato':'薯芋类','veg':'蔬菜','mushroom':'鲜菌菇','fruit':'水果','lean':'瘦肉（可食部生重）','pork':'中脂肉（可食部生重）','fatty':'高脂肉（可食部生重）','poultry':'禽肉（可食部生重）','egg':'鸡蛋','fish':'鱼肉（可食部）','shrimp':'虾仁','nuts':'坚果','tofu':'北豆腐','softtofu':'南豆腐','beancurd':'豆皮/豆干','soymilk':'豆浆','milk':'乳制品','yogurt':'酸奶','cheese':'奶酪','oil':'烹调用油（实际入口估计）','sugar':'糖'}
def category(n):
 if n in ['鸡蛋','油条','豆浆','粥','咸豆腐脑','酱香饼','玉米饼','馒头','咸菜','牛奶燕麦粥','烧饼','武大烧饼']:return '早餐'
 if any(k in n for k in ['蛋糕','年糕','冰粉','银耳','铜锣烧']):return '甜品'
 if n=='红烧肉' or n=='鸭血豆腐' or n=='烤鱼' or n=='糖醋洋芋':return '热菜'
 if '减脂' in n:return '轻食'
 if n=='自选菜':return '自选'
 if any(k in n for k in ['汤','锅']):return '汤品'
 if any(k in n for k in ['饭','鸡','三明治','卷饼']):return '套餐'
 return '面食'
known={(r['school_id'],r['campus'],r['restaurant'],r.get('floor',''),r['dish_name']) for r in rows}
for c in candidates:
 key=(c['schoolId'],c['campus'],c['restaurant'],c['floor'],c['name'])
 if key in known:continue
 n=c['name']; recipe=model['recipes'][n];cat=c.get('category') or category(n)
 similar=next((r for r in rows if r['dish_name']==n),None)
 price=similar['price'] if similar else f'{price_defaults[cat]:.2f}'
 parts=recipe['components'];ingredients=[labels[k] for k in parts if k not in ['oil','sugar','water']]
 allergens=[]
 if 'grain' in parts or 'noodle' in parts:allergens.append('小麦')
 if 'egg' in parts:allergens.append('蛋')
 if set(parts)&{'milk','yogurt','cheese'}:allergens.append('奶')
 if set(parts)&{'tofu','softtofu','beancurd','soymilk'}:allergens.append('大豆')
 if 'fish' in parts:allergens.append('鱼')
 if 'shrimp' in parts:allergens.append('虾')
 if 'nuts' in parts:allergens.extend(['花生','芝麻'])
 r={f:'' for f in fields};r.update(school_id=c['schoolId'],school_name={'cufe':'中央财经大学','bjfu':'北京林业大学','tju':'天津大学'}[c['schoolId']],campus=c['campus'],restaurant=c['restaurant'],dish_name=n,category=cat,price=price,price_unit='元/份',ingredients=json.dumps(ingredients,ensure_ascii=False),allergens=json.dumps(allergens,ensure_ascii=False),taste_tags='[]',dietary_tags='[]',spice_level='待核实',availability='上架',source_name=c['sourceName'],source_url=c['sourceUrl'],source_kind=c['evidenceKind'],source_date='',price_basis='参考估价（非学校公布现价）：'+('沿用目录同名菜品参考价' if similar else '按目录同类餐品价格档位估计')+'；上线经用户确认，后勤核价后替换',floor=c['floor'],window_name=c['window'],location_basis=c['evidenceKind'])
 r['source_identity']=json.dumps([*key],ensure_ascii=False,separators=(',',':'))
 # Reuse a real matching dish image, never invent a dish photo.
 if similar:r['image_url']=similar['image_url']
 rows.append(r);known.add(key)
previous=json.loads((AUDIT/"nutrition_corrections.json").read_text()) if (AUDIT/"nutrition_corrections.json").exists() else []
baseline={(r["school"],r["restaurant"],r["floor"],r["name"]):r["oldCalories"] for r in previous}
corrections=[]
for r in rows:
 recipe=model['recipes'][r['dish_name']];parts=recipe['components'];total={'protein':0,'carbs':0,'fat':0}
 for key,grams in parts.items():
  amount,p,c,f=model['exchanges'][key]
  for name,value in [('protein',p),('carbs',c),('fat',f)]:total[name]+=grams/amount*value
 total={k:round(v,1) for k,v in total.items()}
 total['calories']=round(total['protein']*4+total['carbs']*4+total['fat']*9)
 old=baseline.get((r['school_id'],r['restaurant'],r.get('floor',''),r['dish_name']),r.get('calories_kcal'));portion=recipe['portionG']
 r.update(portion_g=str(portion),portion_label=f'估计成品可食部约{portion}g/份',calories_kcal=str(total['calories']),protein_g=str(total['protein']),carbs_g=str(total['carbs']),fat_g=str(total['fat']),fiber_g='',sodium_mg='',nutrition_status='estimated',nutrition_recipe=json.dumps(recipe,ensure_ascii=False,separators=(',',':')),nutrition_source_url=model['source']['url'])
 for key,col in [('calories','calories_per_100g'),('protein','protein_per_100g'),('carbs','carbs_per_100g'),('fat','fat_per_100g')]:r[col]=str(round(total[key]*100/portion,1))
 assumptions='；'.join(f'{labels.get(k,k)}{g}g' for k,g in parts.items())
 r['nutrition_basis']='预估而非实测；NHC2024附录2交换份，明确配方假设：'+assumptions+'；成品份量估计；能量=4×蛋白质+4×碳水+9×脂肪；纤维/钠未知；'+recipe.get('notes','')
 # Keep negative preferences useful; proxy nutrients do not certify ingredients/allergen absence.
 corrections.append({'school':r['school_id'],'restaurant':r['restaurant'],'floor':r.get('floor',''),'name':r['dish_name'],'oldCalories':old,'calories':total['calories'],'fat':total['fat'],'per100g':{k:r[k] for k in ['calories_per_100g','protein_per_100g','carbs_per_100g','fat_per_100g']}})
with PATH.open('w',newline='') as out:
 w=csv.DictWriter(out,fieldnames=fields,lineterminator='\n');w.writeheader();w.writerows(rows)
(AUDIT/'nutrition_corrections.json').write_text(json.dumps(corrections,ensure_ascii=False,indent=2)+'\n')
print('CSV rows',len(rows),'schools',dict(collections.Counter(r['school_id'] for r in rows)))
