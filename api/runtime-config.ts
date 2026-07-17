import { buildPublicRuntimeConfiguration, resolveRuntimeEnvironment } from "../src/server/runtimeEnvironment.js";

export default {
  fetch() {
    return Response.json(buildPublicRuntimeConfiguration(resolveRuntimeEnvironment()), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  },
};
