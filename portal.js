import {
  api,
  post,
  session,
  saveSession,
  options,
  applySchool,
} from "./shared/core.js";
let identity = new URLSearchParams(location.search).get("identity") || "",
  register = false,
  schools = [];
const $ = (id) => document.getElementById(id);
function update() {
  document
    .querySelectorAll("[data-role]")
    .forEach((b) => b.classList.toggle("active", b.dataset.role === identity));
  $("switch-register").hidden = identity !== "student";
  if (identity === "admin") register = false;
  $("register-fields").hidden = !register;
  $("name").required = register;
  $("submit").textContent = register ? "注册并进入学生端" : "登录并进入";
  $("switch-register").textContent = register
    ? "已有账号？返回登录"
    : "还没有账号？注册学生账号";
  $("password").autocomplete = register ? "new-password" : "current-password";
  $("password").minLength = register ? 8 : 1;
  const school = schools.find((s) => s.id === $("school").value);
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
    $("school").innerHTML = options(
      schools.map((s) => ({ value: s.id, label: s.name })),
      session()?.user?.school_id || schools[0]?.id,
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
      update();
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
    zhanghao: $("account").value.trim(),
    mima: $("password").value,
  };
  $("submit").disabled = true;
  $("auth-status").textContent = "";
  try {
    if (register)
      await post("/users/register", {
        ...body,
        xingming: $("name").value.trim(),
        lianxifangshi: $("phone").value.trim(),
      });
    const r = (await post("/users/login", body)).data;
    saveSession({
      token: r.token,
      user: r.user,
      identity,
      campus: $("campus").value,
      school: schools.find((s) => s.id === body.schoolId),
    });
    location.href =
      identity === "admin" ? "/management/#dashboard" : "/canteen/";
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
    button.className = "btn secondary";
    button.textContent = "自动填入管理员账号";
    button.style.cssText = "width:100%;margin-top:12px";
    button.onclick = async () => {
      button.disabled = true;
      try {
        const schoolId = $("school").value;
        if (!schoolId) throw new Error("请先选择学校");
        const data = (await post("/users/development-account", { schoolId })).data;
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
