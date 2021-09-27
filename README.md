# Keiryo REST

> Simple REST library used within [keiryo](https://npmjs.com/KeiryoJS/keiryo)

- [Discord Server](https://discord.gg/5WD9KhF)
- [GitHub Repository](https://github.com/KeiryoJS/rest)

**node.js v14** or newer is required.

```shell script
yarn add @keiryo/rest
```

## Basic Usage

```ts
import { RestClient, cdn } from "@keiryo/rest";
import { request } from "undici";

const api = new RestClient();

// You must set the token if you want to use the RestHandler, cdn doesn't require authorization.
api.token = "your token here"

// All (iirc) REST routes return JSON, the CDN does not.
api.get("/users/@me").then(console.log);
...

// If you want to use the CDN you need to use petitio, or another http client of your choice.
const defaultAvatar = await request(cdn.defaultAvatar(5773 % 5));
const data = await defaultAvatar.body.arrayBuffer();
console.log(Buffer.from(data)) // => <Buffer 89 50 4e 47...>
```

---

<p align="center">Licensed under the <strong>Apache 2.0</strong> License</p>
