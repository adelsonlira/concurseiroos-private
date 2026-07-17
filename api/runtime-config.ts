import { buildPublicRuntimeConfiguration, resolveRuntimeEnvironment } from "../src/server/runtimeEnvironment";

export default {
  fetch() {
    return Response.json(buildPublicRuntimeConfiguration(resolveRuntimeEnvironment()), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  },
};
