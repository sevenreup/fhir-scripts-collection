const fs = require("fs");
const csv = require("csv-parser");
const axios = require("axios");

const accessToken = ``;

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

// Function to send a FHIR Bundle entry to the server with a delay
async function sendFHIRRequestWithDelay(basePath, entry, delay) {
  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        const path = `BASE_URL/${basePath}`;
        console.log(path);
        const response = await axios.post(path, entry, {
          headers: {
            "Content-Type": "application/xml",
            Authorization: `Bearer ${accessToken}`,
          },
        });

        console.log("Response:", response.data);
        resolve();
      } catch (error) {
        console.log(entry);
        console.error("Error:", error.message);
        resolve(); // Continue to the next request even if an error occurs
      }
    }, delay);
  });
}

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

const deleteRequestXml = (patientId) => `
<Parameters
	xmlns="http://hl7.org/fhir">
	<parameter>
		<name value="meta"/>
		<valueMeta>
			<tag>
				<system value="https://d-tree.org"/>
				<code value="guardian-visit"/>
			</tag>
		</valueMeta>
	</parameter>
</Parameters>
`;

const createTagReplacementMap = () => [
  {
    system: "https://d-tree.org/fhir/task-filter-tag",
    code: `guardian-visit`,
  },
];

const tagsToClean = ["https://d-tree.org"];

async function main() {
  try {
    const jsonData = await readJSON("data.json");

    let patches = [];
    let cleanedResources = [];

    jsonData.entry
      .filter(
        (entry) =>
          entry.resource.resourceType === "Task" &&
          entry.resource.description === "TB History and Regimen"
      )
      .forEach((entry) => {
        const resource = entry.resource;
        const resourceId = resource.id;
        let modResource = { ...resource };
        const metaTags = modResource.meta?.tag || [];

        let notDefinedTags = metaTags.filter(
          (tag) =>
            tagsToClean.includes(tag.system) && tag.code == "guardian-visit"
        );

        if (notDefinedTags.length > 0) {
          const definedTags = metaTags.filter(
            (tag) =>
              !tagsToClean.includes(tag.system) && tag.code != "guardian-visit"
          );

          let cleanedTags = createTagReplacementMap();

          const newTags = [...definedTags, ...cleanedTags];

          modResource.meta.tag = newTags;

          cleanedResources.push({ ...modResource });
          patches.push({ id: resourceId, resource: modResource.resourceType });
        }
      });

    const delayBetweenRequests = 0;

    for (let index = 0; index < patches.reverse().length; index++) {
      const entry = patches[index];
      console.log(entry);
      await sendFHIRRequestWithDelay(
        `${entry.resource}/${entry.id}/$meta-delete`,
        deleteRequestXml(entry.id),
        delayBetweenRequests
      );
    }

    // paginateArray(cleanedResources, itemsPerPage).forEach((page, index) => {
    //   createBundle(index, page);
    // });

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
    `output/bunle-${pos}.json`,
    JSON.stringify(resourceBundle, null, 2)
  );
};

main();
