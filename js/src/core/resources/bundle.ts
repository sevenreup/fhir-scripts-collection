import { BundleEntry } from "../types/fhir";

export const xmlTransactionBaseBundle = (entries: string[]) => `
<?xml version="1.0" encoding="UTF-8"?>
<Bundle xmlns="http://hl7.org/fhir">
  <id value="bundle-transaction" />
  <type value="transaction" />
  ${entries.join("\n")}
</Bundle> 
`;

export const jsonTransactionBaseBundle = (entries: BundleEntry[]) => {
  return {
    resourceType: "Bundle",
    type: "transaction",
    entry: entries,
  };
};
