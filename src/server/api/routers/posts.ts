import { clerkClient } from "@clerk/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { createTRPCRouter, privateProcedure, publicProcedure } from "~/server/api/trpc";
import { filterUserForClient } from "~/server/helpers/filterUserForClient";
import type { Post } from "@prisma/client";

const addUserDataToPosts = async (posts: Post[]) => {
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
      author: {
        ...author,
        username: author.username,
      },
}
    })
}



// need to filter down posts to only the ones that the user has access to

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
      // for each post, find the user that matches the authorId
    return addUserDataToPosts(posts);
    }),

  getPostsByUserId: publicProcedure.input(z.object({
    userId: z.string(),
  })).query(async ({ ctx, input}) => ctx.prisma.post.findMany({
    where: {
      authorId: input.userId,
    },
    take: 20,
    orderBy: [{createdAt: "desc"}],
  }).then(addUserDataToPosts)
  ),

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
  }),
});
