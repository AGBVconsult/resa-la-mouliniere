export default {
  providers: [
    {
      domain: process.env.CLERK_ISSUER_URL || "https://clerk.lamouliniere.be",
      applicationID: "convex",
    },
  ],
};
