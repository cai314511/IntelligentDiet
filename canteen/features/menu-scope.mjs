export function scopedMenu(catalog,filters) {
 const restaurants=catalog.restaurants.filter(r=>!filters.campus||r.campus===filters.campus);
 if(filters.restaurantId&&!restaurants.some(r=>r.id===Number(filters.restaurantId)))filters.restaurantId='';
 const dishes=catalog.dishes.filter(d=>(!filters.campus||d.campus===filters.campus)&&(!filters.restaurantId||d.restaurantId===Number(filters.restaurantId)));
 if(filters.floor&&!dishes.some(d=>d.floor===filters.floor))filters.floor='';
 if(filters.dishName&&!dishes.some(d=>d.name===filters.dishName))filters.dishName='';
 return {restaurants,dishes};
}
export const hasReferencePhoto=d=>Boolean(d.image&&!d.image.includes('placeholder'));
