const fs = require("fs");
const csv = require("csv-parser");

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
<entry>
    <fullUrl value="Patient/${patientId}/$meta-delete" />
    <resource> 
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
</resource> 
<request>
      <method value="POST" />
      <url value="Patient/${patientId}/$meta-delete" />
    </request>
  </entry>
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

          console.log(JSON.stringify(notDefinedTags, null, 2));
          patches.push({ patientId, data: notDefinedTags });
        }
      });

    const patchBundle = xmlBase(
      patches.map((patch) => deleteRequestXml(patch.patientId)).join("\n")
    );

    const patientBundle = {
      resourceType: "Bundle",
      type: "transaction",
      entry: cleanedPatients.map((patient) => {
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

    fs.writeFileSync("output/patch.xml", patchBundle);
    fs.writeFileSync(
      "output/update.json",
      JSON.stringify(patientBundle, null, 2)
    );
    console.log(
      `Patients written: ${cleanedPatients.length}, raw csv: ${csvData.length}, : ${jsonData.entry.length}`
    );
    console.log(`FHIR Bundle written`);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
