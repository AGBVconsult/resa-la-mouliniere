export default {
  providers: [
    {
      domain: process.env.CLERK_ISSUER_URL || "https://measured-ant-87.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
