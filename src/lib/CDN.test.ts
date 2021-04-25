import test from "ava";
import { CDN } from "./CDN";

const cdn = new CDN();

test("CDN#defaultAvatar returns correct url", t => {
  const url = cdn.defaultAvatar("5773");
  t.is(url, "https://cdn.discordapp.com/embed/avatars/3.png");
});
