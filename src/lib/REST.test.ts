import test from "ava";
import { REST } from "./REST";
import type { RESTGetAPIUserResult } from "discord-api-types";

const token = process.env.TEST_DISCORD_TOKEN;
if (!token?.length) {
  throw new Error("No token provided.");
}

const rest = new REST();
rest.token = token;

test("things work correctly", async t => {
  const ret = await rest.queue<RESTGetAPIUserResult>("/users/@me");
  t.is(ret.username, "neocord");
});
