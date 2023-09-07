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

const tagsToClean = [
  "http://smartregister.org/fhir/location-tag",
  "http://smartregister.org/fhir/organization-tag",
  "http://smartregister.org/fhir/care-team-tag",
];

async function main() {
  const jsonData = await readJSON("data/fhirData.json");
  const stuff = [];

  jsonData.entry
    .filter((entry) => entry.resource.resourceType === "Patient")
    .forEach((entry) => {
      const patient = entry.resource;

      const tagsToKeep = patient.meta.tag.filter((tag) =>
        tagsToClean.includes(tag.system)
      );

      if (tagsToKeep.length <= 3) {
        stuff.push(patient);
      }
    });

  console.log(stuff.length);

  const patientBundle = {
    resourceType: "Bundle",
    type: "transaction",
    entry: stuff.map((patient) => {
      const fullUrl = `Patient/${patient.id}`;
      return {
        fullUrl: fullUrl,
        resource: patient,
        request: {
          method: "PUT",
          url: fullUrl,
        },
      };
    }),
  };

  fs.writeFileSync(
    "output/broken-p.json",
    JSON.stringify(patientBundle, null, 2)
  );
}

main();
