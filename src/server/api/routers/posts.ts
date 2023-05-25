import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const postsRouter = createTRPCRouter({
    // we want everyone to access all the posts
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.post.findMany();
    // example doesn't exist because we deleted it
  }),
});
