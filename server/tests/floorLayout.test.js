import test from 'node:test';
import assert from 'node:assert/strict';
import {displaySeat,floorLayout} from '../services/floorLayout.js';
test('每层每区编号独立，楼层专属食堂不生成虚构其他楼层',()=>{
 const r={name:'东区食堂',schoolId:'cufe'};
 assert.equal(displaySeat({label:'A-09',floor:'二层'},r).label,'A-01');
 assert.equal(displaySeat({label:'B-17',floor:'三层'},r).label,'B-01');
 assert.equal(displaySeat({label:'A-09',floor:'二层'},{name:'东区三层食堂'}).floor,'三层');
 assert.equal(displaySeat({label:'A-09',floor:'二层'},{name:'东区三层食堂'}).label,'A-09');
 const layout=floorLayout(r,'二层');assert.deepEqual(layout.zones.map(z=>z.id),['A','B','C','D']);assert.ok(layout.landmarks.some(l=>l.kind==='entrance'));
});
