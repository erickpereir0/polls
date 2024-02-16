import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { redis } from "../../lib/redis";

export async function getPolls(app: FastifyInstance) {
  app.post("/polls/:pollId", async (request, replay) => {
    const getPollParams = z.object({
      pollId: z.string(),
    });

    const { pollId } = getPollParams.parse(request.params);

    const poll = await prisma.poll.findUnique({
      where: {
        id: pollId,
      },
      include: {
        options: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!poll) {
      return replay.status(404).send({ message: "Poll not found" });
    }

    const result = await redis.zrange(pollId, 0, -1, "WITHSCORES");

    const votes = result.reduce((obj, line, index) => {
      if (index % 2 === 0) {
        const score = result[index + 1];

        Object.assign(obj, { [line]: Number(score) });
      }
      return obj;
    }, {} as Record<string, number>);

    return replay.send({
      poll: {
        id: poll.id,
        title: poll.title,
        options: poll.options.map((option: { id: string | number; title: any; }) => ({
          id: option.id,
          title: option.title,
          votes: votes[option.id] || 0,
        })),
      },
    });
  });
}
