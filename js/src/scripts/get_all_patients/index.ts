import { createCommand } from "commander";
import script from "./script";

export const getAllPatientsFromBundleCommand = createCommand(
  "get-patient-ref"
).action(() => {
  script();
});
