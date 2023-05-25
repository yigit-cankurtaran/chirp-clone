import { createTRPCRouter } from "~/server/api/trpc";
import { postsRouter } from "./routers/posts";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  posts: postsRouter,
  // we can add the names or add as many routers as we want
});

// export type definition of API
export type AppRouter = typeof appRouter;
