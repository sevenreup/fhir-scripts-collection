const fs = require("fs");
const axios = require("axios");
const  taskTemplate = require("./taskTemp");
const { v4: uuidv4 } = require("uuid");

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

fs.readFile("in/data.json", "utf8", (err, data) => {
  if (err) {
    console.log(err);
  } else {
    const obj = JSON.parse(data);

    let firstVisits = [];

    for (const entry of obj.entry) {
      const carePlan = entry.resource;
      if (carePlan.title === "Client Already On ART Visit 1") {
        const task = {
          ...taskTemplate,
          executionPeriod: {...carePlan.period, start: carePlan.activity[0].detail.scheduledPeriod.start,},
          for: carePlan.subject,
          id: uuidv4(),
        };

        task.meta = {
          tag: [
            ...carePlan.meta.tag,
            {
              system: "https://d-tree.org",
              code: "clinic-visit-task-order-2",
            },
          ],
        };

        task.identifier = [
          {
            use: "official",
            value: task.id,
          },
        ];

        carePlan.activity.push({
          outcomeReference: [
            {
              reference: "Task/" + task.id,
              display: task.description,
            },
          ],
          detail: {
            kind: "Task",
            code: {
              coding: [
                {
                  system: "https://d-tree.org",
                  code: "art-client-viral-load-collection",
                },
              ],
            },
            status: "in-progress",
            scheduledPeriod: {
              start: carePlan.period.start,
              end: carePlan.period.end,
            },
            performer: [
              {
                reference: carePlan.author.reference,
                display: carePlan.author.display,
              },
            ],
            description: task.description,
          },
        });

        // Update the CarePlan on the server
        firstVisits.push(task);
        firstVisits.push(carePlan);

        console.log(`Activity deleted from CarePlan ${carePlan.id}:`);
      } else {
        console.log(`Activity not found in CarePlan ${carePlan.id}.`);
      }
    }

    paginateArray(firstVisits, 100).forEach(async (page, index) => {
      const bundle = {
        resourceType: "Bundle",
        type: "transaction",
        entry: page.map((resource) => ({
          fullUrl: `${resource.resourceType}/${resource.id}`,
          resource,
          request: {
            method: "PUT",
            url: `${resource.resourceType}/${resource.id}`,
          },
        })),
      };

      fs.writeFileSync(
        `out/out_${index}.json`,
        JSON.stringify(bundle, null, 2)
      );
      // await sendFHIRRequestWithDelay(``, JSON.stringify(bundle, null, 2), 0);
    });

    console.log({ first: firstVisits.length, all: obj.entry.length });
  }
});

async function sendFHIRRequestWithDelay(basePath, entry, delay) {
  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        const path = `BASE_URL`;
        console.log(path);
        const response = await axios.post(path, entry, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer `,
          },
        });

        console.log("Response:", response.data);
        resolve();
      } catch (error) {
        console.error("Error:", error.message);
        resolve(); // Continue to the next request even if an error occurs
      }
    }, delay);
  });
}
