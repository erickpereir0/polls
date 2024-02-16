import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { randomUUID } from "crypto";
import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { redis } from "../../lib/redis";
import { voting } from "../../utils/voting-pub-sub";

export async function voteOnPolls(app: FastifyInstance) {
  app.post("/polls/:pollId/votes", async (request, replay) => {
    const voteOnPollsBody = z.object({
      optionId: z.string().uuid(),
    });

    const voteOnPollsParams = z.object({
      pollId: z.string().uuid(),
    });

    const { pollId } = voteOnPollsParams.parse(request.params);
    const { optionId } = voteOnPollsBody.parse(request.body);

    let { sessionId } = request.cookies;

    if (sessionId) {
      const userPreviousVoteOnPoll = await prisma.vote.findUnique({
        where: {
          sessionId_pollId: {
            pollId,
            sessionId,
          },
        },
      });
      let votes = 0;

      if (userPreviousVoteOnPoll && userPreviousVoteOnPoll.pollOptionId === optionId) {
        await prisma.vote.delete({
          where: {
            id: userPreviousVoteOnPoll.id,
          },
        });

        await redis.zincrby(pollId, -1,userPreviousVoteOnPoll.pollOptionId);

        voting.publish(pollId, {
          pollOptionId: userPreviousVoteOnPoll.pollOptionId,
          votes: Number(votes),
        });

      } else if (userPreviousVoteOnPoll) {
        return replay.status(400).send({ message: "You have already voted" });
      }
    } 

    if (!sessionId) {
      sessionId = randomUUID();
      replay.setCookie("sessionId", sessionId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        signed: true,
        httpOnly: true,
      });
    }

    await prisma.vote.create({
      data: {
        sessionId,
        pollId,
        optionId,
      },
    });

   const votes =  await redis.zincrby(pollId, 1, optionId);

    voting.publish(pollId, {
      pollOptionId: optionId,
      votes: Number(votes),
    });
    
    return replay.status(201).send();
  });
}
