export const buildings={
 tju:[{name:'梅园餐厅',campus:'北洋园校区',aliases:['梅园餐厅'],floors:['一层','二层']},{name:'棠园食堂',campus:'北洋园校区',aliases:['棠园食堂','棠园餐厅'],floors:['一层','二层']},{name:'菊园餐厅',campus:'北洋园校区',aliases:['菊园餐厅'],floors:[]}],
 cufe:[{name:'东区食堂',campus:'沙河校区',aliases:['东区食堂','东区三层食堂'],floors:['一层','二层','三层']},{name:'西区食堂',campus:'沙河校区',aliases:['西区食堂'],floors:['一层','二层','三层']},{name:'子衿食园',campus:'学院南路校区',aliases:['地下民族食堂','子衿食园'],floors:['负一层','一层','二层','三层']}],
 bjfu:[{name:'东区食堂',campus:'东区',aliases:['学一食堂','学二食堂','禾园餐厅','清真食堂','东区食堂'],floors:['一层','二层','三层']},{name:'东区教职工食堂',campus:'东区',aliases:['东区教职工食堂'],floors:['二层']},{name:'西区食堂',campus:'西区',aliases:['西区食堂'],floors:['负一层','一层','二层','三层']},{name:'烘焙坊',campus:'东区',aliases:['烘焙坊'],floors:[],seating:false}]
};
export function normalizeRestaurants(db) {
 for(const [school,groups] of Object.entries(buildings))for(const g of groups){
  let members=db.prepare('SELECT * FROM restaurants WHERE school_id=?').all(school).filter(r=>g.aliases.includes(r.name));
  if(!members.length){db.prepare("INSERT INTO restaurants(school_id,name,campus) VALUES(?,?,?)").run(school,g.name,g.campus);members=[db.prepare('SELECT * FROM restaurants WHERE school_id=? AND name=? AND campus=?').get(school,g.name,g.campus)];}
  const primary=members.find(r=>r.name===g.name&&r.campus===g.campus)||members.find(r=>r.name===g.name)||members[0];
  for(const r of members){
   db.prepare('UPDATE caipinxinxi SET restaurant_name=?,campus=? WHERE school_id=? AND restaurant_name=?').run(g.name,g.campus,school,r.name);
   db.prepare('UPDATE restaurants SET canonical_id=? WHERE id=?').run(primary.id,r.id);
  }
  db.prepare('UPDATE restaurants SET name=?,campus=?,floors_json=?,has_seating=? WHERE id=?').run(g.name,g.campus,JSON.stringify(g.floors),g.seating===false?0:1,primary.id);
  // Preserve original seat IDs and historical reservations while combining the building.
  const seats=db.prepare('SELECT * FROM restaurant_seats WHERE restaurant_id IN ('+members.map(()=>'?').join(',')+') ORDER BY id').all(...members.map(r=>r.id)).sort((a,b)=>Number(b.restaurant_id===primary.id)-Number(a.restaurant_id===primary.id)||a.id-b.id);
  const counts={};
  for(const [i,s] of seats.entries()) {
   const original=members.find(r=>r.id===s.restaurant_id);
   const floor=g.seating===false?s.floor:original.name.includes('三层')?'三层':g.floors.includes(s.floor)?s.floor:(g.floors[0]||s.floor);
   const zone=s.seat_label[0],key=floor+zone;
   if ((counts[key]||0)>=32 && original.id!==primary.id) continue; // Retain unused alias seats and their historical IDs on the archived alias.
   counts[key]=(counts[key]||0)+1;
   db.prepare('UPDATE restaurant_seats SET seat_label=?,restaurant_id=?,floor=?,seat_number=? WHERE id=?').run(`${zone}-${10000+s.id}`,primary.id,floor,counts[key],s.id);
  }
  if(g.seating!==false)for(const floor of g.floors)for(const zone of ['A','B','C','D'])for(let n=(counts[floor+zone]||0)+1;n<=32;n++)db.prepare("INSERT INTO restaurant_seats(restaurant_id,seat_label,seat_type,floor,seat_number) VALUES(?,?,'单人座',?,?)").run(primary.id,`${zone}-${floor}-${n}`,floor,n);
 }
}

// Expand each floor and zone without replacing existing IDs or reservation history.
export function ensureSeatCapacity(db) {
 db.prepare("UPDATE restaurants SET floors_json='[\"一层\",\"二层\"]' WHERE school_id='tju' AND name IN ('梅园餐厅','棠园食堂')").run();
 db.prepare("UPDATE restaurant_seats SET floor='一层' WHERE restaurant_id IN (SELECT id FROM restaurants WHERE school_id='tju' AND name IN ('梅园餐厅','棠园食堂')) AND floor NOT IN ('一层','二层')").run();
 const insert = db.prepare("INSERT INTO restaurant_seats(restaurant_id,seat_label,seat_type,floor,seat_number) VALUES(?,?,'单人座',?,?)");
 for (const r of db.prepare('SELECT * FROM restaurants WHERE has_seating=1 AND (canonical_id IS NULL OR canonical_id=id)').all()) {
  const configured = JSON.parse(r.floors_json || '[]');
  const floors = configured.length ? configured : [...new Set(db.prepare('SELECT floor FROM restaurant_seats WHERE restaurant_id=?').all(r.id).map(s=>s.floor))];
  for (const floor of floors) for (const zone of ['A','B','C','D']) {
   const seats = db.prepare('SELECT id,seat_number FROM restaurant_seats WHERE restaurant_id=? AND floor=? AND substr(seat_label,1,1)=? ORDER BY seat_number,id').all(r.id,floor,zone);
   for (const [i,s] of seats.entries()) db.prepare('UPDATE restaurant_seats SET seat_number=? WHERE id=?').run(i+1,s.id);
   for (let n=seats.length+1;n<=32;n++) insert.run(r.id,`${zone}-${floor}-${n}`,floor,n);
  }
 }
}
