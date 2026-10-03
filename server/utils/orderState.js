// 订单状态机：唯一合法状态与流转规则
import { randomInt } from 'crypto';

export const ORDER_STATUS = ['未支付', '已支付', '制作中', '待取餐', '已完成', '已取消', '已退款'];

export const ALLOWED_TRANSITIONS = {
  '未支付': ['已支付', '已取消'],
  '已支付': ['制作中', '已退款'],
  '制作中': ['待取餐'],
  '待取餐': ['已完成'],
  '已完成': [],
  '已取消': [],
  '已退款': []
};

export function canTransition(from, to) {
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

// 生成取餐码：1 大写字母 + 3 位数字（如 A042）
export function generatePickupCode() {
  const letter = String.fromCharCode(65 + randomInt(26));
  const digits = String(randomInt(1000)).padStart(3, '0');
  return `${letter}${digits}`;
}
