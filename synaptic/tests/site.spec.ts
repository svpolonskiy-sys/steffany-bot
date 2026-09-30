import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("hero, CTA і якорі", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Одна картина бізнесу");
  await page.getByRole("link", { name: "Подивитися сценарій" }).click();
  await expect(page).toHaveURL(/#demo$/);
  await expect(page.getByRole("heading", { name: /Від сигналу/ })).toBeInViewport();
  const top = await page.locator("#demo").evaluate((e) => e.getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(60);
});

test("демо: повний шлях і скидання", async ({ page }) => {
  await page.goto("/#demo");
  await page.getByRole("button", { name: "Переглянути підстави" }).click();
  await page.getByRole("button", { name: /Джерело: Облік запасів/ }).click();
  await expect(page.getByText("демонстраційний фрагмент").first()).toBeVisible();
  await page.getByRole("button", { name: "Переглянути пропозицію" }).click();
  await page.getByRole("button", { name: "Погодити демонстраційну дію" }).click();
  await expect(page.getByText("У демо створено завдання для відповідального.")).toBeVisible();
  await page.getByRole("button", { name: "Повторити сценарій" }).click();
  await expect(page.getByText("Частину замовлень неможливо виконати").first()).toBeVisible();
});

test("демо: розбіжність блокує погодження", async ({ page }) => {
  await page.goto("/#demo");
  await page.getByRole("button", { name: "Показати розбіжність у даних" }).click();
  await page.getByRole("button", { name: "Переглянути підстави" }).click();
  await expect(page.getByText("Джерела містять різні залишки")).toBeVisible();
  await page.getByRole("button", { name: "Переглянути пропозицію" }).click();
  await expect(page.getByRole("button", { name: "Погодити демонстраційну дію" })).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("button", { name: "Погодити демонстраційну дію" }).click({ force: true });
  await expect(page.getByText(/Погодження недоступне: джерела/)).toBeVisible();
  await expect(page.getByText("У демо створено завдання для відповідального.")).toHaveCount(0);
});

test("вкладки: клавіатура", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Рішення керівника" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Підготовка до зустрічі" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Що потрібно знати перед розмовою?");
});

test("форма: валідація, збереження тексту, unavailable без каналу", async ({ page }) => {
  await page.goto("/#contact");
  await page.getByRole("button", { name: "Надіслати запит" }).click();
  await expect(page.getByText("Вкажіть ім’я")).toBeVisible();
  await expect(page.getByLabel("Ім’я")).toBeFocused();
  await page.getByLabel("Ім’я").fill("Тест");
  await page.getByLabel("Email для зв’язку").fill("test@example.com");
  await page.getByLabel("Компанія").fill("Компанія");
  await page.getByLabel(/Що хочете спростити/).fill("Збереження тексту");
  await page.getByRole("button", { name: "Надіслати запит" }).click();
  await expect(page.getByText("Це попередній перегляд. Надсилання ще не підключено.")).toBeVisible();
  await expect(page.getByLabel(/Що хочете спростити/)).toHaveValue("Збереження тексту");
  await expect(page.getByText("Дякуємо")).toHaveCount(0);
});

test("API: origin, розмір і валідація", async ({ request }) => {
  const ok = { name: "А", email: "a@b.co", company: "К" };
  expect((await request.post("/api/contact", { data: ok })).status()).toBe(403);
  const origin = { Origin: "http://localhost:3100" };
  expect((await request.post("/api/contact", { data: { ...ok, email: "x" }, headers: origin })).status()).toBe(422);
  expect((await request.post("/api/contact", { data: { ...ok, message: "я".repeat(9000) }, headers: origin })).status()).toBe(413);
  expect((await request.post("/api/contact", { data: ok, headers: origin })).status()).toBe(503);
});

test("посилання безпеки обирає тему", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Обговорити вимоги до безпеки" }).click();
  await expect(page.getByLabel("Безпека та доступи")).toBeChecked();
});

for (const [w, h] of [[320, 700], [360, 800], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]]) {
  test(`без горизонтального overflow ${w}px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
}

test("мобільне меню: Escape повертає фокус", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const btn = page.getByRole("button", { name: "Меню" });
  await btn.click();
  await expect(page.getByRole("navigation", { name: "Мобільна навігація" }).getByRole("link", { name: "Контроль" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(btn).toBeFocused();
});

test("axe: без critical/serious", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(1500);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  const bad = r.violations.filter((v) => ["critical", "serious"].includes(v.impact ?? ""));
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);
});
