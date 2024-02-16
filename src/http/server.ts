import fastify from "fastify";
import cookie  from '@fastify/cookie';
import websocket from '@fastify/websocket';
import { createPolls } from "./routes/create-polls";
import { getPolls } from "./routes/get-polls";
import { voteOnPolls } from "./routes/vote-on-polls";


const app = fastify();

app.register(websocket)
app.register(cookie, {
  secret: "my-secrety",
  hook: "onRequest",
  parseOptions: {},});
app.register(createPolls);
app.register(getPolls);
app.register(voteOnPolls);


app.listen({ port: 3000 }).then(() => {
  console.log("Server listening on http://localhost:3000");
});
