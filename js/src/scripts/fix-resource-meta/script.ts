import fs from "fs/promises";
import { BundleEntry, Code } from "../../core/types/fhir";
import { createDeleteMetaTagsBody } from "../../core/tags/delete";
import { jsonTransactionBaseBundle } from "../../core/resources/bundle";
import { sendFHIRRequestWithDelay } from "../../core/network/api";

type PatientData = {
  id: string;
  organisation: Code;
  location: Code;
  careTeam: Code;
};

var patientsMap = new Map<string, PatientData>();

const getMeta = (resource: any, system: string) => {
  return resource.meta.tag.find((el: any) => el.system === system);
};

async function getPatients() {
  try {
    const data = await fs.readFile("in/fix-tags/patient.json", "utf8");
    const bundle = JSON.parse(data);
    for (const { resource } of bundle.entry) {
      const patData: PatientData = {
        id: resource.id,
        organisation: getMeta(
          resource,
          "http://smartregister.org/fhir/organization-tag"
        ),
        location: getMeta(
          resource,
          "http://smartregister.org/fhir/location-tag"
        ),
        careTeam: getMeta(
          resource,
          "http://smartregister.org/fhir/care-team-tag"
        ),
      };
      if (patData.organisation.code === "209") {
        patientsMap.set(resource.id, patData);
      }
    }
  } catch (error) {
    console.log(error);
  }
}

function getResourceMeta(bundle: any) {
  const resourcesTodelete: { reference: string; body: string }[] = [];
  const resourcesToupdate: BundleEntry[] = [];

  for (const { resource } of bundle.entry) {
    const patientId = resource.subject.reference.split("/").pop();
    const patient = patientsMap.get(patientId);
    if (patient === undefined || patient == null) {
      continue;
    }
    const organisation = getMeta(
      resource,
      "http://smartregister.org/fhir/organization-tag"
    );
    if (patient.organisation.code !== organisation.code) {
      const careplanId = `${resource.resourceType}/${resource.id}`;
      resourcesTodelete.push(createDeleteRequest(careplanId));
      resourcesToupdate.push(createUpdateRequest(careplanId, patient));
      for (const activity of resource.activity) {
        const taskId = `${activity.outcomeReference[0].reference}`;
        resourcesToupdate.push(createUpdateRequest(taskId, patient));
        resourcesTodelete.push(createDeleteRequest(taskId));
      }
    }
  }

  return {
    resourcesTodelete,
    resourcesToupdate,
  };
}

const tagsToRemove: Code[] = [
  {
    system: "http://smartregister.org/fhir/care-team-tag",
    code: "6283",
    display: "Practitioner CareTeam",
  },
  {
    system: "http://smartregister.org/fhir/location-tag",
    code: "505",
    display: "Practitioner Location",
  },
  {
    system: "http://smartregister.org/fhir/organization-tag",
    code: "256",
    display: "Practitioner Organization",
  },
];

const createDeleteRequest = (reference: string) => {
  return { reference, body: createDeleteMetaTagsBody(tagsToRemove) };
};

const createUpdateRequest = (
  reference: string,
  patient: PatientData
): BundleEntry => {
  const ops: any[] = [];
  [patient.careTeam, patient.location, patient.organisation].forEach(
    (value, i) => {
      ops.push({
        op: "add",
        path: `/meta/tag/-`,
        value: {
          system: tagsToRemove[i].system,
          code: value.code,
          display: value.display,
        },
      });
    }
  );
  return {
    resource: {
      resourceType: "Binary",
      contentType: "application/json-patch+json",
      data: btoa(JSON.stringify(ops)),
    },
    request: {
      method: "PATCH",
      url: reference,
    },
  };
};

export default async function script() {
  try {
    const allFailed = [];
    const failedRaw = await fs.readFile("out/fix-tags/failed.json", "utf8");
    if (failedRaw) {
      allFailed.push(...JSON.parse(failedRaw));
    }
    if (allFailed.length > 0) {
      await sendRequest(allFailed);
    } else {
      const data = await fs.readFile("in/fix-tags/data.json", "utf8");
      const bundle = JSON.parse(data);
      await getPatients();
      const allResources = getResourceMeta(bundle);
      const updateBundle = jsonTransactionBaseBundle(
        allResources.resourcesToupdate
      );
      await fs.writeFile(
        "out/fix-tags/patch.xml",
        JSON.stringify(allResources.resourcesTodelete, null, 2)
      );
      await fs.writeFile(
        "out/fix-tags/update.json",
        JSON.stringify(updateBundle, null, 2)
      );

      await sendRequest(allResources.resourcesTodelete);
    }
  } catch (error) {
    console.log(error);
  }
}

const delayBetweenRequests = 10;

const sendRequest = async (
  resourcesTodelete: { reference: string; body: string }[]
) => {
  const failedRequests: any[] = [];
  for (let index = 0; index < resourcesTodelete.reverse().length; index++) {
    const entry = resourcesTodelete[index];
    console.log(`${index}: ${entry.reference}`);
    const result = await sendFHIRRequestWithDelay(
      `${entry.reference}/$meta-delete`,
      entry.body,
      delayBetweenRequests,
      {
        "Content-Type": "application/xml",
      }
    );
    if (!result) {
      failedRequests.push(entry);
    }
    await fs.writeFile(
      "out/fix-tags/failed.json",
      JSON.stringify(failedRequests, null, 2)
    );
  }
};
