const BASE = (process.env.API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const schools = [
  { id: 'cufe', name: '中央财经大学' },
  { id: 'tju', name: '天津大学' },
  { id: 'bjfu', name: '北京林业大学' }
];

async function get(path) {
  const response = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } });
  let json;
  try { json = await response.json(); } catch { json = null; }
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return json;
}

function check(condition, label) {
  if (!condition) throw new Error(label);
  console.log(`✓ ${label}`);
}

async function run() {
  const health = await get('/health');
  check(health.status === 'ok', 'API health');

  const schoolResult = await get('/users/schools');
  const returnedSchools = schoolResult.data || [];
  check(schools.every(expected => returnedSchools.some(row => row.id === expected.id && row.name === expected.name)), 'three login schools are available');

  for (const school of schools) {
    const query = `?schoolId=${encodeURIComponent(school.id)}`;
    const [dishes, categories, restaurants, activities, culture, recipes] = await Promise.all([
      get(`/dishes${query}`),
      get(`/dishes/categories${query}`),
      get(`/restaurants${query}`),
      get(`/activities${query}`),
      get(`/activities/culture${query}`),
      get(`/recipes${query}`)
    ]);
    const rows = [dishes, categories, restaurants, activities, culture, recipes].map(result => result.data);
    check(rows.every(Array.isArray), `${school.name}: read endpoints return lists`);
    check(dishes.data.length > 0 && dishes.data.every(row => row.schoolId === school.id), `${school.name}: dishes are present and school-scoped (${dishes.data.length})`);
    check(categories.data.length > 0, `${school.name}: dish categories are available`);
    check(restaurants.data.length > 0 && restaurants.data.every(row => row.schoolId === school.id), `${school.name}: restaurants are present and school-scoped (${restaurants.data.length})`);
    check(activities.data.every(row => row.schoolId === school.id), `${school.name}: activities are school-scoped (${activities.data.length})`);
    check(culture.data.every(row => row.schoolId === school.id), `${school.name}: cultural items are school-scoped (${culture.data.length})`);
    check(recipes.data.length > 0 && recipes.data.every(row => row.schoolId === school.id), `${school.name}: recipes are present and school-scoped (${recipes.data.length})`);
  }

  const adminOnly = await fetch(`${BASE}/stats/dashboard`, { headers: { Accept: 'application/json' } });
  check(adminOnly.status === 401, 'admin dashboard rejects unauthenticated access');
  console.log('\nRead-only smoke checks passed. No accounts, orders, or other records were created.');
}

run().catch(error => {
  console.error(`✗ Smoke check failed: ${error.message}`);
  console.error('Set API_BASE_URL if the API is not at http://localhost:5000/api, then run npm run smoke.');
  process.exitCode = 1;
});
