const fs = require("fs");

function readJSON(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        reject(err);
      } else {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      }
    });
  });
}

const createTagReplacementMap = () => [
  {
    system: "https://d-tree.org/fhir/task-filter-tag",
    code: `guardian-visit`,
  },
];

async function main() {
  try {
    const jsonData = await readJSON("filtered_tasks.json");

    let cleanedResources = [];

    jsonData
      .filter((entry) => entry.resourceType === "Task")
      .forEach((resource) => {
        let modResource = { ...resource };
        const metaTags = modResource.meta?.tag || [];

        let cleanedTags = createTagReplacementMap();

        const newTags = [...metaTags, ...cleanedTags];
        modResource.meta.tag = newTags;
        cleanedResources.push({ ...modResource });
      });

    paginateArray(cleanedResources, itemsPerPage).forEach((page, index) => {
      createBundle(index, page);
    });

    console.log(`FHIR Bundle written`);
  } catch (error) {
    console.error("Error:", error);
  }
}

const createBundle = (pos, cleanedResources) => {
  const resourceBundle = {
    resourceType: "Bundle",
    type: "transaction",
    entry: cleanedResources.map((resource) => {
      const fullUrl = `${resource.resourceType}/${resource.id}`;
      return {
        fullUrl: fullUrl,
        resource: resource,
        request: {
          method: "PUT",
          url: fullUrl,
        },
      };
    }),
  };

  fs.writeFileSync(
    `output/tasks/bunle-${pos}.json`,
    JSON.stringify(resourceBundle, null, 2)
  );
};

const itemsPerPage = 200;

function paginateArray(array, itemsPerPage) {
  const pageCount = Math.ceil(array.length / itemsPerPage);
  const paginatedArray = [];

  for (let i = 0; i < pageCount; i++) {
    const startIndex = i * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const page = array.slice(startIndex, endIndex);
    paginatedArray.push(page);
  }

  return paginatedArray;
}

main();
