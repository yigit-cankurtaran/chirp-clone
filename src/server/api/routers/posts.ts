import { clerkClient } from "@clerk/nextjs";
import type { User } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { createTRPCRouter, privateProcedure, publicProcedure } from "~/server/api/trpc";

// need to filter down posts to only the ones that the user has access to
// this is where i'm leaving off for today

const filterUserForClient = (user: User) => {
  return {
    id: user.id,
    username: user.username,
    profileImageUrl: user.profileImageUrl,
  }
}

// Create a ratelimiter that allows 3 requests every 1 minute
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, "1 m"),
  analytics: true,
})



export const postsRouter = createTRPCRouter({
    // we want everyone to access all the posts
  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.prisma.post.findMany({
      take: 20,
      orderBy: [
        {createdAt: "desc"}
      ]
    });
    // example doesn't exist because we deleted it
    const users = (await clerkClient.users.getUserList({
      userId: posts.map((post) => post.authorId),
      limit: 20,
    })).map(filterUserForClient);

    console.log(users);
    return posts.map((post) => {
      const author = users.find((user) => user.id === post.authorId);
      if (!author || !author.username) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Author not found" });

      return {  
      post,
      author,
      // for each post, find the user that matches the authorId
      };
    });
  }),

  create: privateProcedure.input(z.object({
    content: z.string().emoji("Only emojis are allowed").min(1).max(280),
  })).mutation(async ({ctx, input}) => {
    const authorId = ctx.userId;
    const {success} = await ratelimit.limit(authorId);
    if (!success) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "You are doing that too much" });
    const post = await ctx.prisma.post.create({
      data: {
        authorId,
        content: input.content,
      },
    });
    return post;
    // Leaving off here for today
  })
});
