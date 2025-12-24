import { action } from "./_generated/server";
import { v } from "convex/values";

export const processQueue = action({
  args: { now: v.number() },
  handler: async () => {
    return null as any;
  },
});

export const sendJob = action({
  args: { jobId: v.string() },
  handler: async () => {
    return null as any;
  },
});
