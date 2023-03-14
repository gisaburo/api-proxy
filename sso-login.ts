import { fromSSO } from "https://deno.land/x/aws_sdk@v3.32.0-1/credential-provider-sso/mod.ts";

const getCredentials = fromSSO({ profile: "gisaburo" })

getCredentials().then(async credentials => {
    await Deno.writeTextFile("./.env", `AWS_ACCESS_KEY_ID=${credentials.accessKeyId}\n`);
    await Deno.writeTextFile("./.env", `AWS_SECRET_ACCESS_KEY=${credentials.secretAccessKey}\n`, { append: true});
    await Deno.writeTextFile("./.env", `AWS_SESSION_TOKEN=${credentials.sessionToken}`, { append: true});
    await Deno.chmod("./.env",0o766)
}).catch(e => {
    console.error('Error parsing credentials', e);
});