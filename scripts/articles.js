const fs = require("fs");

const USERNAME = "dj29";
const COUNT = 3;
const README_PATH = "README.md";
const MAX_TITLE_LENGTH = 62;
const PLACEHOLDER =
  "https://raw.githubusercontent.com/github/explore/main/topics/devto/devto.png";

function imageUrl(url) {
  if (!url) {
    return PLACEHOLDER;
  }

  return url.replace(/width=\d+,height=\d+/, "width=600,height=300");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function truncateTitle(title) {
  const normalizedTitle = String(title || "").trim();

  if (normalizedTitle.length <= MAX_TITLE_LENGTH) {
    return normalizedTitle;
  }

  const shortenedTitle = normalizedTitle.slice(0, MAX_TITLE_LENGTH - 1);
  const lastSpace = shortenedTitle.lastIndexOf(" ");

  if (lastSpace >= Math.floor(MAX_TITLE_LENGTH * 0.65)) {
    return `${shortenedTitle.slice(0, lastSpace).trimEnd()}…`;
  }

  return `${shortenedTitle.trimEnd()}…`;
}

function formatArticle(article) {
  return {
    url: escapeHtml(article.url),
    image: escapeHtml(imageUrl(article.cover_image)),
    fullTitle: escapeHtml(article.title),
    displayTitle: escapeHtml(truncateTitle(article.title)),
    publishDate: escapeHtml(article.readable_publish_date),
    readingTime: Number(article.reading_time_minutes) || 0,
    reactions: Number(article.public_reactions_count) || 0,
    comments: Number(article.comments_count) || 0,
  };
}

function buildArticleTable(articles) {
  const formattedArticles = articles.map(formatArticle);
  const imageCells = formattedArticles
    .map(
      (article) =>
        `<td align="center" valign="middle" width="33%"><a href="${article.url}"><img src="${article.image}" alt="${article.fullTitle}" width="300" height="150"></a></td>`,
    )
    .join("\n");
  const titleCells = formattedArticles
    .map(
      (article) =>
        `<td align="center" valign="top" width="33%" height="72"><strong><a href="${article.url}" title="${article.fullTitle}">${article.displayTitle}</a></strong></td>`,
    )
    .join("\n");
  const detailCells = formattedArticles
    .map(
      (article) =>
        `<td align="center" valign="middle" width="33%" height="32"><sub>📅 ${article.publishDate} &nbsp;&bull;&nbsp; ⏱️ ${article.readingTime} min read</sub></td>`,
    )
    .join("\n");
  const engagementCells = formattedArticles
    .map(
      (article) =>
        `<td align="center" valign="middle" width="33%" height="32"><sub>❤️ ${article.reactions} &nbsp;&bull;&nbsp; 💬 ${article.comments}</sub></td>`,
    )
    .join("\n");

  return `<table width="100%" cellpadding="10" cellspacing="0">
<tr>
${imageCells}
</tr>
<tr>
${titleCells}
</tr>
<tr>
${detailCells}
</tr>
<tr>
${engagementCells}
</tr>
</table>`;
}

async function updateReadme() {
  const response = await fetch(
    `https://dev.to/api/articles?username=${encodeURIComponent(USERNAME)}&per_page=${COUNT}`,
    {
      headers: {
        Accept: "application/vnd.forem.api-v1+json",
        "User-Agent": `${USERNAME}-github-readme`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `dev.to API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const articles = await response.json();

  if (!Array.isArray(articles) || articles.length === 0) {
    throw new Error("No articles found; README was not updated.");
  }

  if (!fs.existsSync(README_PATH)) {
    throw new Error(`${README_PATH} was not found in the current directory.`);
  }

  const readme = fs.readFileSync(README_PATH, "utf8");
  const markerPattern = /<!-- ARTICLES:START -->[\s\S]*?<!-- ARTICLES:END -->/;

  if (!markerPattern.test(readme)) {
    throw new Error("Article markers were not found in README.md.");
  }

  const articleSection = `<!-- ARTICLES:START -->

${buildArticleTable(articles.slice(0, COUNT))}

<p align="right"><a href="https://dev.to/${USERNAME}"><strong>View all 30+ articles on dev.to →</strong></a></p>
<!-- ARTICLES:END -->`;
  const updatedReadme = readme.replace(markerPattern, articleSection);

  if (updatedReadme === readme) {
    console.log("No article changes detected. README unchanged.");
    return;
  }

  fs.writeFileSync(README_PATH, updatedReadme, "utf8");
  console.log(`Updated ${articles.slice(0, COUNT).length} article cards in ${README_PATH}.`);
}

updateReadme().catch((error) => {
  console.error("Failed to update README.md:", error.message);
  process.exitCode = 1;
});
