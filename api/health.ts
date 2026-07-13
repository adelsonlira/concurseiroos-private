export default {
  fetch() {
    return Response.json({ status: "ok", time: new Date().toISOString() });
  }
};
