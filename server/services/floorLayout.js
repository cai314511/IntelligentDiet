import fs from 'node:fs';
import path from 'node:path';
import {config} from '../config.js';
export function displaySeat(seat,restaurant) {
 const only=restaurant.name.includes('三层')?'三层':restaurant.name.includes('地下')?'地下一层':null;
 const zone=seat.label[0];
 const number=Number(seat.label.split('-')[1]);
 return {...seat,floor:only||seat.floor,zone,label:`${zone}-${String(seat.seatNumber || seat.seat_number || (only?number:(number-1)%8+1)).padStart(2,'0')}`};
}
export function floorLayout(restaurant,floor,windows=[]) {
 const file=path.join(config.userDataDir,'floor_layouts.json');
 const records=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];
 const record=records.find(r=>r.schoolId===restaurant.schoolId&&r.restaurant===restaurant.name&&r.floor===floor);
 return {floor,shape:'square-ring',zones:[{id:'A',side:'north'},{id:'B',side:'east'},{id:'C',side:'south'},{id:'D',side:'west'}],landmarks:[{name:'入口',kind:'entrance',side:'south'},{name:'楼梯',kind:'stairs',side:'west'}],stalls:record?.stalls||windows.map(name=>({name})),sources:record?.sources||[],positionBasis:record?.positionBasis||'configurable schematic'};
}
