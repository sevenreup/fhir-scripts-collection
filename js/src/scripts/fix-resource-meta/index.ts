import { createCommand } from "commander";
import script from "./script";

export const fixResourceMetaTagCommand = createCommand(
  "fix-meta-tags"
).action(() => {
  script();
});
