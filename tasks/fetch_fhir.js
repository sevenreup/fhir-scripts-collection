const axios = require("axios");
const fs = require("fs");

const fhirServerBaseUrl = "URL";
const outputFilePath = "filtered_tasks.json";
const requiredDescriptions = [
  "Demograhic Updates",
  "Guardian Registration",
  "Guardian Updates",
  "ART Regimen",
  "TB History and Regimen",
];
const excludedTag = "https://d-tree.org/fhir/task-filter-tag";

const accessToken =
  "";

async function fetchAndFilterTasks(url) {
  try {
    // Fetch tasks for the provided URL
    console.log("Fetching ${url}...");
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const bundle = response.data;

    if (!bundle || !bundle.entry) {
      console.log("No more tasks to fetch.");
      return { tasks: [], nextLink: null };
    }

    const tasks = bundle.entry
      .filter(
        (entry) => entry.resource && entry.resource.resourceType === "Task"
      )
      .map((entry) => entry.resource);

    // Filter tasks based on required descriptions and excluded tags
    const filteredTasks = tasks.filter(
      (task) =>
        requiredDescriptions.includes(task.description) &&
        !task.meta.tag.some((tag) => tag.system === excludedTag)
    );
    

    // Extract the 'next' link for pagination
    const nextLink =
      bundle.link && bundle.link.find((link) => link.relation === "next");

      console.log(`Filtered tasks:, ${filteredTasks.length}`);

    return { tasks: filteredTasks, nextLink: nextLink ? nextLink.url : null };
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return { tasks: [], nextLink: null };
  }
}

async function getAllTasksAndSaveToFile() {
  let allFilteredTasks = [];
  let nextLink = `${fhirServerBaseUrl}/Task?_count=1000`; // Start with the initial URL

  while (nextLink) {
    const { tasks, nextLink: nextPageLink } = await fetchAndFilterTasks(
      nextLink
    );

    if (tasks.length === 0) {
      break;
    }

    allFilteredTasks = allFilteredTasks.concat(tasks);
    nextLink = nextPageLink;
  }

  // Save filtered tasks to a JSON file
  fs.writeFileSync(outputFilePath, JSON.stringify(allFilteredTasks, null, 2));

  console.log(`Filtered tasks saved to ${outputFilePath}.`);
}

getAllTasksAndSaveToFile();
