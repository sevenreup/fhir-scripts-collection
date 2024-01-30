const fs = require("fs");
const axios = require("axios");

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
        const activityIndexToDelete = carePlan.activity.findIndex(
          (activity) =>
            activity.detail &&
            activity.detail.description === "B2C and VL Screening"
        );

        // Delete the activity if found
        if (activityIndexToDelete !== -1) {
          carePlan.activity.splice(activityIndexToDelete, 1);

          // Update the CarePlan on the server
          firstVisits.push(carePlan);

          console.log(`Activity deleted from CarePlan ${carePlan.id}:`);
        } else {
          console.log(`Activity not found in CarePlan ${carePlan.id}.`);
        }
      }
    }

    paginateArray(firstVisits, 100).forEach(async (page, index) => {
      const bundle = {
        resourceType: "Bundle",
        type: "transaction",
        entry: page.map((resource) => ({
          fullUrl: `CarePlan/${resource.id}`,
          resource,
          request: {
            method: "PUT",
            url: `CarePlan/${resource.id}`,
          },
        })),
      };

      fs.writeFileSync(
        `out/out_${index}.json`,
        JSON.stringify(bundle, null, 2)
      );
      await sendFHIRRequestWithDelay(``, JSON.stringify(bundle, null, 2), 0);
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
