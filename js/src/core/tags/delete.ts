import { Code } from "../types/fhir";

export const createLocationTags = (
  location: string,
  organization: string,
  careTeam: string
) => [
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

export const createDeleteMetaTagsBody = (codes: Code[]) => `
<Parameters
xmlns="http://hl7.org/fhir">
<parameter>
  <name value="meta"/>
  <valueMeta>
  ${
    codes
      .map(
        (code) => `
    <tag>
      <system value="${code.system}"/>
      <code value="${code.code}"/>
      <display value="${code.display}"/>
    </tag>
    `
      )
      .join("\n") // Add the code tags here
  }
  </valueMeta>
</parameter>
</Parameters>
`;
