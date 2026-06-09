require("dotenv").config();
const base = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

async function main() {
  const uniq = Date.now();
  const reg = await fetch(`${base}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      firstName: "Disc",
      lastName: "User",
      email: `disc_${uniq}@example.com`,
      password: "Verify1!Pass9",
      agreeTerms: true,
      phoneNumber: `555${String(uniq).slice(-7)}`,
      countryCode: "+1",
      educationStatus: "university",
      universityYear: 2,
    }),
  }).then((r) => r.json());
  if (!reg.success) throw new Error("register: " + JSON.stringify(reg));
  const auth = { Authorization: `Bearer ${reg.data.accessToken}`, "content-type": "application/json" };

  const created = await fetch(`${base}/communities`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      name: `Physics Year 2 ${uniq}`,
      visibility: "public",
      subjectKeys: ["physics"],
      educationStatus: "university",
      universityYear: 2,
      purpose: "study_group",
    }),
  }).then((r) => r.json());
  if (!created.success) throw new Error("create: " + JSON.stringify(created));
  console.log("create OK", created.data.subjectKeys, created.data.primarySubjectLabel);

  const cats = await fetch(`${base}/communities/discover/categories?locale=en`, { headers: auth }).then((r) =>
    r.json()
  );
  if (!cats.success || !cats.data.subjects?.length) throw new Error("categories: " + JSON.stringify(cats));
  console.log("categories OK", cats.data.subjects.length, "subjects", cats.data.categoryTitles?.length, "categoryTitles");

  const withNewCat = await fetch(`${base}/communities`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      name: `Custom Cat ${uniq}`,
      visibility: "public",
      subjectKeys: ["math"],
      newCategoryTitle: `Custom Category ${uniq}`,
    }),
  }).then((r) => r.json());
  if (!withNewCat.success) throw new Error("create newCategoryTitle: " + JSON.stringify(withNewCat));
  console.log("create newCategoryTitle OK", withNewCat.data.category);

  const titles = await fetch(`${base}/communities/category-titles?q=Custom&limit=10`, { headers: auth }).then((r) =>
    r.json()
  );
  if (!titles.success || !titles.data.items?.some((i) => i.title.includes("Custom"))) {
    throw new Error("category-titles: " + JSON.stringify(titles));
  }
  console.log("category-titles OK", titles.data.items.length, "items");

  const both = await fetch(`${base}/communities`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      name: "Bad",
      visibility: "public",
      category: "A",
      newCategoryTitle: "B",
    }),
  }).then((r) => r.json());
  if (both.success) throw new Error("expected validation error for category + newCategoryTitle");
  console.log("validation OK rejects both category fields");

  const rec = await fetch(`${base}/communities/recommended?section=for_you&limit=5`, { headers: auth }).then((r) =>
    r.json()
  );
  if (!rec.success) throw new Error("recommended: " + JSON.stringify(rec));
  console.log("recommended OK", rec.data.items?.length, "items", rec.data.items?.[0]?.matchReason);

  const browse = await fetch(`${base}/communities/discover?subject=physics&limit=5`, { headers: auth }).then((r) =>
    r.json()
  );
  if (!browse.success) throw new Error("discover: " + JSON.stringify(browse));
  console.log("discover OK", browse.data.total, "total");

  console.log("\nCOMMUNITY DISCOVER OK");
}

main().catch((e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});
