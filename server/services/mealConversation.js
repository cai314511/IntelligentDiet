const digit = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};
export function chineseNumber(value) {
  if (/^\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value.includes("十")) {
    const [a, b] = value.split("十");
    return (a ? digit[a] : 1) * 10 + (b ? digit[b] : 0);
  }
  return digit[value];
}
export function mealTime(message, now = new Date()) {
  if (/现在|马上|半小时后/.test(message))
    return new Date(now.getTime() + 30 * 60000).toISOString();
  const clock = [
    ...message.matchAll(
      /(\d{1,2})[:：](\d{2})|([零一二两三四五六七八九十\d]{1,3})\s*(?:点|时)(半|[零一二两三四五六七八九十\d]{1,3}分)?/g,
    ),
  ].at(-1);
  if (!clock) return undefined;
  let hour = clock[1] ? Number(clock[1]) : chineseNumber(clock[3]),
    minute = clock[2]
      ? Number(clock[2])
      : clock[4] === "半"
        ? 30
        : clock[4]
          ? chineseNumber(clock[4].replace("分", ""))
          : 0;
  if (/下午|晚上|傍晚/.test(message) && hour < 12) hour += 12;
  if (/中午/.test(message) && hour < 11) hour += 12;
  if (
    hour > 23 ||
    minute > 59 ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  )
    return undefined;
  const offset = /后天/.test(message) ? 2 : /明天/.test(message) ? 1 : 0;
  const day = new Date(now.getTime() + offset * 86400000).toLocaleDateString(
    "sv-SE",
    { timeZone: "Asia/Shanghai" },
  );
  const at = new Date(
    `${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+08:00`,
  );
  if (at <= now && !/今天|今晚|今早/.test(message) && offset === 0)
    at.setTime(at.getTime() + 86400000);
  return at.toISOString();
}
export function conversationPatch(message, requestedField = "") {
  const patch = {};
  const budget = [
    ...message.matchAll(/([零一二两三四五六七八九十\d.]+)\s*(?:元|块)/g),
  ].at(-1);
  if (budget) patch.budget = chineseNumber(budget[1]);
  if (requestedField === "budget" && /^\d+(\.\d+)?$/.test(message))
    patch.budget = Number(message);
  const people = [
    ...message.matchAll(/([一二两三四五六七八九十\d]+)\s*(?:个)?(?:人|位)/g),
  ].at(-1);
  if (people) patch.people = chineseNumber(people[1]);
  else if (/我自己|就我|独自|一个人/.test(message)) patch.people = 1;
  else if (requestedField === "people" && /^[一二两三四五六\d]$/.test(message))
    patch.people = chineseNumber(message);
  const time = mealTime(message);
  if (time) patch.startsAt = time;
  if (/不.{0,3}(占座|选座|座位|预约)|不订座/.test(message))
    patch.reserve = false;
  else if (/占座|选座|座位|订座|预约/.test(message)) patch.reserve = true;
  if (requestedField === "reserve") {
    if (/^(不|不用|不要|不需要|否)/.test(message)) patch.reserve = false;
    else if (/^(要|需要|好|是|可以)/.test(message)) patch.reserve = true;
  }
  return patch;
}
