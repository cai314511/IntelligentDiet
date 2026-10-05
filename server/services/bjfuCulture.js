// User-approved BJFU designs and prices; stock uses the existing database default.
export const bjfuCultureProducts = [
  {title:'北林校园风物笔记本',price:32,image:'/assets/schools/bjfu/culture-notebook.png',description:'记录校园风物与自然之美的设计笔记本，收纳山木、书写属于你的北林时光。'},
  {title:'四季北林·森语同行',price:128,image:'/assets/schools/bjfu/culture-seasons.png',description:'以北林四季为灵感的校园文创礼盒，收录春夏秋冬的校园之美，把自然与青春一同收藏。'},
  {title:'龙林时藏——北林文创文具',price:88,image:'/assets/schools/bjfu/culture-stationery.png',description:'以北林地标与自然元素为灵感的文创文具套装，珍藏校园的绿意与诗意。'},
];
export function ensureBjfuCulture(database) {
  const insert=database.prepare(`INSERT OR IGNORE INTO cultural_items(school_id,title,category,description,price,image,source_name)
    VALUES('bjfu',?,'校园文创',?,?,?,'校园文创设计素材')`);
  return database.transaction(()=>bjfuCultureProducts.reduce((n,p)=>n+insert.run(p.title,p.description,p.price,p.image).changes,0))();
}
