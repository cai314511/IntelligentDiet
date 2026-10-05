"""Verify the admitted CSV and reproducible recipe arithmetic without touching the live DB."""
import csv,json,pathlib,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
rows=list(csv.DictReader((ROOT/'userdata/menu_catalog.csv').open()))
model=json.loads((ROOT/'userdata/menu_audit/nutrition_model.json').read_text())
class MenuAudit(unittest.TestCase):
 def test_identities_and_new_source_admission(self):
  identities=[r['source_identity'] for r in rows]
  self.assertEqual(len(identities),len(set(identities)))
  self.assertEqual(len(rows),98+len(json.loads((ROOT/'userdata/menu_audit/candidates.json').read_text())))
  for r in rows[98:]:
   self.assertTrue(r['floor']);self.assertTrue(r['source_url'].startswith('https://'))
   self.assertIn('参考估价',r['price_basis']);self.assertEqual(r['availability'],'上架')
   self.assertNotIn('招标',r['source_kind'])
 def test_recipe_macros_energy_and_density(self):
  for r in rows:
   recipe=json.loads(r['nutrition_recipe']);expected=[0.,0.,0.]
   for group,grams in recipe['components'].items():
    serving,*nutrients=model['exchanges'][group]
    for i,n in enumerate(nutrients):expected[i]+=grams/serving*n
   for i,column in enumerate(['protein_g','carbs_g','fat_g']):self.assertAlmostEqual(float(r[column]),round(expected[i],1),places=1)
   energy=4*float(r['protein_g'])+4*float(r['carbs_g'])+9*float(r['fat_g'])
   self.assertLessEqual(abs(float(r['calories_kcal'])-energy),0.51)
   for total,density in [('calories_kcal','calories_per_100g'),('protein_g','protein_per_100g'),('carbs_g','carbs_per_100g'),('fat_g','fat_per_100g')]:self.assertAlmostEqual(float(r[density]),round(float(r[total])*100/float(r['portion_g']),1),places=1)
   self.assertEqual(r['fiber_g'],'');self.assertEqual(r['sodium_mg'],'')
   self.assertEqual(r['nutrition_status'],'estimated')
 def test_high_fat_food_is_not_a_low_energy_meal(self):
  for r in rows:
   if r['dish_name']=='麻辣香锅':self.assertGreater(float(r['calories_kcal']),750);self.assertGreater(float(r['fat_g']),25)
if __name__=='__main__':unittest.main()
