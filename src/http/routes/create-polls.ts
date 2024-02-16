import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function createPolls(app: FastifyInstance){
  app.post("/polls", async (request, replay) => {
    const createPollBody = z.object({
      title: z.string(),
      options: z.array(z.string()),
    });

    const { title, options } = createPollBody.parse(request.body);

    const poll = await prisma.poll.create({
      data: {
        title: "title",
        options: {
            createMany: {
                data: options.map(option => {
                    return {title: option, pollId: poll.id}
                })
            }
        }
      },
    });
    return replay.status(201).send({ pollId: poll.id });
  });
}