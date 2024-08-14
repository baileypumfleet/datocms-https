import { buildClient } from "@datocms/cma-client-node";
import readline from "readline";

const API_TOKEN = process.env.DATOCMS_API_TOKEN;
const MODEL_ID = process.env.DATOCMS_BLOG_MODEL_ID;

if (!API_TOKEN || !MODEL_ID) {
  console.error(
    "Please set DATOCMS_API_TOKEN and DATOCMS_BLOG_MODEL_ID environment variables."
  );
  process.exit(1);
}

const client = buildClient({ apiToken: API_TOKEN });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askForConfirmation(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === "y");
    });
  });
}

function findHttpInNode(node, path = "") {
  if (typeof node === "string" && node.includes("http://")) {
    return [{ path, value: node }];
  } else if (Array.isArray(node)) {
    return node.flatMap((item, index) =>
      findHttpInNode(item, `${path}[${index}]`)
    );
  } else if (typeof node === "object" && node !== null) {
    return Object.entries(node).flatMap(([key, value]) =>
      findHttpInNode(value, path ? `${path}.${key}` : key)
    );
  }
  return [];
}

function replaceHttpInNode(node) {
  if (typeof node === "string") {
    return node.replace(/http:\/\//g, "https://");
  } else if (Array.isArray(node)) {
    return node.map(replaceHttpInNode);
  } else if (typeof node === "object" && node !== null) {
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [
        key,
        replaceHttpInNode(value),
      ])
    );
  }
  return node;
}

async function fetchAllPosts() {
  let allPosts = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const posts = await client.items.list({
      filter: {
        type: MODEL_ID,
      },
      page: {
        offset: (page - 1) * perPage,
        limit: perPage,
      },
    });

    allPosts = allPosts.concat(posts);

    if (posts.length < perPage) {
      break;
    }

    page++;
  }

  return allPosts;
}

async function updatePosts() {
  try {
    const posts = await fetchAllPosts();

    console.log(`Found ${posts.length} posts in total.`);

    for (const post of posts) {
      console.log(`\nExamining post ${post.id}`);

      const httpOccurrences = findHttpInNode(post);

      if (httpOccurrences.length > 0) {
        console.log(
          `Found ${httpOccurrences.length} 'http://' occurrences in post ${post.id}`
        );
        httpOccurrences.forEach(({ path, value }) => {
          console.log(`  Path: ${path}`);
          console.log(`  Value: ${value}`);
        });

        const updatedPost = replaceHttpInNode(post);

        const shouldUpdate = await askForConfirmation(
          "\nDo you want to update this post? (y/n): "
        );

        if (shouldUpdate) {
          await client.items.update(post.id, updatedPost);
          console.log(`Updated post: ${post.id}`);
        } else {
          console.log(`Skipped post: ${post.id}`);
        }
      } else {
        console.log(`No 'http://' found in post ${post.id}`);
      }
    }

    console.log("\nAll posts have been processed.");
  } catch (error) {
    console.error("Error updating posts:", error);
  } finally {
    rl.close();
  }
}

updatePosts();
