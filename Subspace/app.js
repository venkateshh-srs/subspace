const axios = require("axios");
const _ = require("lodash");
const express = require("express");
const app = express();

const options = {
  method: "GET",
  headers: {
    "x-hasura-admin-secret":
      "32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6",
  },
};

// Function to fetch blogs data
async function fetchBlogsData() {
  console.log("Api cakll");
  const response = await axios.get(
    "https://intent-kit-16.hasura.app/api/rest/blogs",
    options
  );
  return response.data.blogs;
}

// Define a memoized function to fetch blogs data to reduce API calls
const memoizedFetchBlogsData = _.memoize(
  fetchBlogsData,
  () => "blogs-cache-key",
  60000
);

// Middleware to fetch blogs data and attach it to the request object
app.use(async (req, res, next) => {
  try {
    const blogs = await memoizedFetchBlogsData(); // Use the memoized function
    req.blogs = blogs;
    next();
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching blog data" });
  }
});

// Define a memoized function for analytics
const cachedPerformAnalytics = _.memoize(
  performAnalytics,
  () => "analytics-cache-key",
  60000
);

// Define a memoized function for blog search
const cachedPerformBlogSearch = _.memoize(
  performBlogSearch,
  (query) => `search-cache-key-${query}`,
  60000
);

// Function to perform analytics
function performAnalytics(blogs) {
  const totalBlogs = _.size(blogs);
  const blogWithLongestTitle = _.maxBy(blogs, (blog) => blog.title.length);
  const blogsWithPrivacyTitle = _.filter(blogs, (blog) =>
    _.includes(blog.title.toLowerCase(), "privacy")
  );
  const numberOfBlogsWithPrivacyTitle = _.size(blogsWithPrivacyTitle);
  const uniqueBlogTitles = _.uniqBy(blogs, "title").map((blog) => blog.title);

  const analyticsResults = {
    totalBlogs,
    blogWithLongestTitle,
    uniqueBlogTitles,
    numberOfBlogsWithPrivacyTitle,
  };

  return analyticsResults;
}

// Function to perform blog search
function performBlogSearch(query, blogs) {
  const queryLower = query.toLowerCase();
  const searchResults = blogs.filter((blog) => {
    const title = blog.title.toLowerCase();
    return title.includes(queryLower);
  });
  return searchResults;
}

// Route for /api/blog-stats
app.get("/api/blog-analytics", (req, res) => {
  const { blogs } = req; // Retrieve blogs from the request object
  const analyticsResults = cachedPerformAnalytics(blogs);
  res.json({ analyticsResults });
});

// Route for /api/blog-search
app.get("/api/blog-search", (req, res) => {
  const { blogs } = req; // Retrieve blogs from the request object
  const query = req.query.query.toLowerCase();
  const searchResults = cachedPerformBlogSearch(query, blogs);
  res.json({ searchResults });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
