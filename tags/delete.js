const fs = require("fs");
const csv = require("csv-parser");
const axios = require("axios");

const accessToken = ``;

// Function to send a FHIR Bundle entry to the server with a delay
async function sendFHIRRequestWithDelay(basePath, entry, delay) {
  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        const path = `URL_HERE/${basePath}`;
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

function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const data = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        data.push(row);
      })
      .on("end", () => {
        resolve(data);
      })
      .on("error", (error) => {
        reject(error);
      });
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

const xmlBase = (entries) => `
<?xml version="1.0" encoding="UTF-8"?>
<Bundle xmlns="http://hl7.org/fhir">
  <id value="bundle-transaction" />
  <type value="transaction" />
  ${entries}
</Bundle> 
`;

const deleteRequestXml = (patientId) => `
<Parameters
	xmlns="http://hl7.org/fhir">
	<parameter>
		<name value="meta"/>
		<valueMeta>
			<tag>
				<system value="http://smartregister.org/fhir/location-tag"/>
				<code value="Not defined"/>
				<display value="Practitioner Location"/>
			</tag>
			<tag>
				<system value="http://smartregister.org/fhir/care-team-tag"/>
				<code value="Not defined"/>
				<display value="Practitioner CareTeam"/>
			</tag>
			<tag>
				<system value="http://smartregister.org/fhir/organization-tag"/>
				<code value="Not defined"/>
				<display value="Practitioner Organization"/>
			</tag>
		</valueMeta>
	</parameter>
</Parameters>
`;

const createTagReplacementMap = (location, organization, careTeam) => [
  {
    system: "http://smartregister.org/fhir/location-tag",
    code: `${location}`,
    display: "Practitioner Location",
  },
  {
    system: "http://smartregister.org/fhir/organization-tag",
    code: `${organization}`,
    display: "Practitioner Organization",
  },
  {
    system: "http://smartregister.org/fhir/care-team-tag",
    code: `${careTeam}`,
    display: "Practitioner CareTeam",
  },
];

const tagsToClean = [
  "http://smartregister.org/fhir/location-tag",
  "http://smartregister.org/fhir/organization-tag",
  "http://smartregister.org/fhir/care-team-tag",
];

async function main() {
  try {
    const csvData = await readCSV("data/data.csv");
    const jsonData = await readJSON("data/fhirData.json");

    let patches = [];
    let cleanedPatients = [];

    jsonData.entry
      .filter((entry) => entry.resource.resourceType === "Patient")
      .forEach((entry) => {
        const patientResource = entry.resource;
        const patientId = patientResource.id;
        let modPatientResource = { ...patientResource };
        const matchingCSVRow = csvData.find((row) => row.uuid === patientId);
        if (matchingCSVRow) {
          const metaTags = modPatientResource.meta?.tag || [];

          let notDefinedTags = metaTags.filter(
            (tag) =>
              tagsToClean.includes(tag.system) && tag.code == "Not defined"
          );

          const definedTags = metaTags.filter(
            (tag) => tag.code !== "Not defined"
          );

          let cleanedTags = [];

          if (matchingCSVRow.addressState.toLowerCase().includes("thavite")) {
            cleanedTags = createTagReplacementMap(505, 256, 6283);
          } else {
            cleanedTags = createTagReplacementMap(463, 209, 525);
          }

          const newTags = [...definedTags, ...cleanedTags];

          modPatientResource.meta.tag = newTags;

          cleanedPatients.push({ ...modPatientResource });

          notDefinedTags = notDefinedTags.map((tag) => {
            return {
              name: "meta",
              valueMeta: {
                tag: [tag],
              },
            };
          });
          patches.push({ patientId, data: notDefinedTags });
        }
      });

    const delayBetweenRequests = 2000;

    for (let index = 0; index < patches.reverse().length; index++) {
      const entry = patches[index];

      await sendFHIRRequestWithDelay(
        `Patient/${entry.patientId}/$meta-delete`,
        deleteRequestXml(entry.patientId),
        delayBetweenRequests
      );
    }
    console.log(`FHIR Bundle written`);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
