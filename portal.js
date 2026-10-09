import {
  api,
  post,
  session,
  saveSession,
  options,
  applySchool,
} from "./shared/core.js";
let identity = new URLSearchParams(location.search).get("identity") === "admin" ? "admin" : "student",
  register = false,
  demoSchool = null,
  schools = [];
const $ = (id) => document.getElementById(id);
function update() {
  const demo = identity === "admin" && $("school").value === "demo";
  document
    .querySelectorAll("[data-role]")
    .forEach((b) => {
      const selected = b.dataset.role === identity;
      b.classList.toggle("active", selected);
      b.setAttribute("aria-pressed", String(selected));
    });
  $("switch-register").hidden = demo;
  $("admin-fields").hidden = identity !== 'admin' || demo;
  $("admin-code").required = identity === 'admin' && register && !demo;
  $("admin-code").disabled = identity !== 'admin' || demo;
  $("admin-help").textContent = register ? '请输入由学校负责人分发的管理员认证号。' : '正式管理员无需重复填写认证号。';
  for (const id of ['account','password']) {
    $(id).hidden = demo;
    $(id).disabled = demo;
    document.querySelector('label[for="'+id+'"]').hidden = demo;
  }
  $("campus").parentElement.hidden = demo;
  document.querySelector('[data-development-entry]')?.toggleAttribute('hidden', demo);
  $("register-fields").hidden = !register || demo;
  $("name").required = register && !demo;
  $("submit").textContent = demo ? "一键进入演示数据" : register ? (identity === "admin" ? "注册并进入后勤端" : "注册并进入学生端") : "登录并进入";
  $("switch-register").textContent = register
    ? "已有账号？返回登录"
    : (identity === "admin" ? "还没有账号？注册校方账号" : "还没有账号？注册学生账号");
  $("password").autocomplete = register ? "new-password" : "current-password";
  $("password").minLength = register ? 8 : 1;
  const school = [...schools, demoSchool].find((s) => s?.id === $("school").value);
  applySchool(school);
  $("auth-context").textContent =
    school && identity
      ? `${school.name} · ${identity === "admin" ? "校方 / 食堂管理者" : "学生"} · 校园账户登录`
      : "请选择身份和学校";
}
function campuses() {
  const school = schools.find((s) => s.id === $("school").value);
  $("campus").innerHTML = options(
    [
      { value: "", label: "全校" },
      ...(school?.campuses || []).map((c) => ({ value: c, label: c })),
    ],
    session()?.campus || "",
  );
  update();
}
async function load() {
  try {
    schools = (await api("/users/schools")).data;
    demoSchool = { ...schools.find(s => s.id === 'cufe'), id: 'demo', name: '演示数据', shortName: '演示数据', skinId: 'cufe', logo: '/assets/brand/zhixiang-app-icon.png', campuses: ['东校区', '西校区'] };
    $("school").innerHTML = options(
      (identity === "admin" ? [...schools, demoSchool] : schools).map((s) => ({ value: s.id, label: s.name })),
      session()?.user?.school_id ||
        schools.find(
          (s) => s.id === new URLSearchParams(location.search).get("schoolId"),
        )?.id ||
        schools[0]?.id,
    );
    $("retry-schools").hidden = true;
    campuses();
  } catch (e) {
    $("auth-status").textContent = e.message;
    $("retry-schools").hidden = false;
  }
}
document.querySelectorAll("[data-role]").forEach(
  (b) =>
    (b.onclick = () => {
      identity = b.dataset.role;
      register = false;
      const previous = $("school").value;
      $("school").innerHTML = options((identity === "admin" ? [...schools, demoSchool].filter(Boolean) : schools).map(s=>({value:s.id,label:s.name})), previous === "demo" && identity === "student" ? schools[0]?.id : previous);
      campuses();
    }),
);
$("school").onchange = campuses;
$("switch-register").onclick = () => {
  register = !register;
  update();
};
$("retry-schools").onclick = load;
$("auth-form").onsubmit = async (e) => {
  e.preventDefault();
  if (!identity)
    return ($("auth-status").textContent = "请选择“我是学生”或“我是校方”");
  const body = {
    schoolId: $("school").value,
    identity,
    adminCode: identity === 'admin' ? $("admin-code").value.trim() : undefined,
    zhanghao: $("account").value.trim(),
    mima: $("password").value,
  };
  $("submit").disabled = true;
  $("auth-status").textContent = "";
  try {
    if (identity === 'admin' && body.schoolId === 'demo') {
      const response = await post('/demo/session', {});
      saveSession(response.data);
      location.href = '/management/#dashboard';
      return;
    }
    if (register) {
      await post("/users/register", {
        ...body,
        xingming: $("name").value.trim(),
        lianxifangshi: $("phone").value.trim(),
      });
      register = false;
      update();
      $("auth-status").textContent = '账号已创建，正在进入工作台…';
    }
    const r = (await post("/users/login", body)).data;
    saveSession({
      token: r.token,
      user: r.user,
      identity: body.identity,
      campus: $("campus").value,
      school: schools.find((s) => s.id === body.schoolId),
    });
    location.href =
      body.identity === "admin" ? "/management/#dashboard" : "/canteen/#order";
  } catch (error) {
    $("auth-status").textContent = error.message;
  } finally {
    $("submit").disabled = false;
  }
};
update();
load();
api("/users/development-entry")
  .then((r) => {
    if (!r.data.enabled) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.developmentEntry = "true";
    button.hidden = identity === "admin" && $("school").value === "demo";
    button.className = "btn secondary";
    button.textContent = "自动填入管理员账号";
    button.style.cssText = "width:100%;margin-top:12px";
    button.onclick = async () => {
      button.disabled = true;
      try {
        const schoolId = $("school").value;
        if (!schoolId) throw new Error("请先选择学校");
        const data = (await post("/users/development-account", { schoolId }))
          .data;
        register = false;
        update();
        $("account").value = data.account;
        $("password").value = data.password;
        $("auth-status").textContent = "";
      } catch (e) {
        $("auth-status").textContent = e.message;
      } finally {
        button.disabled = false;
      }
    };
    $("auth-form").append(button);
  })
  .catch(() => {});
