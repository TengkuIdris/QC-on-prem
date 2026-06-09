interface BlogMetadata {
  title: string;
  date: string;
  category: string;
  excerpt: string;
  slug: string;
  filename: string;
  readingTime: number;
}

interface BlogPost extends BlogMetadata {
  content: string;
}

// Calculate reading time in minutes
function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200; // Average reading speed
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

// Generate slug from filename (lowercase, hyphens only)
function generateSlugFromFilename(filename: string): string {
  return filename
    .replace(/\.md$/, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .toLowerCase()
    .replace(/^-+|-+$/g, "");
}

// Extract title from markdown (first # heading)
function extractTitle(content: string, filename: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  if (match) {
    return match[1].trim();
  }
  // Fallback to filename without extension
  return filename.replace(/\.md$/, "").replace(/[_-]/g, " ");
}

// Parse frontmatter from markdown content
function parseFrontmatter(src: string): Record<string, string> {
  const match = src.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const map: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const lineMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
    if (lineMatch) {
      map[lineMatch[1].toLowerCase()] = lineMatch[2].trim();
    }
  }
  return map;
}

// Extract excerpt (first paragraph after title, max 150 chars)
function extractExcerpt(content: string): string {
  const lines = content.split("\n");
  for (const line of lines) {
    if (line.trim() && !line.startsWith("#") && !line.startsWith("---")) {
      const excerpt = line.trim().substring(0, 150);
      return excerpt.length < line.trim().length ? excerpt + "..." : excerpt;
    }
  }
  return "No excerpt available";
}

// Extract date from filename (format: YYYY-MM-DD or YYYY_MM_DD or Month Day, Year)
function extractDateFromFilename(filename: string): string {
  // Try YYYY-MM-DD or YYYY_MM_DD pattern
  const dateMatch = filename.match(/(\d{4})[_-](\d{1,2})[_-](\d{1,2})/);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Try to extract from "November 8, 2025" or "November_8_2025" pattern
  const monthMatch = filename.match(
    /(November|December|January|February|March|April|May|June|July|August|September|October)[_\s]+(\d{1,2})[_,\s]+(\d{4})/i,
  );
  if (monthMatch) {
    const months: Record<string, string> = {
      january: "01",
      february: "02",
      march: "03",
      april: "04",
      may: "05",
      june: "06",
      july: "07",
      august: "08",
      september: "09",
      october: "10",
      november: "11",
      december: "12",
    };
    const [, monthName, day, year] = monthMatch;
    const month = months[monthName.toLowerCase()];
    return `${year}-${month}-${day.padStart(2, "0")}`;
  }

  // Default to today's date
  return new Date().toISOString().split("T")[0];
}

// Infer category from content or filename
function inferCategory(content: string, filename: string): string {
  const lowerContent = content.toLowerCase();
  const lowerFilename = filename.toLowerCase();

  if (lowerContent.includes("品質管理") || lowerFilename.includes("quality")) {
    return "品質管理";
  }
  if (lowerContent.includes("ai") || lowerFilename.includes("ai")) {
    return "AI";
  }
  if (lowerContent.includes("カイゼン") || lowerFilename.includes("kaizen")) {
    return "カイゼン";
  }
  if (lowerContent.includes("問題解決")) {
    return "問題解決";
  }
  return "その他";
}

export async function loadBlogPosts(): Promise<BlogMetadata[]> {
  // In Vite, we can use import.meta.glob to load markdown files
  const modules = import.meta.glob("/src/content/blogs/*.md", { as: "raw" });

  const posts: BlogMetadata[] = [];

  for (const path in modules) {
    try {
      const content = (await modules[path]()) as string;
      const filename = path.split("/").pop() || "";
      const frontmatter = parseFrontmatter(content);

      const title = frontmatter.title || extractTitle(content, filename);
      const excerpt = frontmatter.excerpt || extractExcerpt(content);
      const date = frontmatter.date || extractDateFromFilename(filename);
      const category = frontmatter.category || inferCategory(content, filename);
      const slug = generateSlugFromFilename(filename);
      const readingTime = calculateReadingTime(content);

      posts.push({
        title,
        date,
        category,
        excerpt,
        slug,
        filename: path,
        readingTime,
      });
    } catch (error) {
      console.error(`Error loading blog post from ${path}:`, error);
    }
  }

  // Sort by date descending
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

export async function loadBlogPost(slug: string): Promise<BlogPost | null> {
  const modules = import.meta.glob("/src/content/blogs/*.md", { as: "raw" });

  for (const path in modules) {
    const filename = path.split("/").pop() || "";
    const postSlug = generateSlugFromFilename(filename);

    if (postSlug === slug) {
      try {
        const content = (await modules[path]()) as string;
        const frontmatter = parseFrontmatter(content);

        const title = frontmatter.title || extractTitle(content, filename);
        const excerpt = frontmatter.excerpt || extractExcerpt(content);
        const date = frontmatter.date || extractDateFromFilename(filename);
        const category = frontmatter.category || inferCategory(content, filename);
        const readingTime = calculateReadingTime(content);

        return {
          title,
          date,
          category,
          excerpt,
          slug,
          filename: path,
          content,
          readingTime,
        };
      } catch (error) {
        console.error(`Error loading blog post from ${path}:`, error);
        return null;
      }
    }
  }

  return null;
}

export type { BlogMetadata, BlogPost };
