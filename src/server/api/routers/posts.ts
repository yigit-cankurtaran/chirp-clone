import { clerkClient } from "@clerk/nextjs";
import type { User } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

// need to filter down posts to only the ones that the user has access to
// this is where i'm leaving off for today

const filterUserForClient = (user: User) => {
  return {
    id: user.id,
    username: user.username,
    profileImageUrl: user.profileImageUrl,
  }
}



export const postsRouter = createTRPCRouter({
    // we want everyone to access all the posts
  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.prisma.post.findMany({
      take: 20,
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
});
