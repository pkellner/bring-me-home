const { STSClient, GetCallerIdentityCommand } = require("@aws-sdk/client-sts");
(async () => {
  const caller = await new STSClient({}).send(new GetCallerIdentityCommand({}));
  console.log("Running as:", caller.Arn);
})();

/*
You must see

ruby
Copy
Edit
arn:aws:iam::041634299659:user/peterkellner
 */